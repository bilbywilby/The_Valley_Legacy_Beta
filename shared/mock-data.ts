import type { FeedItem, FeedStats, VelocityDataPoint, HistoryItem, VectorizedEvent, PulseMetrics } from './types';
export const MOCK_FEEDS: FeedItem[] = [
  { id: 'f1', name: 'Traffic - Route 22 West', type: 'Traffic', status: 'Online', region: 'Lehigh County', lastUpdate: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: 'f2', name: 'Weather - Allentown', type: 'Weather', status: 'Online', region: 'Lehigh County', lastUpdate: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'f3', name: 'Public Safety - Bethlehem PD', type: 'Public Safety', status: 'Degraded', region: 'Northampton County', lastUpdate: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 'f4', name: 'Infrastructure - PPL Outages', type: 'Infrastructure', status: 'Online', region: 'Lehigh Valley', lastUpdate: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'f5', name: 'Traffic - I-78 East', type: 'Traffic', status: 'Online', region: 'Northampton County', lastUpdate: new Date(Date.now() - 1 * 60 * 1000).toISOString() },
  { id: 'f6', name: 'Public Safety - Easton FD', type: 'Public Safety', status: 'Offline', region: 'Northampton County', lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'f7', name: 'Weather - Easton', type: 'Weather', status: 'Online', region: 'Northampton County', lastUpdate: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
];
export const MOCK_FEED_HISTORY: Record<string, HistoryItem[]> = {
  'f1': Array.from({ length: 50 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 5 * 60 * 1000).toISOString(),
    payload: { event: 'Congestion Detected', speed: `${Math.floor(20 + Math.random() * 15)} mph`, location: 'Mile 34.5' },
    severity: Math.random() > 0.9 ? 'high' : 'info',
  })),
  'f2': Array.from({ length: 30 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 15 * 60 * 1000).toISOString(),
    payload: { event: 'Temperature Update', temp: `${Math.floor(65 + Math.random() * 10)}°F`, condition: 'Partly Cloudy' },
    severity: 'info',
  })),
  'f3': Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 45 * 60 * 1000).toISOString(),
    payload: { event: 'Dispatch', unit: `Unit ${101 + i}`, details: 'Noise complaint' },
    severity: 'low',
  })),
  'f4': Array.from({ length: 15 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString(),
    payload: { event: 'Power Status', status: 'Stable', affected: 0 },
    severity: 'info',
  })),
  'f5': Array.from({ length: 40 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3 * 60 * 1000).toISOString(),
    payload: { event: 'Clear', speed: `${Math.floor(60 + Math.random() * 5)} mph`, location: 'Exit 71' },
    severity: 'info',
  })),
};
export const MOCK_DASHBOARD_STATS: FeedStats = {
  totalFeeds: 42,
  activeFeeds: 39,
  activeFeedsTrend: -2.5,
  alerts: 7,
  alertsTrend: 15.2,
};
export const MOCK_VELOCITY_DATA: VelocityDataPoint[] = [
  { time: '12:00', events: 120 },
  { time: '13:00', events: 150 },
  { time: '14:00', events: 130 },
  { time: '15:00', events: 180 },
  { time: '16:00', events: 210 },
  { time: '17:00', events: 250 },
  { time: '18:00', events: 230 },
  { time: '19:00', events: 200 },
  { time: '20:00', events: 180 },
];
const generateMockEmbedding = (): number[] => Array.from({ length: 128 }, () => Math.random() * 2 - 1);
export const MOCK_VECTOR_SHARDS: { id: string; events: VectorizedEvent[] }[] = [
  {
    id: `Lehigh County-traffic-${new Date().toISOString().slice(0, 10)}`,
    events: Array.from({ length: 20 }, (_, i) => ({
      _id: `mock-traffic-${i}`,
      _seq: Date.now() - i * 10000,
      feedId: 'f1',
      payload: { event: 'Accident report', location: `Route 22, mile ${30 + i}` },
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      embedding: generateMockEmbedding(),
    })),
  },
  {
    id: `Northampton County-weather-${new Date().toISOString().slice(0, 10)}`,
    events: Array.from({ length: 15 }, (_, i) => ({
      _id: `mock-weather-${i}`,
      _seq: Date.now() - i * 15000,
      feedId: 'f7',
      payload: { event: 'High wind advisory', speed: `${20 + i} mph` },
      timestamp: new Date(Date.now() - i * 90000).toISOString(),
      embedding: generateMockEmbedding(),
    })),
  },
  {
    id: `Lehigh Valley-infrastructure-${new Date().toISOString().slice(0, 10)}`,
    events: Array.from({ length: 10 }, (_, i) => ({
      _id: `mock-infra-${i}`,
      _seq: Date.now() - i * 20000,
      feedId: 'f4',
      payload: { event: 'Power outage reported', affected: 50 + i * 10 },
      timestamp: new Date(Date.now() - i * 120000).toISOString(),
      embedding: generateMockEmbedding(),
    })),
  },
];
export const MOCK_H3_PULSE: Record<string, PulseMetrics> = {
  'demo-h3-lehigh-001': {
    hex: 'demo-h3-lehigh-001',
    period: '24h',
    safetyZ: 1.8,
    eventsZ: -0.5,
    trafficZ: 0.2,
    lastUpdated: new Date().toISOString(),
  },
  'demo-h3-northampton-002': {
    hex: 'demo-h3-northampton-002',
    period: '24h',
    safetyZ: -1.1,
    eventsZ: 2.3,
    trafficZ: 1.5,
    lastUpdated: new Date().toISOString(),
  },
};
export const MOCK_CRED_SCORES: Record<string, { score: number, factors: any }> = {
  'mock-traffic-1': {
    score: 85,
    factors: { sources: 2, corroborations: 5, ageHours: 1 },
  },
  'test-safety-1': {
    score: 92,
    factors: { sources: 1, corroborations: 10, ageHours: 0.5 },
  },
};