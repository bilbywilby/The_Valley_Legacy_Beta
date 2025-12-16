export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface HistoryItem {
  timestamp: string; // ISO 8601 string
  payload: Record<string, any>;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}
export interface FeedItem {
  id: string;
  name: string;
  type: 'Traffic' | 'Weather' | 'Public Safety' | 'Infrastructure';
  status: 'Online' | 'Degraded' | 'Offline';
  region: string;
  lastUpdate: string; // ISO 8601 string
}
export interface FeedState extends FeedItem {
  history: HistoryItem[];
  ingestionRate: number;
  totalEvents: number;
}
export interface FeedDetailResponse {
  feed: FeedState;
}
export interface FeedStats {
  totalFeeds: number;
  activeFeeds: number;
  activeFeedsTrend?: number;
  alerts: number;
  alertsTrend?: number;
}
export interface VelocityDataPoint {
  time: string;
  events: number;
}
export interface CoordinatorState {
  id: string;
  totalEvents: number;
  buckets: Record<string, number>; // hourKey -> count
  lastUpdate: string;
}
export interface RateLimitState {
  id: string;
  count: number;
  resetTime: number; // ms
}
export interface DurabilityIndexState {
  id: string;
  lastProcessed: string;
  seenEvents: string[];
}
export interface WALEvent {
  _id: string;
  _seq: number;
  feedId: string;
  payload: Record<string, any>;
  timestamp: string;
}
export interface WALListResponse {
  keys: string[];
  next?: string | null;
}
export interface WALStats {
  processed: number;
  lastProcessed: string;
  totalSeen: number;
}
export interface IngestEvent {
  feedId: string;
  payload: Record<string, any>;
  idempotencyKey?: string;
  clientSeq?: number;
}
export type R2WALContent = string; // JSON string for simulated R2 objects