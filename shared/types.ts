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
  lastUpdate: string;
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
  id:string;
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
// --- Vector Search & Fusion Types ---
export interface VectorizedEvent extends WALEvent {
  embedding: number[]; // 128-dim mock vector [-1,1]
}
export interface SearchResult {
  event: VectorizedEvent;
  score: number; // cosine similarity or fused score [0,1]
}
export interface SemanticQueryParams {
  text: string;
  limit?: number;
  threshold?: number;
}
export interface SemanticQueryResponse {
  results: SearchResult[];
  total: number;
}
export interface BM25Result {
  docId: string;
  score: number;
}
export interface FusionParams extends Omit<SemanticQueryParams, 'text'> {
  q: string;
  alpha?: number;
  beta?: number;
}
export interface SearchResponse extends SemanticQueryResponse {
  bm25Hits: number;
  fusionLat: number;
}
// --- Hyperlocal Civic API Types ---
export interface PulseMetrics {
  hex: string;
  period: string;
  safetyZ: number;
  eventsZ: number;
  trafficZ: number;
  lastUpdated: string;
}
export interface CredResponse {
  itemId: string;
  score: number;
  factors: {
    sources: number;
    corroborations: number;
    ageHours: number;
  };
}
export interface TileParams {
  query: 'topics' | 'traffic' | 'sentiment';
  window: string;
}
// --- Community Resource Discovery Types ---
export type ResourceType = 'food' | 'clinic' | 'shelter' | 'community' | 'legal' | 'other';
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  lat: number;
  lon: number;
  address: string;
  hours: string[];
  eligibility: string[];
  access_rating: number;
  langs: string[];
  verified: boolean;
  lastUpdated: string; // ISO 8601 string
  phone?: string;
  website?: string;
  available_spots?: number;
}
export interface ResourceFilters {
  lat?: number;
  lon?: number;
  radius?: number;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  open_now?: boolean;
  lang?: string;
  eligibility?: string;
  min_rating?: number;
  type?: ResourceType;
  query?: string;
  radius_km?: number;
}
export interface ResourceListResponse {
  items: (Resource & { dist_km?: number })[];
  next?: string;
}
export interface ShelterListResponse {
  items: (Resource & { dist_km?: number })[];
  next?: string;
}