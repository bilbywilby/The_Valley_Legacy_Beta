import type { FeedItem, FeedStats, VelocityDataPoint } from './types';
export const MOCK_FEEDS: FeedItem[] = [
  { id: 'f1', name: 'Traffic - Route 22 West', type: 'Traffic', status: 'Online', region: 'Lehigh County', lastUpdate: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: 'f2', name: 'Weather - Allentown', type: 'Weather', status: 'Online', region: 'Lehigh County', lastUpdate: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 'f3', name: 'Public Safety - Bethlehem PD', type: 'Public Safety', status: 'Degraded', region: 'Northampton County', lastUpdate: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 'f4', name: 'Infrastructure - PPL Outages', type: 'Infrastructure', status: 'Online', region: 'Lehigh Valley', lastUpdate: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'f5', name: 'Traffic - I-78 East', type: 'Traffic', status: 'Online', region: 'Northampton County', lastUpdate: new Date(Date.now() - 1 * 60 * 1000).toISOString() },
  { id: 'f6', name: 'Public Safety - Easton FD', type: 'Public Safety', status: 'Offline', region: 'Northampton County', lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'f7', name: 'Weather - Easton', type: 'Weather', status: 'Online', region: 'Northampton County', lastUpdate: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
];
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