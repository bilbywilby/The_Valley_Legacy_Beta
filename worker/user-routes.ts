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
// --- Infographic Generation Logic ---
const RSS_SOURCES: Record<string, string[]> = {
  news: [
    'https://www.mcall.com/arcio/arc/outboundfeeds/rss/?topic=news&outputType=xml',
    'https://patch.com/pennsylvania/lehighvalley/rss'
  ],
  traffic: [
    'https://www.mcall.com/arcio/arc/outboundfeeds/rss/?topic=traffic&outputType=xml'
  ],
  weather: [], // Add sources if available
  all: [
    'https://www.mcall.com/arcio/arc/outboundfeeds/rss/?topic=news&outputType=xml',
    'https://patch.com/pennsylvania/lehighvalley/rss',
    'https://www.mcall.com/arcio/arc/outboundfeeds/rss/?topic=traffic&outputType=xml'
  ]
};
const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'for', 'to', 'of', 'is', 'was', 'it', 'with', 'as', 'by', 'from']);
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Traffic': ['traffic', 'accident', 'crash', 'road', 'route', 'highway', 'i-78', 'rt-22', 'closure', 'congestion'],
  'Weather': ['weather', 'storm', 'rain', 'snow', 'wind', 'temperature', 'forecast', 'warning', 'advisory'],
  'Public Safety': ['police', 'fire', 'arrest', 'crime', 'shooting', 'investigation', 'emergency', 'ems'],
  'Infrastructure': ['power', 'outage', 'water', 'construction', 'development', 'zoning', 'bridge'],
  'Community': ['school', 'event', 'festival', 'community', 'local', 'park', 'meeting', 'lehigh', 'valley']
};
const SENTIMENT_WORDS = {
  positive: new Set(['good', 'great', 'safe', 'clear', 'stable', 'improvement', 'success', 'celebrates']),
  negative: new Set(['bad', 'crash', 'crime', 'warning', 'outage', 'fatal', 'delay', 'problem', 'concern'])
};
const escapeXML = (str: string) => str.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c));
function generateErrorSVG(message: string): string {
  return `<svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
    <style>.title { font-size: 24px; font-weight: bold; fill: #ff6b6b; } .msg { font-size: 18px; fill: #f1f5f9; }</style>
    <rect width="100%" height="100%" fill="#1e293b" />
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" class="title">Infographic Error</text>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" class="msg">${escapeXML(message)}</text>
  </svg>`;
}
function generateInfographicSVG(stats: { topicCounts: Record<string, number>, sentiment: { positive: number, negative: number }, topHeadlines: string[], period: string, source: string }): string {
  const { topicCounts, sentiment, topHeadlines, period, source } = stats;
  const totalTopics = Object.values(topicCounts).reduce((a, b) => a + b, 0);
  const totalSentiment = sentiment.positive + sentiment.negative;
  const barData = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const barWidth = 100;
  const barSpacing = 40;
  const chartHeight = 250;
  const maxCount = Math.max(1, ...barData.map(d => d[1]));
  const bars = barData.map(([topic, count], i) => {
    const height = (count / maxCount) * chartHeight;
    const x = 60 + i * (barWidth + barSpacing);
    const y = 320 - height;
    return `<g>
      <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" fill="url(#grad)" rx="4" />
      <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="bold">${count}</text>
      <text x="${x + barWidth / 2}" y="340" text-anchor="middle" fill="#94a3b8" font-size="14">${escapeXML(topic)}</text>
    </g>`;
  }).join('');
  const headlines = topHeadlines.map((h, i) => `<tspan x="50" dy="24">${i + 1}. ${escapeXML(h.length > 80 ? h.substring(0, 77) + '...' : h)}</tspan>`).join('');
  return `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" font-family="Inter, sans-serif">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
      </linearGradient>
    </defs>
    <style>
      .title { font-size: 28px; font-weight: bold; fill: #f1f5f9; }
      .subtitle { font-size: 16px; fill: #94a3b8; }
      .header { font-size: 20px; font-weight: 600; fill: #cbd5e1; }
      .headline-text { font-size: 15px; fill: #e2e8f0; }
    </style>
    <rect width="100%" height="100%" fill="#0f172a" />
    <rect width="798" height="598" x="1" y="1" fill="none" stroke="#334155" rx="8" />
    <text x="400" y="50" text-anchor="middle" class="title">Lehigh Valley Intelligence Summary</text>
    <text x="400" y="80" text-anchor="middle" class="subtitle">Source: ${escapeXML(source)} | Period: Last ${escapeXML(period)}</text>
    <line x1="40" y1="110" x2="760" y2="110" stroke="#334155" />
    <text x="50" y="150" class="header">Top Topics</text>
    <g>${bars}</g>
    <line x1="40" y1="370" x2="760" y2="370" stroke="#334155" />
    <text x="50" y="410" class="header">Recent Headlines</text>
    <text x="50" y="440" class="headline-text">${headlines}</text>
  </svg>`;
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
  app.use('/infographic.svg', async (c, next) => {
    const cache = (caches as any).default;
    const response = await cache.match(c.req.raw);
    if (response) return response;
    await next();
    if (c.res.ok) {
      const resClone = c.res.clone();
      resClone.headers.set('Cache-Control', 's-maxage=3600'); // 1 hour cache
      c.executionCtx.waitUntil(cache.put(c.req.raw, resClone));
    }
  });
  // Ensure seed data is present on first load
  app.use('/api/*', async (c, next) => {
    await FeedEntity.ensureSeed(c.env);
    await CoordinatorEntity.ensureSeed(c.env);
    await DurabilityIndexEntity.ensureSeed(c.env);
    await VectorIndexCoordinatorEntity.ensureSeed(c.env);
    await BM25IndexEntity.ensureSeed(c.env);
    await next();
  });
  // --- Infographic Route ---
  app.get('/infographic.svg', async (c) => {
    console.time('gen_infographic');
    try {
      const period = c.req.query('period') || '7d';
      const source = c.req.query('source') || 'news';
      const days = parseInt(period.replace('d', '')) || 7;
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      const urls = RSS_SOURCES[source] || RSS_SOURCES['news'];
      const responses = await Promise.all(urls.map(url => fetch(url, { headers: { 'User-Agent': 'ValleyScope-Infographic-Bot/1.0' } })));
      const seenHashes = new Set<string>();
      const allItems: { title: string; pubDate: number }[] = [];
      for (const response of responses) {
        if (!response.ok) continue;
        const xml = await response.text();
        const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        for (const item of items) {
          const titleMatch = item[1].match(/<title><!\[CDATA\[(.*?)\]\]>|<\/title>/) || item[1].match(/<title>(.*?)<\/title>/);
          const dateMatch = item[1].match(/<pubDate>(.*?)<\/pubDate>/);
          if (titleMatch?.[1] && dateMatch?.[1]) {
            const pubDate = new Date(dateMatch[1]).getTime();
            if (pubDate > since) {
              const title = titleMatch[1].trim();
              const encoder = new TextEncoder();
              const data = encoder.encode(title);
              const hashBuffer = await crypto.subtle.digest('SHA-256', data);
              const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
              if (!seenHashes.has(hash)) {
                seenHashes.add(hash);
                allItems.push({ title, pubDate });
              }
            }
          }
        }
      }
      const sortedItems = allItems.sort((a, b) => b.pubDate - a.pubDate);
      const topicCounts: Record<string, number> = {};
      const sentiment = { positive: 0, negative: 0 };
      for (const { title } of sortedItems) {
        const tokens = title.toLowerCase().split(/\W+/).filter(t => t.length > 2 && !STOPWORDS.has(t));
        for (const token of tokens) {
          for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
            if (keywords.includes(token)) {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
          }
          if (SENTIMENT_WORDS.positive.has(token)) sentiment.positive++;
          if (SENTIMENT_WORDS.negative.has(token)) sentiment.negative++;
        }
      }
      const topHeadlines = sortedItems.slice(0, 3).map(item => item.title);
      const svg = generateInfographicSVG({ topicCounts, sentiment, topHeadlines, period, source });
      console.timeEnd('gen_infographic');
      console.log(`Generated infographic: ${allItems.length} items processed.`);
      return c.body(svg, 200, { 'Content-Type': 'image/svg+xml' });
    } catch (e: any) {
      console.error('Infographic generation failed:', e.message);
      console.timeEnd('gen_infographic');
      return c.body(generateErrorSVG(e.message), 500, { 'Content-Type': 'image/svg+xml' });
    }
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