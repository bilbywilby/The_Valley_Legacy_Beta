import { IndexedEntity, Env } from "./core-utils";
import type { FeedState, HistoryItem, CoordinatorState, RateLimitState, VelocityDataPoint, FeedStats, DurabilityIndexState, WALEvent } from "@shared/types";
import { MOCK_FEEDS, MOCK_FEED_HISTORY } from "@shared/mock-data";
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
export class DurabilityIndexEntity extends IndexedEntity<DurabilityIndexState> {
  static readonly entityName = 'durindex';
  static readonly indexName = 'durindexes';
  static readonly singletonId = 'global';
  static readonly initialState: DurabilityIndexState = { id: 'global', lastProcessed: '', seenEvents: [] };
  static async ensureSeed(env: Env): Promise<void> {
    const di = new this(env, this.singletonId);
    if (!(await di.exists())) {
      await di.save(this.initialState);
      // Seed test WAL events only on first creation
      const testEvents: WALEvent[] = [
        { _id: 'test-traffic-1', _seq: Date.now(), feedId: 'f1', payload: {speed: 65, location: 'Test Route 22'}, timestamp: new Date().toISOString() },
        { _id: 'test-weather-1', _seq: Date.now() + 1, feedId: 'f2', payload: {temp: 72, condition: 'Clear'}, timestamp: new Date().toISOString() },
        { _id: 'test-safety-1', _seq: Date.now() + 2, feedId: 'f3', payload: {event: 'Test Dispatch', unit: '101'}, timestamp: new Date().toISOString() },
      ];
      const day = new Date().toISOString().slice(0,10);
      for (const event of testEvents) {
        const walKey = `wal/${day}/${event._seq}.${event._id}`;
        await di.appendWAL(walKey, event);
      }
    }
  }
  static async listWALKeys(env: Env, after?: string): Promise<{ keys: string[]; next: string | null }> {
    const di = new this(env, this.singletonId);
    return di.stub.listPrefix('wal/', after);
  }
  async appendWAL(key: string, event: WALEvent): Promise<void> {
    // Use casPut with version 0 to ensure this is a new, unversioned entry.
    await this.stub.casPut(key, 0, event);
  }
  async listWALKeys(afterKey?: string): Promise<string[]> {
    const res = await this.stub.listPrefix('wal/', afterKey);
    return res.keys;
  }
  async getWALEvent(key: string): Promise<WALEvent | null> {
    const doc = await this.stub.getDoc<WALEvent>(key);
    return doc?.data ?? null;
  }
  async processEvent(key: string): Promise<boolean> {
    const event = await this.getWALEvent(key);
    if (!event) return false;
    const s = await this.getState();
    if (s.seenEvents.includes(event._id)) return false;
    await FeedEntity.ingest(this.env, event.feedId, event.payload);
    await this.mutate(cur => ({
      ...cur,
      seenEvents: [...cur.seenEvents, event._id].slice(-50000)
    }));
    return true;
  }
  async replay(): Promise<number> {
    const s = await this.getState();
    const keys = await this.listWALKeys(s.lastProcessed ?? undefined);
    let processed = 0;
    for (const key of keys) {
      if (await this.processEvent(key)) processed++;
    }
    if (keys.length > 0) {
      await this.patch({ lastProcessed: keys[keys.length - 1] });
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
    await di.replay();
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