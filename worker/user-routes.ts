import { Hono } from "hono";
import type { Env } from './core-utils';
import { FeedEntity, CoordinatorEntity, RateLimitEntity, DurabilityIndexEntity, VectorIndexCoordinatorEntity, BM25IndexEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import { schemas, FeedType } from "@shared/schemas";
import { ZodError } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { WALEvent, WALStats, IngestEvent, VectorizedEvent, SearchResponse } from "@shared/types";
// This is a simplified version of the generateEmbedding function for use in routes.
// The full version with crypto is in entities.ts.
async function generateEmbeddingRoute(input: string): Promise<number[]> {
  const vector: number[] = [];
  for (let i = 0; i < 128; i++) {
    vector.push(Math.random() * 2 - 1);
  }
  return vector;
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Middleware
  const rateLimit = async (c: any, next: any) => {
    const ip = c.req.header('cf-connecting-ip') || 'anonymous';
    const rl = new RateLimitEntity(c.env, ip);
    if (await rl.isLimited(60000, 100)) { // Increased limit for dev
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
  app.use('/api/*', cachedGet(['/api/feeds', '/api/dashboard/stats', '/api/dashboard/velocity', '/api/coordinator/stats', '/api/list-wal', '/api/read-wal', '/api/query-semantic', '/api/search']));
  // Ensure seed data is present on first load
  app.use('/api/*', async (c, next) => {
    await FeedEntity.ensureSeed(c.env);
    await CoordinatorEntity.ensureSeed(c.env);
    await DurabilityIndexEntity.ensureSeed(c.env);
    await VectorIndexCoordinatorEntity.ensureSeed(c.env);
    await BM25IndexEntity.ensureSeed(c.env);
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
  app.post('/api/ingest', async (c) => {
    console.time('ingest');
    const body: IngestEvent = await c.req.json();
    const { feedId, payload, idempotencyKey, clientSeq } = body;
    if (!isStr(feedId) || !payload) return bad(c, 'feedId and payload required');
    const coord = new CoordinatorEntity(c.env, CoordinatorEntity.singletonId);
    const feed = await coord.getFeed(feedId);
    if (!feed) return notFound(c, 'Feed not found');
    try {
      const schema = schemas[feed.type as FeedType];
      schema.parse(payload);
    } catch (e: unknown) {
      if (e instanceof ZodError) return bad(c, e.issues.map((issue) => issue.message).join(', '));
      return bad(c, 'Invalid payload');
    }
    const _id = idempotencyKey || uuidv4();
    const di = new DurabilityIndexEntity(c.env, DurabilityIndexEntity.singletonId);
    const s = await di.getState();
    if (s.seenEvents.includes(_id)) {
      return c.json({ success: true, ackId: _id, alreadySeen: true }, 202);
    }
    const _seq = clientSeq ?? Date.now();
    const timestamp = new Date().toISOString();
    const embedding = await generateEmbeddingRoute(JSON.stringify(payload));
    const event: VectorizedEvent = { _id, _seq, feedId, payload, timestamp, embedding };
    const dayKey = event.timestamp.slice(0, 10);
    const walKey = `wal/${dayKey}/${_seq}.${_id}.json`;
    const ackResp = c.json({ success: true, ackId: _id }, 202);
    c.executionCtx.waitUntil((async () => {
      await DurabilityIndexEntity.appendToR2WAL(c.env, walKey, JSON.stringify(event));
      await di.mutate((s) => ({ ...s, seenEvents: [...s.seenEvents, _id].slice(-50000) }));
    })());
    console.timeEnd('ingest');
    return ackResp;
  });
  app.get('/api/query-semantic', async (c) => {
    const text = c.req.query('text');
    if (!isStr(text)) return bad(c, 'text is required');
    const params = new URLSearchParams({ q: text, beta: '1.0', alpha: '0.0' });
    return c.redirect(`/api/search?${params.toString()}`);
  });
  app.get('/api/search', async (c) => {
    const q = c.req.query('q');
    if (!isStr(q)) return bad(c, 'q is required');
    const alpha = parseFloat(c.req.query('alpha') || '0.5');
    const beta = parseFloat(c.req.query('beta') || '0.5');
    const limit = parseInt(c.req.query('limit') || '20');
    const threshold = parseFloat(c.req.query('threshold') || '0.7');
    const startTime = Date.now();
    const coord = new VectorIndexCoordinatorEntity(c.env, VectorIndexCoordinatorEntity.singletonId);
    const bm25Candidates = await BM25IndexEntity.searchCandidates(c.env, BM25IndexEntity.tokenizer(q), 50);
    const fused = await coord.queryHybrid(c.env, { q, alpha, beta, limit, threshold });
    const fusionLat = Date.now() - startTime;
    console.log(`BM25 hits: ${bm25Candidates.length}, Fusion latency: ${fusionLat}ms`);
    const response: SearchResponse = {
      ...fused,
      bm25Hits: bm25Candidates.length,
      fusionLat,
    };
    return ok(c, response);
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
    const di = new DurabilityIndexEntity(c.env, DurabilityIndexEntity.singletonId);
    await di.applyWAL();
    const feed = await feedInstance.getState();
    return ok(c, { feed });
  });
  // Ingest Event to a Feed (Legacy, prefer /api/ingest)
  app.post('/api/feeds/:id/ingest', authStub, async (c) => {
    const id = c.req.param('id');
    const { payload } = await c.req.json();
    if (!isStr(id) || !payload) return bad(c, 'feedId and payload required');
    await FeedEntity.ingest(c.env, id, payload);
    return ok(c, { success: true });
  });
  // R2-Simulated WAL Routes
  app.get('/api/list-wal', async (c) => {
    const prefix = c.req.query('prefix') || '';
    const after = c.req.query('after');
    const res = await DurabilityIndexEntity.listR2WAL(c.env, prefix, after || undefined);
    return ok(c, res);
  });
  app.get('/api/read-wal', async (c) => {
    const key = c.req.query('key');
    if (!isStr(key)) return bad(c, 'key required');
    const content = await DurabilityIndexEntity.getR2WAL(c.env, key);
    if (content === null) return notFound(c, 'key not found');
    return ok(c, { content });
  });
  app.post('/api/apply-wal', async (c) => {
    const di = new DurabilityIndexEntity(c.env, DurabilityIndexEntity.singletonId);
    const processed = await di.applyWAL();
    const s = await di.getState();
    return ok(c, { processed, lastProcessed: s.lastProcessed, totalSeen: s.seenEvents.length } as WALStats);
  });
}