import { Hono } from "hono";
import type { Env } from './core-utils';
import { FeedEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import { MOCK_VELOCITY_DATA } from "@shared/mock-data";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure seed data is present on first load
  app.use('/api/*', async (c, next) => {
    await FeedEntity.ensureSeed(c.env);
    await next();
  });
  // Dashboard Stats (now data-driven)
  app.get('/api/dashboard/stats', async (c) => {
    const { items: feeds } = await FeedEntity.list(c.env, null, 500);
    const totalFeeds = feeds.length;
    const activeFeeds = feeds.filter(f => f.status === 'Online').length;
    const alerts = feeds.filter(f => f.status === 'Degraded' || f.status === 'Offline').length;
    return ok(c, {
      totalFeeds,
      activeFeeds,
      alerts,
      activeFeedsTrend: Math.random() * 5 - 2.5, // Mock trend
      alertsTrend: Math.random() * 20 - 10, // Mock trend
    });
  });
  // Dashboard Velocity Chart (still mock)
  app.get('/api/dashboard/velocity', (c) => {
    return ok(c, MOCK_VELOCITY_DATA);
  });
  // Feeds List
  app.get('/api/feeds', async (c) => {
    const page = await FeedEntity.list(c.env, null, 100); // Fetch up to 100 feeds
    return ok(c, page);
  });
  // Feed Detail
  app.get('/api/feeds/:id', async (c) => {
    const id = c.req.param('id');
    if (!id) return bad(c, 'Feed ID is required');
    const feedInstance = new FeedEntity(c.env, id);
    if (!(await feedInstance.exists())) {
      return notFound(c, 'Feed not found');
    }
    const feed = await feedInstance.getState();
    return ok(c, { feed });
  });
  // Ingest Event to a Feed
  app.post('/api/feeds/:id/ingest', async (c) => {
    const id = c.req.param('id');
    if (!id) return bad(c, 'Feed ID is required');
    try {
      const { payload } = await c.req.json();
      if (!payload) return bad(c, 'Payload is required');
      await FeedEntity.ingest(c.env, id, payload);
      return ok(c, { success: true });
    } catch (e) {
      console.error("Ingest failed:", e);
      return bad(c, 'Invalid request body');
    }
  });
}