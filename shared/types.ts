export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface FeedItem {
  id: string;
  name: string;
  type: 'Traffic' | 'Weather' | 'Public Safety' | 'Infrastructure';
  status: 'Online' | 'Degraded' | 'Offline';
  region: string;
  lastUpdate: string; // ISO 8601 string
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