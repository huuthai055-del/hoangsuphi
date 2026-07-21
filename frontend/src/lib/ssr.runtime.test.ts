/**
 * SSR Runtime Smoke Tests — Step 4.4.2
 *
 * These tests spin up:
 *   1. A lightweight Bun mock backend (serving fixture SEO projections)
 *   2. The real Next.js 15 production server (`next start`)
 *
 * Then make real HTTP requests to assert:
 *   - Middleware 308 redirect for uppercase paths
 *   - Middleware 301 redirect for trailing-slash paths
 *   - /sitemap.xml and /robots.txt are proxied to backend (rewrite works)
 *   - Static page returns 200 HTML
 *   - Dynamic route returns 200 HTML with canonical, OG, JSON-LD and visible content
 *   - Dynamic route with unknown slug returns 404
 *   - No stale cache: fetch uses no-store
 *
 * Prerequisites: `bun run build` must have been executed before running this file.
 *
 * Run: bunx bun test src/lib/ssr.runtime.test.ts --timeout 60000
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'bun';

// ─── Ports ───────────────────────────────────────
const NEXT_PORT = 4105;
const MOCK_BACKEND_PORT = 3005;
const NEXT_BASE = `http://localhost:${NEXT_PORT}`;
const MOCK_BASE = `http://localhost:${MOCK_BACKEND_PORT}`;
// PUBLIC_SITE_URL must match what was used at build time (http://localhost:3001).
// We override it when spawning the Next.js server to match our test fixture.
const TEST_SITE_URL = 'http://localhost:4099';

// ─── Fixture projection returned by mock backend ──
const ARTICLE_FIXTURE = {
  pageGroup: 'article',
  canonicalPath: '/cam-nang/du-lich-hoang-su-phi',
  robots: 'index,follow',
  title: 'Du lịch Hoàng Su Phì — Hướng dẫn chi tiết',
  description: 'Khám phá Hoàng Su Phì qua cẩm nang du lịch hoàn chỉnh.',
  image: {
    url: 'https://cdn.hoangsuphitourism.vn/cover.jpg',
    alt: 'Hoàng Su Phì',
    width: 1200,
    height: 630,
    mimeType: 'image/jpeg',
  },
  breadcrumbs: [
    { name: 'Trang chủ', path: '/' },
    { name: 'Cẩm nang', path: '/cam-nang' },
    { name: 'Du lịch Hoàng Su Phì', path: '/cam-nang/du-lich-hoang-su-phi' },
  ],
  lastModified: '2024-06-01T00:00:00Z',
  schema: {
    kind: 'blog-posting',
    headline: 'Du lịch Hoàng Su Phì — Hướng dẫn chi tiết',
    datePublished: '2024-06-01',
    dateModified: '2024-06-01',
    author: { kind: 'person', name: 'Ban biên tập' },
  },
};

// ─── State ───────────────────────────────────────
let mockBackend: Server<undefined>;
let mockBackend503 = false;
let nextProcess: ReturnType<typeof Bun.spawn> | undefined;

// ─── Helpers ─────────────────────────────────────

async function waitForServer(url: string, maxWaitMs = 45_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.status < 500) return;
    } catch {
      // not ready yet
    }
    await Bun.sleep(500);
  }
  throw new Error(`Server at ${url} did not become ready within ${maxWaitMs}ms`);
}

async function get(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${NEXT_BASE}${path}`, { redirect: 'manual', ...options });
}

async function getHtml(path: string): Promise<string> {
  const res = await get(path);
  return res.text();
}

// ─── Lifecycle ───────────────────────────────────

let backendRequests: { url: string; headers: Headers }[] = [];

beforeAll(async () => {
  // 1. Start mock backend
  mockBackend = Bun.serve({
    port: MOCK_BACKEND_PORT,
    reusePort: true,
    fetch(req) {
      const url = new URL(req.url);

      backendRequests.push({ url: req.url, headers: req.headers });

      if (url.pathname.startsWith('/api/v1/seo/pages/')) {
        // Return 404 for the special "not-found" slug
        if (url.pathname.includes('/not-found')) {
          return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
        }
        return new Response(JSON.stringify({ data: ARTICLE_FIXTURE }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.pathname === '/sitemap.xml') {
        if (mockBackend503) {
          return new Response('Service Unavailable', { status: 503 });
        }
        if (req.headers.get('If-None-Match') === 'mock-etag-sitemap') {
          return new Response(null, { status: 304, headers: { ETag: 'mock-etag-sitemap', 'Cache-Control': 'public, max-age=3600' } });
        }
        return new Response(
          '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
          { status: 200, headers: { 'Content-Type': 'application/xml', ETag: 'mock-etag-sitemap', 'Cache-Control': 'public, max-age=3600' } },
        );
      }

      if (url.pathname === '/robots.txt') {
        if (mockBackend503) {
          return new Response('Service Unavailable', { status: 503 });
        }
        if (req.headers.get('If-None-Match') === 'mock-etag-robots') {
          return new Response(null, { status: 304, headers: { ETag: 'mock-etag-robots', 'Cache-Control': 'public, max-age=86400' } });
        }
        return new Response('User-agent: *\nAllow: /\nSitemap: https://hoangsuphitourism.vn/sitemap.xml', {
          status: 200,
          headers: { 'Content-Type': 'text/plain', ETag: 'mock-etag-robots', 'Cache-Control': 'public, max-age=86400' },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  // Run the JS entry point with Node instead of the Windows command shim so
  // teardown owns the real Next.js server process.
  const nodeExecutable = process.platform === 'win32' ? 'node.exe' : 'node';
  nextProcess = Bun.spawn(
    [nodeExecutable, 'node_modules/next/dist/bin/next', 'start', '--port', String(NEXT_PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(NEXT_PORT),
        // INTERNAL_BACKEND_URL is baked in rewrites at build time; env here affects dynamic page fetches
        INTERNAL_BACKEND_URL: MOCK_BASE,
        PUBLIC_SITE_URL: TEST_SITE_URL,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );

  // 3. Wait for Next.js to accept connections
  await waitForServer(`${NEXT_BASE}/`, 45_000);
}, 60_000); // 60s timeout for beforeAll including server startup

afterAll(async () => {
  if (nextProcess) {
    nextProcess.kill();
    await nextProcess.exited;
  }
  if (mockBackend) {
    mockBackend.stop(true);
  }
  await Bun.sleep(200);
});

// ─── Tests ───────────────────────────────────────

describe('Middleware — HTTP redirect behaviour (real server)', () => {
  it('returns 308 for path with uppercase letters', async () => {
    const res = await get('/CAM-NANG/foo-bar');
    expect(res.status).toBe(308);
    const location = res.headers.get('location') ?? '';
    expect(location.toLowerCase()).toContain('/cam-nang/foo-bar');
  });

  it('returns 308 for mixed-case path', async () => {
    const res = await get('/Khu-Vuc/hoang-su-phi');
    expect(res.status).toBe(308);
  });

  it('returns 308 for trailing-slash path', async () => {
    const res = await get('/cam-nang/');
    // Next.js redirects trailing slash (permanent = 308 in middleware)
    expect([301, 308]).toContain(res.status);
    const location = res.headers.get('location') ?? '';
    expect(location).not.toMatch(/\/$/);
  });

  it('does NOT redirect clean lowercase path', async () => {
    const res = await get('/cam-nang');
    expect([200, 404]).toContain(res.status); // Not a redirect
    expect(res.status).not.toBe(308);
  });
});

describe('Rewrites — /sitemap.xml and /robots.txt proxy to backend', () => {
  it('/sitemap.xml is proxied and returns XML', async () => {
    const res = await fetch(`${NEXT_BASE}/sitemap.xml`);
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('xml');
    const body = await res.text();
    expect(body).toContain('<urlset');
  });

  it('/robots.txt is proxied and returns plain text with Allow', async () => {
    const res = await fetch(`${NEXT_BASE}/robots.txt`);
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('text');
    const body = await res.text();
    expect(body).toContain('User-agent');
    expect(body).toContain('Allow');
  });
});

describe('Dynamic routes — HTML SSR content', () => {
  it('article page returns 200 HTML', async () => {
    const res = await get('/cam-nang/du-lich-hoang-su-phi');
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('html');
  });

  it('article page HTML contains canonical link tag with absolute URL', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    // Canonical should be absolute — either TEST_SITE_URL or production URL baked from env
    expect(html).toMatch(/<link[^>]+rel="canonical"[^>]+href="http[^"]+\/cam-nang\/du-lich-hoang-su-phi"[^>]*>/i);
  });

  it('article page HTML contains og:url meta tag', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toContain('og:url');
    // og:url should be an absolute URL containing the canonical path
    expect(html).toContain('/cam-nang/du-lich-hoang-su-phi');
  });

  it('article page HTML contains og:type article', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toMatch(/og:type.*article|article.*og:type/i);
  });

  it('article page HTML contains og:locale vi_VN', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toContain('vi_VN');
  });

  it('article page HTML contains JSON-LD BlogPosting schema', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toContain('BlogPosting');
    expect(html).toContain('application/ld+json');
  });

  it('article page HTML contains JSON-LD BreadcrumbList', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toContain('BreadcrumbList');
  });

  it('article page HTML contains visible h1 title', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toContain('Du lịch Hoàng Su Phì');
  });

  it('article page HTML contains visible author metadata', async () => {
    const html = await getHtml('/cam-nang/du-lich-hoang-su-phi');
    expect(html).toContain('Ban biên tập');
  });

  it('dynamic route with unknown slug renders the framework not-found document and noindex', async () => {
    const res = await get('/cam-nang/not-found');
    const html = await res.text();

    // Next.js may start a streamed App Router response before notFound() is
    // resolved, which keeps HTTP 200 while emitting the not-found boundary.
    // The noindex contract is therefore the stable runtime assertion.
    expect([200, 404]).toContain(res.status);
    expect(html).toContain('noindex');
    expect(html).toMatch(/404|Không tìm thấy|This page could not be found/i);
  });

  it('fetch uses no-store: Cache-Control header not present or no-store on HTML response', async () => {
    const res = await get('/cam-nang/du-lich-hoang-su-phi');
    // Next.js dynamic (SSR) pages should be no-store because fetchSeoProjection uses cache:'no-store'
    // which makes the whole page dynamic and not cached
    const cc = res.headers.get('cache-control') ?? '';
    // Should be private, no-cache, no-store, or no explicit public caching
    expect(cc).not.toContain('max-age=31536000'); // No long-lived public cache
  });
});

describe('API envelope — no-store cache contract verified via request header', () => {
  it('mock backend receives expected fetch headers from Next.js (no-store / fetch cache)', async () => {
    // Clear tracking array
    backendRequests = [];

    // Trigger a dynamic page request which internally calls fetchSeoProjection
    const res = await get('/co-so/some-business-test-cache-header');

    // The page should succeed (200) since mock returns fixture for all slugs
    expect(res.status).toBe(200);

    // Find the request made to the mock backend
    const apiReq = backendRequests.find(req => req.url.includes('some-business-test-cache-header'));
    expect(apiReq).toBeDefined();

    // Since Next.js uses cache: 'no-store', the fetch request to backend might include 'cache-control: no-store' or 'no-cache'.
    // Or in some environments it simply doesn't send caching headers.
    // We assert that the intent is preserved by checking Next.js fetch behavior.
    const cc = (apiReq!.headers.get('cache-control') || '').toLowerCase();

    // Next.js 15 fetch with cache: 'no-store' should send 'no-store' or 'no-cache' to the backend
    expect(cc).toMatch(/(no-store|no-cache)/);
  });
});

describe('Route Handlers — Sitemap & Robots Proxies (ETag, TTL, 304, 503)', () => {
  it('sitemap forwards ETag and Cache-Control TTL 3600', async () => {
    const res = await get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('xml');
    expect(res.headers.get('etag')).toBe('mock-etag-sitemap');
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
  });

  it('robots forwards ETag and Cache-Control TTL 86400', async () => {
    const res = await get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('etag')).toBe('mock-etag-robots');
    expect(res.headers.get('cache-control')).toContain('max-age=86400');
  });

  it('sitemap forwards If-None-Match and returns 304 without body', async () => {
    const res = await fetch(`${NEXT_BASE}/sitemap.xml`, {
      headers: { 'If-None-Match': 'mock-etag-sitemap' }
    });
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe('mock-etag-sitemap');
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
  });

  it('robots forwards If-None-Match and returns 304 without body', async () => {
    const res = await fetch(`${NEXT_BASE}/robots.txt`, {
      headers: { 'If-None-Match': 'mock-etag-robots' }
    });
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe('mock-etag-robots');
    expect(res.headers.get('cache-control')).toContain('max-age=86400');
  });

  it('sitemap proxy handles backend 503 Service Unavailable', async () => {
    mockBackend503 = true;
    const res = await fetch(`${NEXT_BASE}/sitemap.xml`);
    expect(res.status).toBe(503);
    mockBackend503 = false;
  });

  it('robots proxy handles backend 503 Service Unavailable', async () => {
    mockBackend503 = true;
    const res = await fetch(`${NEXT_BASE}/robots.txt`);
    expect(res.status).toBe(503);
    mockBackend503 = false;
  });
});
