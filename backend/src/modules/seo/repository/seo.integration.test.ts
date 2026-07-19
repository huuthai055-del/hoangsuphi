import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DrizzleSeoRepository } from './seo.repository';

// ==========================================
// Part 1: Mock-based Query Count Verification
// ==========================================

let selectCount = 0;
const mockDbChain: any = {
  select: mock(() => {
    selectCount++;
    return mockDbChain;
  }),
  from: mock(() => mockDbChain),
  where: mock(() => mockDbChain),
  limit: mock(() => mockDbChain),
  offset: mock(() => mockDbChain),
  orderBy: mock(() => mockDbChain),
  innerJoin: mock(() => mockDbChain),
  leftJoin: mock(() => mockDbChain),
  groupBy: mock(() => mockDbChain),
  returning: mock(() => mockDbChain),
};

Object.defineProperty(mockDbChain, 'then', {
  value: (onFulfilled: any) => {
    return Promise.resolve([]).then(onFulfilled);
  },
  configurable: true,
  writable: true,
});

mock.module('@/lib/database/client', () => {
  return {
    db: mockDbChain,
    dbHealthCheck: async () => Promise.resolve({ status: 'healthy', durationMs: 1 }),
  };
});

describe('SEO Repository Mock Integration & Query Count Tests', () => {
  let repository: DrizzleSeoRepository;

  beforeEach(() => {
    repository = new DrizzleSeoRepository();
    selectCount = 0;
  });

  test('getSitemapArticles query count', async () => {
    const items = await repository.getSitemapArticles();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('getSitemapRegions query count', async () => {
    const items = await repository.getSitemapRegions();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('getSitemapPlaces query count', async () => {
    const items = await repository.getSitemapPlaces();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('getSitemapBusinesses query count', async () => {
    const items = await repository.getSitemapBusinesses();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('getSitemapAttractions query count', async () => {
    const items = await repository.getSitemapAttractions();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('getSitemapTags query count', async () => {
    const items = await repository.getSitemapTags();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('getSitemapTopLists query count', async () => {
    const items = await repository.getSitemapTopLists();
    expect(items).toBeArray();
    expect(selectCount).toBe(1);
  });

  test('checkFaqHubEligibility query count', async () => {
    const ok = await repository.checkFaqHubEligibility();
    expect(ok).toBe(false);
    expect(selectCount).toBe(1);
  });

  test('findArticleBySlug query count', async () => {
    const art = await repository.findArticleBySlug('test-slug');
    expect(art).toBeNull();
    expect(selectCount).toBe(1);
  });

  test('findRegionBySlug query count', async () => {
    const reg = await repository.findRegionBySlug('test-slug');
    expect(reg).toBeNull();
    expect(selectCount).toBe(1);
  });

  test('findPlaceBySlug query count', async () => {
    const plc = await repository.findPlaceBySlug('test-slug');
    expect(plc).toBeNull();
    expect(selectCount).toBe(1);
  });

  test('findBusinessBySlug query count', async () => {
    const bus = await repository.findBusinessBySlug('test-slug');
    expect(bus).toBeNull();
    expect(selectCount).toBe(1);
  });

  test('findAttractionBySlug query count', async () => {
    const att = await repository.findAttractionBySlug('test-slug');
    expect(att).toBeNull();
    expect(selectCount).toBe(1);
  });
});

// ==========================================
// Part 2: PostgreSQL Real DB Integration Tests
// ==========================================

const testDatabaseUrl = process.env.SEO_TEST_DATABASE_URL || process.env.TEST_DATABASE_URL;
const pgDescribe = testDatabaseUrl ? describe : describe.skip;

const ids = {
  user: '019f4bc4-f550-7d52-bba4-3b6258b55700',
  rootRegion: '019f4bc4-f550-7d52-bba4-3b6258b55701',
  childRegion: '019f4bc4-f550-7d52-bba4-3b6258b55702',
  articleCategory: '019f4bc4-f550-7d52-bba4-3b6258b55703',
  attractionCategory: '019f4bc4-f550-7d52-bba4-3b6258b55704',
  businessType: '019f4bc4-f550-7d52-bba4-3b6258b55705',
  article: '019f4bc4-f550-7d52-bba4-3b6258b55706',
  draftArticle: '019f4bc4-f550-7d52-bba4-3b6258b55707',
  place: '019f4bc4-f550-7d52-bba4-3b6258b55708',
  business: '019f4bc4-f550-7d52-bba4-3b6258b55709',
  attraction: '019f4bc4-f550-7d52-bba4-3b6258b5570a',
  topList: '019f4bc4-f550-7d52-bba4-3b6258b5570b',
  faq: '019f4bc4-f550-7d52-bba4-3b6258b5570c',
  tag: '019f4bc4-f550-7d52-bba4-3b6258b5570d',
} as const;

pgDescribe('SEO Repository PostgreSQL Real DB Integration Tests', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let dbClient: Database;
  let repository: DrizzleSeoRepository;

  async function cleanFixtures(): Promise<void> {
    await sqlClient.begin(async (tx) => {
      await tx`DELETE FROM faqs WHERE id = ${ids.faq}`;
      await tx`DELETE FROM top_list_items WHERE top_list_id = ${ids.topList}`;
      await tx`DELETE FROM top_lists WHERE id = ${ids.topList}`;
      await tx`DELETE FROM article_tags WHERE article_id IN (${ids.article}, ${ids.draftArticle})`;
      await tx`DELETE FROM tags WHERE id = ${ids.tag}`;
      await tx`DELETE FROM articles WHERE id IN (${ids.article}, ${ids.draftArticle})`;
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

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error('SEARCH_TEST_DATABASE_URL is required');
    sqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });

    // Ensure it's a test database
    const databaseRows = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    const databaseName = databaseRows[0]?.databaseName;
    if (!databaseName?.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('SEO integration tests require a dedicated database ending in _test');
    }

    dbClient = drizzle(sqlClient, { schema }) as Database;
    repository = new DrizzleSeoRepository(dbClient);

    await cleanFixtures();

    // Seed fixtures
    await sqlClient.begin(async (tx) => {
      await tx`
        INSERT INTO users (id, email, password_hash, status)
        VALUES (${ids.user}, 'seo.test@example.com', 'hash', 'active'::public.user_status)
      `;
      await tx`
        INSERT INTO regions (id, parent_id, name, slug, level, path)
        VALUES
          (${ids.rootRegion}, NULL, 'Root Province', 'root-province', 1, 'root_province'::ltree),
          (${ids.childRegion}, ${ids.rootRegion}, 'Child Region', 'child-region', 2, 'root_province.child_region'::ltree)
      `;
      await tx`
        INSERT INTO article_categories (id, code, name)
        VALUES (${ids.articleCategory}, 'guides', 'Guides')
      `;
      await tx`
        INSERT INTO attraction_categories (id, code, name)
        VALUES (${ids.attractionCategory}, 'nature', 'Nature')
      `;
      await tx`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES (${ids.businessType}, 'homestay', 'Homestay', TRUE)
      `;
      await tx`
        INSERT INTO tourist_places (id, region_id, name, slug, location, description, status)
        VALUES (
          ${ids.place}, ${ids.childRegion}, 'Test Place', 'test-place',
          ST_SetSRID(ST_MakePoint(104.5, 22.5), 4326)::geography,
          'Place desc', 'active'
        )
      `;
      await tx`
        INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, description, status)
        VALUES (
          ${ids.business}, ${ids.childRegion}, ${ids.businessType}, 'Test Business', 'test-business',
          ST_SetSRID(ST_MakePoint(104.5, 22.5), 4326)::geography,
          'Business desc', 'active'
        )
      `;
      await tx`
        INSERT INTO attractions (id, region_id, category_id, name, slug, location, description, status)
        VALUES (
          ${ids.attraction}, ${ids.childRegion}, ${ids.attractionCategory}, 'Test Attraction', 'test-attraction',
          ST_SetSRID(ST_MakePoint(104.5, 22.5), 4326)::geography,
          'Attraction desc', 'active'
        )
      `;
      await tx`
        INSERT INTO articles (id, title, slug, excerpt, content, author_id, category_id, status, view_count, is_featured, published_at)
        VALUES
          (${ids.article}, 'Public Article', 'public-article', 'exc', 'content', ${ids.user}, ${ids.articleCategory}, 'published', 0, FALSE, NOW() - INTERVAL '1 hour'),
          (${ids.draftArticle}, 'Draft Article', 'draft-article', 'exc', 'content', ${ids.user}, ${ids.articleCategory}, 'draft', 0, FALSE, NULL)
      `;
      await tx`
        INSERT INTO tags (id, name, slug)
        VALUES (${ids.tag}, 'Scenic', 'scenic')
      `;
      await tx`
        INSERT INTO article_tags (article_id, tag_id)
        VALUES (${ids.article}, ${ids.tag})
      `;
      await tx`
        INSERT INTO top_lists (id, title, slug, description, status, created_by)
        VALUES (${ids.topList}, 'Best Places', 'best-places', 'desc', 'PUBLISHED', ${ids.user})
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
  });

  afterAll(async () => {
    if (sqlClient) {
      await cleanFixtures();
      await sqlClient.end({ timeout: 5 });
    }
  });

  test('findArticleBySlug returns only published', async () => {
    const art = await repository.findArticleBySlug('public-article');
    expect(art).not.toBeNull();
    expect(art?.title).toBe('Public Article');

    const draft = await repository.findArticleBySlug('draft-article');
    expect(draft).toBeNull();
  });

  test('findRegionBySlug returns active region', async () => {
    const reg = await repository.findRegionBySlug('child-region');
    expect(reg).not.toBeNull();
    expect(reg?.name).toBe('Child Region');
  });

  test('findPlaceBySlug returns active place', async () => {
    const plc = await repository.findPlaceBySlug('test-place');
    expect(plc).not.toBeNull();
    expect(plc?.name).toBe('Test Place');
  });

  test('findBusinessBySlug returns active business with parent details', async () => {
    const bus = await repository.findBusinessBySlug('test-business');
    expect(bus).not.toBeNull();
    expect(bus?.name).toBe('Test Business');
    expect(bus?.parentRegion?.name).toBe('Child Region');
  });

  test('findAttractionBySlug returns active attraction', async () => {
    const att = await repository.findAttractionBySlug('test-attraction');
    expect(att).not.toBeNull();
    expect(att?.name).toBe('Test Attraction');
  });

  test('resolveRegionPathBySlugs orders correctly', async () => {
    const resolved = await repository.resolveRegionPathBySlugs(['root-province', 'child-region']);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.slug).toBe('root-province');
    expect(resolved[1]?.slug).toBe('child-region');
  });

  test('sitemap getters return only public/active items', async () => {
    const articles = await repository.getSitemapArticles();
    expect(articles.some((a) => a.path.includes('public-article'))).toBe(true);
    expect(articles.some((a) => a.path.includes('draft-article'))).toBe(false);

    const tags = await repository.getSitemapTags();
    expect(tags.some((t) => t.path.includes('scenic'))).toBe(true);

    const topLists = await repository.getSitemapTopLists();
    expect(topLists.some((tl) => tl.path.includes('best-places'))).toBe(true);

    const faqHub = await repository.checkFaqHubEligibility();
    expect(faqHub).toBe(true);
  });
});
