/**
 * Cross-crawl Integration Audit — Step 4.4.3
 *
 * Requirements:
 * 1. Fetch full sitemap from the mock backend (which Next.js proxies)
 * 2. Parse all URLs
 * 3. Make real SSR request to Next.js for each URL
 * 4. Verify HTTP 200, exact Canonical URL match, specific OG and JSON-LD schema per page group
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'bun';

const MOCK_BACKEND_PORT = 3006;
const NEXT_PORT = 4106;
const NEXT_BASE = `http://localhost:${NEXT_PORT}`;
const MOCK_BASE = `http://localhost:${MOCK_BACKEND_PORT}`;
const CANONICAL_BASE = process.env.PUBLIC_SITE_URL ?? 'http://127.0.0.1:3001';

// The URLs our mock sitemap will contain, along with expected kind
const mockData = [
  { path: '/', expectedKind: 'website' },
  { path: '/cam-nang', expectedKind: 'collection-page' },
  { path: '/cam-nang/du-lich-hoang-su-phi', expectedKind: 'blog-posting' },
  { path: '/khu-vuc/ban-luoc', expectedKind: 'administrative-area' },
  { path: '/dia-diem/ruong-bac-thang-ban-luoc', expectedKind: 'tourist-attraction' },
  { path: '/co-so/homestay-a-pao', expectedKind: 'local-business' },
  { path: '/tien-ich/diem-do-xe-ban-luoc', expectedKind: 'tourist-attraction' },
  { path: '/tag/kham-pha', expectedKind: 'collection-page' },
  { path: '/top/top-10-homestay', expectedKind: 'item-list' },
  { path: '/hoi-dap', expectedKind: 'faq-page' }
];

let mockBackend: Server<undefined>;
let nextProcess: ReturnType<typeof Bun.spawn> | undefined;

beforeAll(async () => {
  mockBackend = Bun.serve({
    port: MOCK_BACKEND_PORT,
    reusePort: true,
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/sitemap.xml') {
        const urlset = mockData.map(u => {
          const locPath = u.path === '/' ? '' : u.path;
          return `<url><loc>${CANONICAL_BASE}${locPath}</loc></url>`;
        }).join('');
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}</urlset>`,
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        );
      }

      if (url.pathname.startsWith('/api/v1/seo/pages/')) {
        let kind = 'administrative-area';
        let canonicalPath = '/';

        if (url.pathname.includes('/article/')) { kind = 'blog-posting'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/article', '/cam-nang'); }
        else if (url.pathname.includes('/article')) { kind = 'collection-page'; canonicalPath = '/cam-nang'; }
        else if (url.pathname.includes('/business/')) { kind = 'local-business'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/business', '/co-so'); }
        else if (url.pathname.includes('/region/')) { kind = 'administrative-area'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/region', '/khu-vuc'); }
        else if (url.pathname.includes('/place/')) { kind = 'tourist-attraction'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/place', '/dia-diem'); }
        else if (url.pathname.includes('/attraction/')) { kind = 'tourist-attraction'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/attraction', '/tien-ich'); }
        else if (url.pathname.includes('/tag/')) { kind = 'collection-page'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/tag', '/tag'); }
        else if (url.pathname.includes('/top-list/')) { kind = 'item-list'; canonicalPath = url.pathname.replace('/api/v1/seo/pages/top-list', '/top'); }
        else if (url.pathname.includes('/faq-hub')) { kind = 'faq-page'; canonicalPath = '/hoi-dap'; }

        return new Response(JSON.stringify({
          data: {
            canonicalPath: canonicalPath,
            robots: 'index,follow',
            title: `Mock Title for ${kind}`,
            description: `Mock Desc for ${kind}`,
            image: { url: 'https://cdn.hoangsuphi.vn/cover.jpg', alt: 'Alt', width: 1200, height: 630, mimeType: 'image/jpeg' },
            breadcrumbs: [{ name: 'Home', path: '/' }],
            schema: {
              kind: kind,
              idPath: canonicalPath,
              name: `Mock Entity ${kind}`,
              description: `Mock Entity Desc ${kind}`,
              headline: `Headline ${kind}`, // for blog-posting
              datePublished: '2024-01-01T00:00:00Z',
              dateModified: '2024-01-01T00:00:00Z',
              author: { kind: 'person', name: 'Author' },
              address: { addressLocality: 'Locality', addressRegion: 'Region', addressCountry: 'VN' }, // for local-business
              items: [], // for item-list
              questions: [] // for faq-page
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not Found', { status: 404 });
    },
  });

  nextProcess = Bun.spawn(
    [
      process.platform === 'win32' ? 'node.exe' : 'node',
      'node_modules/next/dist/bin/next',
      'start',
      '-p',
      NEXT_PORT.toString(),
    ],
    {
      env: { ...process.env, PUBLIC_SITE_URL: CANONICAL_BASE, INTERNAL_BACKEND_URL: MOCK_BASE },
      stdio: ['ignore', 'ignore', 'ignore'],
    }
  );

  let ready = false;
  let attempts = 0;
  while (!ready && attempts < 60) {
    try {
      const ping = await fetch(NEXT_BASE);
      if (ping.ok || ping.status === 404) ready = true;
    } catch {
      // ignore
    }
    await Bun.sleep(500);
    attempts++;
  }
  if (!ready) throw new Error('Next.js did not start');
}, 30000);

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

describe('Sitemap Cross-Crawl Audit', () => {
  it('Should exact-match Canonical URLs, OG tags, and JSON-LD for each page', async () => {
    // 1. Fetch sitemap
    const sitemapRes = await fetch(`${NEXT_BASE}/sitemap.xml`);
    expect(sitemapRes.status).toBe(200);
    const sitemapText = await sitemapRes.text();

    // 2. Parse URLs from sitemap
    const urlsToCrawl: { original: string; fetchUrl: string; expectedPath: string }[] = [];
    const regex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = regex.exec(sitemapText)) !== null) {
      const original = match[1];
      const fetchUrl = original.replace(CANONICAL_BASE, NEXT_BASE);
      const expectedPath = original.replace(CANONICAL_BASE, '');
      urlsToCrawl.push({ original, fetchUrl, expectedPath });
    }

    expect(urlsToCrawl.length).toBe(mockData.length);

    // 3. Crawl each URL
    for (const u of urlsToCrawl) {
      const pageRes = await fetch(u.fetchUrl);
      expect(pageRes.status).toBe(200);

      const html = await pageRes.text();

      // Basic checks for all pages
      expect(html).toContain('<html');

      // Check canonical exact-match with sitemap <loc>
      expect(html).toContain(`<link rel="canonical" href="${u.original}"/>`);

      // Check og:url exact-match with sitemap <loc>
      expect(html).toContain(`<meta property="og:url" content="${u.original}"/>`);

      // Find the expected kind for this path
      const expectedKindItem = mockData.find(m => m.path === (u.expectedPath || '/'));
      expect(expectedKindItem).toBeDefined();
      const kind = expectedKindItem!.expectedKind;

      // Map 'kind' to schema.org type to check JSON-LD
      let expectedSchemaType = '';
      if (kind === 'website') expectedSchemaType = '"@type":"WebSite"';
      if (kind === 'collection-page') {
        if (u.expectedPath === '/cam-nang') expectedSchemaType = '"@type":"Blog"';
        else expectedSchemaType = '"@type":"CollectionPage"';
      }
      if (kind === 'blog-posting') expectedSchemaType = '"@type":"BlogPosting"';
      if (kind === 'administrative-area') expectedSchemaType = '"@type":"AdministrativeArea"';
      if (kind === 'tourist-attraction') expectedSchemaType = '"@type":"TouristAttraction"';
      if (kind === 'local-business') expectedSchemaType = '"@type":"LocalBusiness"';
      if (kind === 'item-list') expectedSchemaType = '"@type":"ItemList"';
      if (kind === 'faq-page') expectedSchemaType = '"@type":"FAQPage"';

      if (expectedSchemaType) {
        // Assert JSON-LD schema type is rendered
        expect(html).toContain(expectedSchemaType);
      }

      // Verify no leaked errors
      expect(html).not.toContain('Error:');
    }
  }, 60000);
});
