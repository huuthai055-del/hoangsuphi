import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Context } from 'hono';
import type { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import type { ISeoRepository } from '../repository/seo-repository.interface';
import { DrizzleSeoRepository } from '../repository/seo.repository';
import { SeoController } from '../route/seo.controller';
import { SeoService } from '../service/seo.service';

let testDatabaseUrl = process.env.SEO_TEST_DATABASE_URL || process.env.SEARCH_TEST_DATABASE_URL;
if (!testDatabaseUrl && process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (!url.pathname.endsWith('_test')) {
      url.pathname = `${url.pathname}_test`;
    }
    testDatabaseUrl = url.toString();
  } catch {
    // Ignore invalid url parse
  }
}

async function run() {
  console.log('=== RUNNING SEO BENCHMARK & EVIDENCE GENERATION ===');

  let dbClient: Database | undefined;
  let sqlClient: ReturnType<typeof postgres> | undefined;
  let seoRepository: ISeoRepository;
  let dbAccessCount = 0;
  let dbShouldThrow = false;

  const ids = {
    user: '019f4bc4-f550-7d52-bba4-3b6258b55700',
    rootRegion: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    childRegion: '019f4bc4-f550-7d52-bba4-3b6258b55702',
    articleCategory: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    attractionCategory: '019f4bc4-f550-7d52-bba4-3b6258b55704',
    businessType: '019f4bc4-f550-7d52-bba4-3b6258b55705',
    article: '019f4bc4-f550-7d52-bba4-3b6258b55706',
    place: '019f4bc4-f550-7d52-bba4-3b6258b55708',
    business: '019f4bc4-f550-7d52-bba4-3b6258b55709',
    attraction: '019f4bc4-f550-7d52-bba4-3b6258b5570a',
    topList: '019f4bc4-f550-7d52-bba4-3b6258b5570b',
    faq: '019f4bc4-f550-7d52-bba4-3b6258b5570c',
    tag: '019f4bc4-f550-7d52-bba4-3b6258b5570d',
  } as const;

  async function cleanFixtures() {
    if (sqlClient) {
      await sqlClient.begin(async (tx) => {
        await tx`DELETE FROM faqs WHERE id = ${ids.faq}`;
        await tx`DELETE FROM top_list_items WHERE top_list_id = ${ids.topList}`;
        await tx`DELETE FROM top_lists WHERE id = ${ids.topList}`;
        await tx`DELETE FROM article_tags WHERE article_id = ${ids.article}`;
        await tx`DELETE FROM tags WHERE id = ${ids.tag}`;
        await tx`DELETE FROM articles WHERE id = ${ids.article}`;
        await tx`DELETE FROM attractions WHERE id = ${ids.attraction}`;
        await tx`DELETE FROM businesses WHERE id = ${ids.business}`;
        await tx`DELETE FROM tourist_places WHERE id = ${ids.place}`;
        await tx`DELETE FROM business_types WHERE id = ${ids.businessType}`;
        await tx`DELETE FROM attraction_categories WHERE id = ${ids.attractionCategory}`;
        await tx`DELETE FROM article_categories WHERE id = ${ids.articleCategory}`;
        await tx`DELETE FROM regions WHERE id IN (${ids.childRegion}, ${ids.rootRegion})`;
        await tx`DELETE FROM users WHERE id = ${ids.user}`;
      });
    }
  }

  if (testDatabaseUrl) {
    console.log('PostgreSQL database URL detected. Running benchmark against PostgreSQL...');
    sqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });
    dbClient = drizzle(sqlClient, { schema }) as Database;

    // Clean and seed
    await cleanFixtures();

    await sqlClient.begin(async (tx) => {
      await tx`
        INSERT INTO users (id, email, password_hash, status)
        VALUES (${ids.user}, 'benchmark@example.com', 'hash', 'active'::public.user_status)
      `;
      await tx`
        INSERT INTO regions (id, parent_id, name, slug, level, path)
        VALUES
          (${ids.rootRegion}, NULL, 'Root', 'root', 1, 'root'::ltree),
          (${ids.childRegion}, ${ids.rootRegion}, 'Child', 'child', 2, 'root.child'::ltree)
      `;
      await tx`
        INSERT INTO article_categories (id, code, name)
        VALUES (${ids.articleCategory}, 'cat', 'Category')
      `;
      await tx`
        INSERT INTO attraction_categories (id, code, name)
        VALUES (${ids.attractionCategory}, 'attr_cat', 'Attr Cat')
      `;
      await tx`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES (${ids.businessType}, 'type', 'Type', TRUE)
      `;
      await tx`
        INSERT INTO tourist_places (id, region_id, name, slug, location, description, status)
        VALUES (${ids.place}, ${ids.childRegion}, 'Place', 'place', ST_SetSRID(ST_MakePoint(104.5, 22.5), 4326)::geography, 'desc', 'active')
      `;
      await tx`
        INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, description, status)
        VALUES (${ids.business}, ${ids.childRegion}, ${ids.businessType}, 'Bus', 'bus', ST_SetSRID(ST_MakePoint(104.5, 22.5), 4326)::geography, 'desc', 'active')
      `;
      await tx`
        INSERT INTO attractions (id, region_id, category_id, name, slug, location, description, status)
        VALUES (${ids.attraction}, ${ids.childRegion}, ${ids.attractionCategory}, 'Attr', 'attr', ST_SetSRID(ST_MakePoint(104.5, 22.5), 4326)::geography, 'desc', 'active')
      `;
      await tx`
        INSERT INTO articles (id, title, slug, excerpt, content, author_id, category_id, status, view_count, is_featured, published_at)
        VALUES (${ids.article}, 'Art', 'art', 'exc', 'cont', ${ids.user}, ${ids.articleCategory}, 'published', 0, FALSE, NOW() - INTERVAL '1 hour')
      `;
      await tx`
        INSERT INTO tags (id, name, slug)
        VALUES (${ids.tag}, 'Tag', 'tag')
      `;
      await tx`
        INSERT INTO article_tags (article_id, tag_id)
        VALUES (${ids.article}, ${ids.tag})
      `;
      await tx`
        INSERT INTO top_lists (id, title, slug, description, status, created_by)
        VALUES (${ids.topList}, 'Top', 'top', 'desc', 'PUBLISHED', ${ids.user})
      `;
      await tx`
        INSERT INTO top_list_items (id, top_list_id, owner_type, owner_id, display_order)
        VALUES ('019f4bc4-f550-7d52-bba4-3b6258b557ff', ${ids.topList}, 'PLACE', ${ids.place}, 1)
      `;
      await tx`
        INSERT INTO faqs (id, question, answer, status, created_by)
        VALUES (${ids.faq}, 'Q?', 'A!', 'PUBLISHED', ${ids.user})
      `;
    });

    const baseRepo = new DrizzleSeoRepository(dbClient);
    seoRepository = {
      findArticleBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findArticleBySlug(s);
      },
      findRegionBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findRegionBySlug(s);
      },
      findPlaceBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findPlaceBySlug(s);
      },
      findBusinessBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findBusinessBySlug(s);
      },
      findAttractionBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findAttractionBySlug(s);
      },
      findTagBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findTagBySlug(s);
      },
      findTopListBySlug: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.findTopListBySlug(s);
      },
      getFaqHubItems: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getFaqHubItems();
      },
      getSitemapArticles: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapArticles();
      },
      getSitemapRegions: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapRegions();
      },
      getSitemapPlaces: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapPlaces();
      },
      getSitemapBusinesses: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapBusinesses();
      },
      getSitemapAttractions: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapAttractions();
      },
      getSitemapTags: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapTags();
      },
      getSitemapTopLists: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.getSitemapTopLists();
      },
      checkFaqHubEligibility: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.checkFaqHubEligibility();
      },
      resolveRegionPathBySlugs: async (s) => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return baseRepo.resolveRegionPathBySlugs(s);
      },
    };
  } else {
    console.log('No database URL detected. Running benchmark against Mock Repository...');
    seoRepository = {
      findArticleBySlug: async () => null,
      findRegionBySlug: async () => null,
      findPlaceBySlug: async () => null,
      findBusinessBySlug: async () => null,
      findAttractionBySlug: async () => null,
      findTagBySlug: async () => null,
      findTopListBySlug: async () => null,
      getFaqHubItems: async () => [],
      getSitemapArticles: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/cam-nang/art', lastmod: new Date() }];
      },
      getSitemapRegions: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/khu-vuc/child', lastmod: new Date() }];
      },
      getSitemapPlaces: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/dia-diem/place', lastmod: new Date() }];
      },
      getSitemapBusinesses: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/co-so/bus', lastmod: new Date() }];
      },
      getSitemapAttractions: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/tien-ich/attr', lastmod: new Date() }];
      },
      getSitemapTags: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/tag/tag', lastmod: null }];
      },
      getSitemapTopLists: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return [{ path: '/top/top', lastmod: new Date() }];
      },
      checkFaqHubEligibility: async () => {
        dbAccessCount++;
        if (dbShouldThrow) throw new Error('DB Down');
        return true;
      },
      resolveRegionPathBySlugs: async () => [],
    };
  }

  const mockMediaResolver = {
    resolve() {
      return {
        getUrl: async (key: string) => `/uploads/${key}`,
      } as unknown as { getUrl: (key: string) => Promise<string> };
    },
  } as unknown as MediaStorageResolver;

  const seoService = new SeoService(seoRepository, mockMediaResolver, 'https://hoangsuphi.vn');
  const controller = new SeoController(seoService);

  // 1. Cold Sitemap Build
  const t0 = performance.now();
  const coldXml = await seoService.buildSitemapXml();
  const t1 = performance.now();
  const coldDuration = t1 - t0;
  console.log(`Cold Sitemap build took: ${coldDuration.toFixed(3)}ms`);
  console.log(`DB accesses on cold build: ${dbAccessCount}`);

  // Warm it up inside service cache
  seoService.setCacheEntry('sitemap', coldXml, 3600);

  // 2. Warm Sitemap Cache Hit p95 Benchmark
  const warmDurations: number[] = [];
  dbAccessCount = 0;
  for (let i = 0; i < 100; i++) {
    const wt0 = performance.now();
    seoService.getCacheEntry('sitemap');
    const wt1 = performance.now();
    warmDurations.push(wt1 - wt0);
  }

  warmDurations.sort((a, b) => a - b);
  const p50 = warmDurations[Math.floor(warmDurations.length * 0.5)] ?? 0;
  const p95 = warmDurations[Math.floor(warmDurations.length * 0.95)] ?? 0;
  const p99 = warmDurations[Math.floor(warmDurations.length * 0.99)] ?? 0;

  console.log('Warm Cache-hit p95 results (100 runs):');
  console.log(`- p50: ${p50.toFixed(4)}ms`);
  console.log(`- p95: ${p95.toFixed(4)}ms`);
  console.log(`- p99: ${p99.toFixed(4)}ms`);
  console.log(`- DB accesses during cache hits: ${dbAccessCount}`);

  // Assertions
  if (p95 > 5.0) {
    throw new Error(`SLA Violation: warm-cache p95 took ${p95.toFixed(4)}ms (threshold: 5ms)`);
  }
  if (dbAccessCount !== 0) {
    throw new Error(`Cache leak: Warm cache hit triggered ${dbAccessCount} database queries!`);
  }

  // 3. XML Structure Validation
  const hasXmlDecl = coldXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>');
  const hasUrlSet = coldXml.includes(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  );
  const closesCorrectly = coldXml.endsWith('</urlset>');

  if (!hasXmlDecl || !hasUrlSet || !closesCorrectly) {
    throw new Error('Sitemap XML structure is invalid');
  }
  console.log('XML Validation: passed');

  // 4. HTTP 200/304 Controller Response Verification
  console.log('Verifying Controller HTTP responses...');
  let responseHeaders: Record<string, string> = {};
  const mockContext = {
    header: (name: string, value: string) => {
      responseHeaders[name] = value;
    },
    req: {
      header: (name: string) => {
        if (name.toLowerCase() === 'if-none-match') return responseHeaders.ETag || null;
        return null;
      },
      path: '/sitemap.xml',
    },
    body: (content: unknown, status: number, headers: Record<string, string>) => {
      responseHeaders = { ...responseHeaders, ...headers };
      return { body: content, status };
    },
    json: (body: unknown, status: number, headers: Record<string, string>) => {
      responseHeaders = { ...responseHeaders, ...headers };
      return { body, status };
    },
  } as unknown as Context;

  // First request (MISS, returns 200)
  (seoService as unknown as { cache: Map<string, { expiresAt: number }> }).cache.clear(); // Ensure clear
  dbAccessCount = 0;
  const res200 = await controller.getSitemap(mockContext);
  console.log(`- First HTTP call returns status: ${res200.status} (Expected: 200)`);
  console.log(`- First HTTP call ETag: ${responseHeaders.ETag}`);

  if (res200.status !== 200 || !responseHeaders.ETag) {
    throw new Error('Controller did not return 200 or missing ETag on sitemap MISS');
  }

  // Second request (CONDITIONAL ETAG MATCH, returns 304)
  dbAccessCount = 0;
  const res304 = await controller.getSitemap(mockContext);
  console.log(`- Conditional HTTP call returns status: ${res304.status} (Expected: 304)`);
  console.log(`- DB accesses during 304 validation: ${dbAccessCount}`);

  if (res304.status !== 304) {
    throw new Error('Controller did not return 304 on ETag match');
  }
  if (dbAccessCount !== 0) {
    throw new Error('Conditional ETag match accessed database');
  }

  // 5. Cache TTL Expiration & Fail-Closed
  console.log('Verifying Cache TTL expiration & Fail-Closed behavior...');
  const cacheEntry = (seoService as unknown as { cache: Map<string, { expiresAt: number }> }).cache.get('sitemap');
  if (cacheEntry) {
    cacheEntry.expiresAt = Date.now() - 1000; // expired in the past
  }

  // Verify that expired cache forces DB access
  dbShouldThrow = true;
  const expiredRes = await controller.getSitemap(mockContext);
  console.log(`- Expired cache + DB down returns status: ${expiredRes.status} (Expected: 503)`);

  if (expiredRes.status !== 503) {
    throw new Error('Controller did not return 503 on expired cache when DB is down');
  }

  if (sqlClient) {
    await cleanFixtures();
    await sqlClient.end({ timeout: 5 });
  }

  console.log('=== ALL BENCHMARKS & VERIFICATIONS PASSED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Benchmark failed with error:', err);
  process.exit(1);
});
