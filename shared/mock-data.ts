import type { FeedItem, FeedStats, VelocityDataPoint, HistoryItem, VectorizedEvent, PulseMetrics, Resource } from './types';
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
export const MOCK_RESOURCES: Resource[] = [
  { id: 'res-food-001', name: 'Allentown Area Ecumenical Food Bank', type: 'food', lat: 40.6022, lon: -75.4714, address: '245 N 6th St, Allentown, PA 18102', hours: ['Mon-Fri 9am-12pm'], eligibility: ['low-income', 'families'], access_rating: 4.8, langs: ['en', 'es'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 821-1332', website: 'http://www.allentownfoodbank.org/', available_spots: 25 },
  { id: 'res-shelter-001', name: 'Bethlehem Emergency Sheltering', type: 'shelter', lat: 40.6176, lon: -75.3785, address: '75 E Market St, Bethlehem, PA 18018', hours: ['24/7'], eligibility: ['homeless'], access_rating: 4.5, langs: ['en'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 866-8009', website: 'https://www.bethlehemsheltering.org/', available_spots: 12 },
  { id: 'res-clinic-001', name: 'Neighborhood Health Centers of the Lehigh Valley', type: 'clinic', lat: 40.6105, lon: -75.4898, address: '218 N 2nd St, Allentown, PA 18101', hours: ['Mon-Fri 8am-5pm'], eligibility: ['all'], access_rating: 4.9, langs: ['en', 'es'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 841-3535', website: 'https://nhclv.org/', available_spots: 45 },
  { id: 'res-food-002', name: 'Second Harvest Food Bank', type: 'food', lat: 40.6484, lon: -75.4321, address: '6969 Silver Crest Rd, Nazareth, PA 18064', hours: ['Mon-Fri 8am-4pm'], eligibility: ['agencies'], access_rating: 4.7, langs: ['en'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 434-0875', website: 'https://shfblv.org/', available_spots: 30 },
  { id: 'res-community-001', name: 'Hispanic Center Lehigh Valley', type: 'community', lat: 40.6108, lon: -75.3703, address: '520 E 4th St, Bethlehem, PA 18015', hours: ['Mon-Fri 9am-5pm'], eligibility: ['hispanic-community'], access_rating: 4.6, langs: ['es', 'en'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 868-0166', website: 'https://www.hclv.org/', available_spots: 0 },
  { id: 'res-legal-001', name: 'North Penn Legal Services', type: 'legal', lat: 40.6153, lon: -75.3799, address: '559 Main St #200, Bethlehem, PA 18018', hours: ['Mon-Fri 9am-5pm'], eligibility: ['low-income'], access_rating: 4.3, langs: ['en', 'es'], verified: false, lastUpdated: new Date().toISOString(), phone: '(610) 317-8757', website: 'https://www.nplspa.org/', available_spots: 0 },
  { id: 'res-shelter-002', name: 'Safe Harbor Easton', type: 'shelter', lat: 40.6923, lon: -75.2088, address: '536 Bushkill Dr, Easton, PA 18042', hours: ['24/7'], eligibility: ['homeless'], access_rating: 4.4, langs: ['en'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 258-5540', website: 'https://safeharboreaston.org/', available_spots: 8 },
  { id: 'res-clinic-002', name: 'LVHN Community Health Center', type: 'clinic', lat: 40.5988, lon: -75.4755, address: '1730 Chew St, Allentown, PA 18104', hours: ['Varies'], eligibility: ['all'], access_rating: 4.8, langs: ['en', 'es'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 969-2850', website: 'https://www.lvhn.org/', available_spots: 38 },
  { id: 'res-food-003', name: 'Easton Area Community Center', type: 'food', lat: 40.6865, lon: -75.2205, address: '901 Washington St, Easton, PA 18042', hours: ['Mon-Fri 9am-4pm'], eligibility: ['youth', 'families'], access_rating: 4.2, langs: ['en'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 253-8271', website: 'https://www.eastonareacc.org/', available_spots: 15 },
  { id: 'res-other-001', name: 'Lehigh Valley Active Life', type: 'other', lat: 40.6011, lon: -75.4799, address: '1633 W Elm St, Allentown, PA 18102', hours: ['Mon-Fri 8am-4pm'], eligibility: ['seniors'], access_rating: 4.9, langs: ['en'], verified: true, lastUpdated: new Date().toISOString(), phone: '(610) 437-3700', website: 'https://lvactivelife.org/', available_spots: 0 },
];