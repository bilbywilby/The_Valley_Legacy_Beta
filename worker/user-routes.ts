import { Hono } from "hono";
import type { Env } from './core-utils';
import { FeedEntity } from "./entities";
import { ok } from './core-utils';
import { MOCK_DASHBOARD_STATS, MOCK_VELOCITY_DATA } from "@shared/mock-data";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure seed data is present on first load
  app.use('/api/*', async (c, next) => {
    await FeedEntity.ensureSeed(c.env);
    await next();
  });
  // Dashboard Stats
  app.get('/api/dashboard/stats', (c) => {
    return ok(c, MOCK_DASHBOARD_STATS);
  });
  // Dashboard Velocity Chart
  app.get('/api/dashboard/velocity', (c) => {
    return ok(c, MOCK_VELOCITY_DATA);
  });
  // Feeds List
  app.get('/api/feeds', async (c) => {
    const page = await FeedEntity.list(c.env, null, 100); // Fetch up to 100 feeds
    return ok(c, page);
  });
}