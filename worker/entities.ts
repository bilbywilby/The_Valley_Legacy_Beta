import { IndexedEntity, Env } from "./core-utils";
import type { FeedState, HistoryItem, CoordinatorState, RateLimitState, VelocityDataPoint, FeedStats, DurabilityIndexState, WALEvent, IngestEvent, VectorizedEvent, SearchResult, SemanticQueryParams, SemanticQueryResponse } from "@shared/types";
import { MOCK_FEEDS, MOCK_FEED_HISTORY, MOCK_VECTOR_SHARDS } from "@shared/mock-data";
import { v4 as uuidv4 } from 'uuid';
// Define Doc type locally to assist TypeScript inference where needed.
type Doc<T> = { v: number; data: T };
async function generateEmbedding(input: string): Promise<number[]> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer));
  const vector: number[] = [];
  for (let i = 0; i < 128; i++) {
    // Use pairs of hash bytes to generate more varied floats
    const byte1 = hash[i % hash.length];
    const byte2 = hash[(i + 1) % hash.length];
    vector.push(((byte1 * 256 + byte2) / 65535) * 2 - 1); // Range [-1, 1]
  }
  return vector;
}
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
export class RateLimitEntity extends IndexedEntity<RateLimitState> {
  static readonly entityName = "ratelimit";
  static readonly indexName = "ratelimits";
  static readonly initialState: RateLimitState = { id: '', count: 0, resetTime: 0 };
  async hit(): Promise<void> {
    await this.mutate(s => {
      const now = Date.now();
      if (now > s.resetTime) {
        return { ...s, count: 1, resetTime: now + 60000 }; // 60s window
      }
      return { ...s, count: s.count + 1 };
    });
  }
  async isLimited(durationMs: number, limit: number): Promise<boolean> {
    const s = await this.getState();
    if (Date.now() > s.resetTime) {
      return false;
    }
    return s.count >= limit;
  }
}
export class VectorShardEntity extends IndexedEntity<{id: string, events: VectorizedEvent[]}> {
  static readonly entityName = 'vectorshard';
  static readonly indexName = 'vectorshards';
  static readonly initialState = {id:'', events:[]};
  static seedData = MOCK_VECTOR_SHARDS;
  static async ensureSeed(env: Env): Promise<void> {
    await super.ensureSeed(env);
  }
  static async ingest(env: Env, id: string, event: VectorizedEvent): Promise<void> {
    const shard = new this(env, id);
    if (!(await shard.exists())) {
      await shard.save({ id, events: [] });
    }
    await shard.mutate(s => ({
      ...s,
      events: [event, ...s.events].slice(0,500).sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }));
  }
  async search(embedding: number[], limit: number=10, threshold: number=0.7): Promise<SearchResult[]> {
    const s = await this.getState();
    const results: SearchResult[] = [];
    for(const event of s.events) {
      const score = cosineSimilarity(embedding, event.embedding);
      if(score >= threshold) results.push({event, score});
    }
    return results.sort((a,b)=>b.score - a.score).slice(0,limit);
  }
}
export class VectorIndexCoordinatorEntity extends IndexedEntity<{id:string}> {
  static readonly entityName = 'vectorcoord';
  static readonly indexName = 'vectorcoords';
  static readonly singletonId = 'global';
  static readonly initialState = {id:'global'};
  static async ensureSeed(env: Env): Promise<void> {
    const coord = new this(env, this.singletonId);
    if (!(await coord.exists())) {
      await coord.save(this.initialState);
    }
  }
  async embedEvent(payloadOrText: string | Record<string,any>): Promise<number[]> {
    return generateEmbedding(typeof payloadOrText==='string' ? payloadOrText : JSON.stringify(payloadOrText));
  }
  async querySemantic(env: Env, params: SemanticQueryParams): Promise<SemanticQueryResponse> {
    const queryEmbedding = await this.embedEvent(params.text);
    const { items: shards } = await VectorShardEntity.list(env, null, 100);
    const allResults: SearchResult[] = [];
    const searchPromises = shards.map(async (shardState) => {
      const shard = new VectorShardEntity(env, shardState.id);
      return shard.search(queryEmbedding, params.limit || 10, params.threshold || 0.7);
    });
    const resultsByShard = await Promise.all(searchPromises);
    for (const results of resultsByShard) {
      allResults.push(...results);
    }
    const sorted = allResults.sort((a,b)=>b.score - a.score).slice(0, params.limit||10);
    return {results: sorted, total: allResults.length};
  }
}
export class DurabilityIndexEntity extends IndexedEntity<DurabilityIndexState> {
  static readonly entityName = 'durindex';
  static readonly indexName = 'durindexes';
  static readonly singletonId = 'global';
  static readonly initialState: DurabilityIndexState = { id: 'global', lastProcessed: '', seenEvents: [] };
  static async appendToR2WAL(env: Env, key: string, content: string): Promise<void> {
    const di = new this(env, this.singletonId);
    await di.stub.casPut('r2-wal/' + key, 0, content);
  }
  static async listR2WAL(env: Env, prefix?: string, after?: string): Promise<{ keys: string[]; next: string | null; }> {
    const di = new this(env, this.singletonId);
    return di.stub.listPrefix('r2-wal/' + (prefix || ''), after);
  }
  static async getR2WAL(env: Env, key: string): Promise<string | null> {
    const di = new this(env, this.singletonId);
    const doc = await di.stub.getDoc('r2-wal/' + key) as Doc<string> | null;
    return doc?.data ?? null;
  }
  static async ensureSeed(env: Env): Promise<void> {
    const di = new this(env, this.singletonId);
    if (!(await di.exists())) {
      await di.save(this.initialState);
      const testEvents: IngestEvent[] = [
        { idempotencyKey: 'test-traffic-1', feedId: 'f1', payload: {speed: 25, location: 'major accident on Route 22'}, clientSeq: Date.now() },
        { idempotencyKey: 'test-weather-1', feedId: 'f2', payload: {temp: 85, condition: 'Severe thunderstorm warning'}, clientSeq: Date.now() + 1 },
        { idempotencyKey: 'test-safety-1', feedId: 'f3', payload: {event: 'Fire reported', unit: 'Engine 5'}, clientSeq: Date.now() + 2 },
        { idempotencyKey: 'test-traffic-2', feedId: 'f5', payload: {speed: 65, location: 'traffic moving smoothly on I-78'}, clientSeq: Date.now() + 3 },
      ];
      for (const event of testEvents) {
        const day = new Date().toISOString().slice(0,10);
        const ts = event.clientSeq || Date.now();
        const id = event.idempotencyKey || uuidv4();
        const walKey = `wal/${day}/${ts}.${id}.json`;
        const embedding = await generateEmbedding(JSON.stringify(event.payload));
        const walEvent: VectorizedEvent = {
          _id: id,
          _seq: ts,
          feedId: event.feedId,
          payload: event.payload,
          timestamp: new Date().toISOString(),
          embedding,
        };
        await this.appendToR2WAL(env, walKey, JSON.stringify(walEvent));
      }
    }
  }
  async getR2WALEvent(key: string): Promise<WALEvent | null> {
    const content: string | null = await DurabilityIndexEntity.getR2WAL(this.env, key);
    try {
      return content ? JSON.parse(content) as WALEvent : null;
    } catch (e) {
      console.error(`Failed to parse WAL event for key ${key}:`, e);
      return null;
    }
  }
  async processEvent(key: string): Promise<boolean> {
    const event = await this.getR2WALEvent(key) as VectorizedEvent;
    if (!event || !event._id) return false;
    const s = await this.getState();
    if (s.seenEvents.includes(event._id)) return false;
    if (!event.embedding) {
      event.embedding = await generateEmbedding(JSON.stringify(event.payload));
    }
    await FeedEntity.ingest(this.env, event.feedId, event.payload);
    const feed = await new FeedEntity(this.env, event.feedId).getState();
    if (feed) {
      const shardId = `${feed.region}-${feed.type.toLowerCase()}-${event.timestamp.slice(0,10)}`;
      await VectorShardEntity.ingest(this.env, shardId, event);
    }
    await this.mutate(cur => ({
      ...cur,
      seenEvents: [...cur.seenEvents, event._id].slice(-50000)
    }));
    return true;
  }
  async applyWAL(): Promise<number> {
    const s = await this.getState();
    const { keys } = await DurabilityIndexEntity.listR2WAL(this.env, 'wal/', s.lastProcessed || undefined);
    let processed = 0;
    for (const key of keys) {
      const relativeKey = key.startsWith('r2-wal/') ? key.substring(7) : key;
      if (await this.processEvent(relativeKey)) {
        processed++;
      }
    }
    if (keys.length > 0) {
      const lastKey = keys[keys.length - 1];
      await this.patch({ lastProcessed: lastKey });
    }
    return processed;
  }
}
export class CoordinatorEntity extends IndexedEntity<CoordinatorState> {
  static readonly entityName = "coordinator";
  static readonly indexName = "coordinators"; // This is a singleton
  static readonly initialState: CoordinatorState = { id: 'global', totalEvents: 0, buckets: {}, lastUpdate: '' };
  static readonly singletonId = "global";
  static async ensureSeed(env: Env): Promise<void> {
    const coord = new this(env, this.singletonId);
    if (!(await coord.exists())) {
      await coord.save(this.initialState);
    }
  }
  async incrEvent(hourKey: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      totalEvents: s.totalEvents + 1,
      buckets: { ...s.buckets, [hourKey]: (s.buckets[hourKey] || 0) + 1 },
      lastUpdate: new Date().toISOString(),
    }));
  }
  async getFeed(feedId: string): Promise<FeedState | null> {
    const feed = new FeedEntity(this.env, feedId);
    return (await feed.exists()) ? await feed.getState() : null;
  }
  async computeStats(): Promise<FeedStats & { velocity: VelocityDataPoint[] }> {
    const di = new DurabilityIndexEntity(this.env, DurabilityIndexEntity.singletonId);
    await di.applyWAL();
    const { items: feeds } = await FeedEntity.list(this.env, null, 500);
    const s = await this.getState();
    const totalFeeds = feeds.length;
    const activeFeeds = feeds.filter(f => f.status === 'Online').length;
    const alerts = feeds.length - activeFeeds;
    const now = new Date();
    const currentHour = Math.floor(now.getTime() / 3600000);
    const velocity: VelocityDataPoint[] = [];
    for (let i = 9; i >= 0; i--) {
      const hr = currentHour - i;
      const d = new Date(hr * 3600000);
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }).replace('24', '00') + ":00";
      const events = s.buckets[`${hr}`] || 0;
      velocity.push({ time, events });
    }
    return {
      totalFeeds,
      activeFeeds,
      alerts,
      activeFeedsTrend: Math.random() * 5 - 2.5, // Mock trend
      alertsTrend: Math.random() * 20 - 10, // Mock trend
      velocity,
    };
  }
}
export class FeedEntity extends IndexedEntity<FeedState> {
  static readonly entityName = "feed";
  static readonly indexName = "feeds";
  static readonly initialState: FeedState = {
    id: "",
    name: "",
    type: "Traffic",
    status: "Offline",
    region: "",
    lastUpdate: new Date(0).toISOString(),
    history: [],
    ingestionRate: 0,
    totalEvents: 0,
  };
  static seedData = MOCK_FEEDS.map(f => ({
    ...f,
    history: MOCK_FEED_HISTORY[f.id] ?? [],
    ingestionRate: Math.round(Math.random() * 10 + 5),
    totalEvents: MOCK_FEED_HISTORY[f.id]?.length || Math.round(100 + Math.random() * 200),
  }));
  static async ensureSeed(env: Env): Promise<void> {
    await super.ensureSeed(env);
  }
  static async ingest(env: Env, id: string, payload: Record<string, any>): Promise<void> {
    const feed = new this(env, id);
    await feed.mutate(s => {
      const now = new Date().toISOString();
      const newHistoryItem: HistoryItem = {
        timestamp: now,
        payload,
        severity: payload.severity || 'info',
      };
      const newHistory = [newHistoryItem, ...s.history].slice(0, 100);
      const totalEvents = (s.totalEvents || s.history.length) + 1;
      // Simple ingestion rate: events in last hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentEvents = newHistory.filter(h => new Date(h.timestamp).getTime() > oneHourAgo);
      const ingestionRate = recentEvents.length;
      return {
        ...s,
        history: newHistory,
        lastUpdate: now,
        totalEvents,
        ingestionRate,
        status: 'Online' // Assume ingest means it's online
      };
    });
    // Notify coordinator
    const coord = new CoordinatorEntity(env, CoordinatorEntity.singletonId);
    const now = Date.now();
    const hourKey = `${Math.floor(now / 3600000)}`;
    await coord.incrEvent(hourKey);
  }
}