import { IndexedEntity, Env } from "./core-utils";
import type { FeedState, HistoryItem } from "@shared/types";
import { MOCK_FEEDS, MOCK_FEED_HISTORY } from "@shared/mock-data";
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
    totalEvents: Math.round(100 + Math.random() * 200),
  }));
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
  }
}