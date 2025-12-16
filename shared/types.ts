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
  totalEvents: number;
  buckets: Record<string, number>; // hourKey -> count
  lastUpdate: string;
}
export interface RateLimitState {
  count: number;
  resetTime: number; // ms
}