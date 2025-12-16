import { IndexedEntity, Env } from "./core-utils";
import type { FeedState, HistoryItem, CoordinatorState, RateLimitState, VelocityDataPoint, FeedStats, DurabilityIndexState, WALEvent, IngestEvent, VectorizedEvent, SearchResult, SemanticQueryParams, SemanticQueryResponse, FusionParams, BM25Result, PulseMetrics, Resource, ResourceFilters, ResourceType, ResourceListResponse, ShelterListResponse } from "@shared/types";
import { MOCK_FEEDS, MOCK_FEED_HISTORY, MOCK_VECTOR_SHARDS, MOCK_H3_PULSE, MOCK_RESOURCES } from "@shared/mock-data";
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
export class BM25IndexEntity extends IndexedEntity<{id: string, postings: Record<string, string[]>}> {
  static readonly entityName = 'bm25idx';
  static readonly indexName = 'bm25indexes';
  static readonly singletonId = 'global';
  static readonly initialState = {id: 'global', postings: {}};
  static async ensureSeed(env: Env): Promise<void> {
    const idx = new this(env, this.singletonId);
    if (!(await idx.exists())) {
      await idx.save(this.initialState);
    }
  }
  static tokenizer(text: string): string[] {
    return (text.toLowerCase().match(/\w+/g) || []).filter(token => token.length > 2); // Basic tokenizer
  }
  static async ingestTokens(env: Env, docId: string, tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    const idx = new this(env, this.singletonId);
    await idx.mutate(s => {
      const newPostings = { ...s.postings };
      for (const token of tokens) {
        const currentDocs = newPostings[token] || [];
        if (!currentDocs.includes(docId)) {
          newPostings[token] = [docId, ...currentDocs].slice(0, 1000);
        }
      }
      return { ...s, postings: newPostings };
    });
  }
  static async searchCandidates(env: Env, queryTokens: string[], limit: number = 50): Promise<BM25Result[]> {
    const idx = new this(env, this.singletonId);
    const s = await idx.getState();
    const candidates: Record<string, number> = {};
    for (const token of queryTokens) {
      const docs = s.postings[token] || [];
      for (const docId of docs) {
        candidates[docId] = (candidates[docId] || 0) + 1; // Simple scoring: term frequency
      }
    }
    // Normalize score by number of query tokens
    const numTokens = queryTokens.length || 1;
    return Object.entries(candidates)
      .map(([docId, score]): BM25Result => ({ docId, score: score / numTokens }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
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
  async queryHybrid(env: Env, params: FusionParams): Promise<SemanticQueryResponse> {
    const { q, alpha = 0.5, beta = 0.5, limit = 20, threshold = 0.7 } = params;
    const queryTokens = BM25IndexEntity.tokenizer(q);
    const [bm25Candidates, vectorResponse] = await Promise.all([
      BM25IndexEntity.searchCandidates(env, queryTokens, 50),
      this.querySemantic(env, { text: q, limit: 50, threshold: threshold - 0.2 }) // lower threshold for wider net
    ]);
    const fusedScores: Record<string, { event: VectorizedEvent, score: number }> = {};
    const vectorScoreMap = new Map(vectorResponse.results.map(r => [r.event._id, { event: r.event, score: r.score }]));
    // Add all vector results to the fusion pool
    for (const [id, { event, score }] of vectorScoreMap.entries()) {
      fusedScores[id] = { event, score: (fusedScores[id]?.score || 0) + beta * score };
    }
    // Add all BM25 results
    for (const cand of bm25Candidates) {
      const event = vectorScoreMap.get(cand.docId)?.event || { _id: cand.docId, payload: { "retrieved_by": "bm25" } } as any;
      fusedScores[cand.docId] = {
        event,
        score: (fusedScores[cand.docId]?.score || 0) + alpha * cand.score
      };
    }
    const finalResults: SearchResult[] = Object.values(fusedScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { results: finalResults, total: finalResults.length };
  }
}
export class PulseEntity extends IndexedEntity<{id: string, hexMetrics: Record<string, PulseMetrics>}> {
  static readonly entityName = 'pulse';
  static readonly indexName = 'pulses';
  static readonly singletonId = 'global';
  static readonly initialState = {id: 'global', hexMetrics: {}};
  static async ensureSeed(env: Env): Promise<void> {
    const pulse = new this(env, this.singletonId);
    if (!(await pulse.exists())) {
      await pulse.save({ ...this.initialState, hexMetrics: MOCK_H3_PULSE });
    }
  }
  async getMetrics(hex: string, period: '24h' | '7d'): Promise<PulseMetrics | null> {
    const s = await this.getState();
    // In a real implementation, we would aggregate data here.
    // For now, we return mock data or generate it on the fly.
    const stored = s.hexMetrics[hex];
    if (stored) return { ...stored, period };
    // Generate mock data if not found
    return {
      hex,
      period,
      safetyZ: parseFloat((Math.random() * 4 - 2).toFixed(2)),
      eventsZ: parseFloat((Math.random() * 4 - 2).toFixed(2)),
      trafficZ: parseFloat((Math.random() * 4 - 2).toFixed(2)),
      lastUpdated: new Date().toISOString(),
    };
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
    // Also ingest into BM25 index
    const tokens = BM25IndexEntity.tokenizer(JSON.stringify(event.payload));
    await BM25IndexEntity.ingestTokens(this.env, event._id, tokens);
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
    const now = new Date().toISOString();
    const newHistoryItem: HistoryItem = {
      timestamp: now,
      payload,
      severity: payload.severity || 'info',
    };
    await feed.mutate(s => {
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
    const hourKey = `${Math.floor(Date.now() / 3600000)}`;
    await coord.incrEvent(hourKey);
  }
}
// --- NEW Community Resource Entity ---
interface ResourceState extends Resource {
  geoIndex?: string[];
  reports?: { reason: string; timestamp: string }[];
}
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
export class ResourceEntity extends IndexedEntity<ResourceState> {
  static readonly entityName = 'resource';
  static readonly indexName = 'resources';
  static readonly initialState: ResourceState = {
    id: '', name: '', type: 'other', lat: 0, lon: 0, address: '', hours: [], eligibility: [],
    access_rating: 0, langs: [], verified: false, lastUpdated: '',
  };
  static seedData = MOCK_RESOURCES.map(r => ({ ...r, geoIndex: [`geo:${r.lat.toFixed(4)}:${r.lon.toFixed(4)}:5`] }));
  static async listFiltered(env: Env, filters: ResourceFilters): Promise<ResourceListResponse> {
    const { items } = await this.list(env, null, 1000); // Fetch all for in-memory filter
    const filteredItems = items.map(item => {
      let dist_km: number | undefined = undefined;
      if (filters.lat && filters.lon) {
        dist_km = haversineDistance(filters.lat, filters.lon, item.lat, item.lon);
      }
      return { ...item, dist_km };
    }).filter(item => {
      if (filters.query && !item.name.toLowerCase().includes(filters.query.toLowerCase())) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.lang && !item.langs.includes(filters.lang)) return false;
      if (filters.eligibility && !item.eligibility.includes(filters.eligibility)) return false;
      if (filters.min_rating && item.access_rating < filters.min_rating) return false;
      if (filters.radius && item.dist_km !== undefined && item.dist_km > filters.radius) return false;
      // Note: open_now filter is complex and would require parsing `hours` string, omitted in this stub.
      return true;
    });
    return { items: filteredItems, next: null };
  }
  static async shelters(env: Env, filters: ResourceFilters): Promise<ShelterListResponse> {
    const effectiveFilters: ResourceFilters = {
      ...filters,
      radius: filters.radius_km || filters.radius || 5, // Use radius_km if provided, fallback to radius, then 5km
    };
    const { items, next } = await this.listFiltered(env, effectiveFilters);
    const filteredByType = items.filter(i => ['shelter', 'food', 'clinic'].includes(i.type));
    return { items: filteredByType, next };
  }
  static async ingest(env: Env, payload: Resource): Promise<void> {
    const resource = new this(env, payload.id);
    await resource.save({
      ...payload,
      lastUpdated: new Date().toISOString(),
    });
  }
  static async suggest(env: Env, query: string): Promise<Resource[]> {
    if (!query) return [];
    const { items } = await this.list(env, null, 500);
    const lowerQuery = query.toLowerCase();
    return items.filter(r => r.name.toLowerCase().includes(lowerQuery) || r.type.includes(lowerQuery)).slice(0, 10);
  }
  static async verify(env: Env, id: string, approved: boolean): Promise<void> {
    const resource = new this(env, id);
    if (await resource.exists()) {
      await resource.patch({ verified: approved, lastUpdated: new Date().toISOString() });
    }
  }
  static async report(env: Env, id: string, reason: string): Promise<void> {
    const resource = new this(env, id);
    if (await resource.exists()) {
      await resource.mutate(s => ({
        ...s,
        reports: [...(s.reports ?? []), { reason, timestamp: new Date().toISOString() }],
      }));
    }
  }
}