import { Hono } from "hono";
import type { Env } from './core-utils';
import { FeedEntity, CoordinatorEntity, RateLimitEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import { schemas, FeedType } from "@shared/schemas";
import { ZodError } from "zod";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Middleware
  const rateLimit = async (c: any, next: any) => {
    const ip = c.req.header('cf-connecting-ip') || 'anonymous';
    const rl = new RateLimitEntity(c.env, ip);
    if (await rl.isLimited(60000, 10)) {
      return bad(c, 'Rate limited');
    }
    await next();
    await rl.hit();
  };
  const authStub = async (c: any, next: any) => {
    if (c.req.header('X-API-Key') !== 'valleyscope-demo') {
      return bad(c, 'Invalid API key');
    }
    await next();
  };
  const cachedGet = (paths: string[]) => async (c: any, next: any) => {
    if (!paths.some(p => c.req.path.startsWith(p))) {
      return await next();
    }
    const cache = (caches as any).default;
    let response = await cache.match(c.req.raw);
    if (response) {
      return response;
    }
    await next();
    if (c.res.ok) {
      response = c.res.clone();
      response.headers.set('Cache-Control', 's-maxage=300');
      c.executionCtx.waitUntil(cache.put(c.req.raw, response));
    }
  };
  app.use('/api/*', rateLimit);
  app.use('/api/ingest*', authStub);
  app.use('/api/coordinator/ingest*', authStub);
  app.use('/api/*', cachedGet(['/api/feeds', '/api/dashboard/stats', '/api/dashboard/velocity', '/api/coordinator/stats']));
  // Ensure seed data is present on first load
  app.use('/api/*', async (c, next) => {
    await FeedEntity.ensureSeed(c.env);
    await next();
  });
  // --- DEPRECATED ROUTES (kept for compatibility, now point to coordinator) ---
  app.get('/api/dashboard/stats', async (c) => {
    const coord = new CoordinatorEntity(c.env, CoordinatorEntity.singletonId);
    const stats = await coord.computeStats();
    return ok(c, stats);
  });
  app.get('/api/dashboard/velocity', async (c) => {
    const coord = new CoordinatorEntity(c.env, CoordinatorEntity.singletonId);
    const { velocity } = await coord.computeStats();
    return ok(c, velocity);
  });
  // --- NEW & UPDATED ROUTES ---
  app.get('/api/coordinator/stats', async (c) => {
    const coord = new CoordinatorEntity(c.env, CoordinatorEntity.singletonId);
    const stats = await coord.computeStats();
    return ok(c, stats);
  });
  const handleIngest = async (c: any, feedId: string, payload: any) => {
    if (!isStr(feedId) || !payload) return bad(c, 'feedId and payload required');
    const coord = new CoordinatorEntity(c.env, CoordinatorEntity.singletonId);
    const feed = await coord.getFeed(feedId);
    if (!feed) return notFound(c, 'Feed not found');
    try {
      const schema = schemas[feed.type as FeedType];
      if (!schema) return bad(c, `No validation schema for feed type: ${feed.type}`);
      schema.parse(payload);
    } catch (e) {
      if (e instanceof ZodError) {
        return bad(c, `Validation failed: ${e.errors.map(err => err.message).join(', ')}`);
      }
      return bad(c, 'Invalid payload');
    }
    await FeedEntity.ingest(c.env, feedId, payload);
    return ok(c, { success: true });
  };
  app.post('/api/coordinator/ingest/:feedId', async (c) => {
    const feedId = c.req.param('feedId');
    const { payload } = await c.req.json();
    return handleIngest(c, feedId, payload);
  });
  app.post('/api/ingest', async (c) => {
    const { feedId, payload } = await c.req.json<{ feedId: string; payload: any }>();
    return handleIngest(c, feedId, payload);
  });
  // Feeds List
  app.get('/api/feeds', async (c) => {
    const page = await FeedEntity.list(c.env, null, 100);
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
  // Ingest Event to a Feed (Legacy, prefer /api/ingest)
  app.post('/api/feeds/:id/ingest', authStub, async (c) => {
    const id = c.req.param('id');
    const { payload } = await c.req.json();
    return handleIngest(c, id, payload);
  });
}