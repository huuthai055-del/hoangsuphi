import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { SearchRepositoryQuery } from './search-read-model';
import { DrizzleSearchRepository } from './search.repository';

const testDatabaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

const ids = {
  users: [
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
  ],
  rootRegion: '20000000-0000-4000-8000-000000000001',
  childRegion: '20000000-0000-4000-8000-000000000002',
  deletedRegion: '20000000-0000-4000-8000-000000000003',
  articleCategory: '30000000-0000-4000-8000-000000000001',
  attractionCategory: '30000000-0000-4000-8000-000000000002',
  activeBusinessType: '30000000-0000-4000-8000-000000000003',
  inactiveBusinessType: '30000000-0000-4000-8000-000000000004',
  amenities: ['30000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006'],
  missingAmenity: '30000000-0000-4000-8000-000000000099',
  publishedArticle: '40000000-0000-4000-8000-000000000001',
  futureArticle: '40000000-0000-4000-8000-000000000002',
  draftArticle: '40000000-0000-4000-8000-000000000003',
  rootPlace: '50000000-0000-4000-8000-000000000001',
  childPlace: '50000000-0000-4000-8000-000000000002',
  inactivePlace: '50000000-0000-4000-8000-000000000003',
  deletedRegionPlace: '50000000-0000-4000-8000-000000000004',
  completeBusiness: '60000000-0000-4000-8000-000000000001',
  partialBusiness: '60000000-0000-4000-8000-000000000002',
  inactiveTypeBusiness: '60000000-0000-4000-8000-000000000003',
  attraction: '70000000-0000-4000-8000-000000000001',
} as const;

function makeQuery(overrides: Partial<SearchRepositoryQuery> = {}): SearchRepositoryQuery {
  return {
    q: null,
    types: ['article', 'attraction', 'business', 'place'],
    regionId: null,
    includeDescendants: true,
    articleCategoryId: null,
    attractionCategoryId: null,
    businessTypeId: null,
    minRating: null,
    priceMin: null,
    priceMax: null,
    amenityIds: [],
    sort: 'newest',
    keyset: null,
    limit: 20,
    ...overrides,
  };
}

integrationDescribe('DrizzleSearchRepository PostgreSQL integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let repository: DrizzleSearchRepository;

  async function cleanFixtures(): Promise<void> {
    await sqlClient.begin(async (transaction) => {
      await transaction`
        DELETE FROM reviews
        WHERE owner_id IN (
          ${ids.publishedArticle}, ${ids.rootPlace}, ${ids.completeBusiness}, ${ids.attraction}
        )
        OR user_id IN ${transaction(ids.users)}
      `;
      await transaction`
        DELETE FROM business_amenities
        WHERE business_id IN (
          ${ids.completeBusiness}, ${ids.partialBusiness}, ${ids.inactiveTypeBusiness}
        )
      `;
      await transaction`
        DELETE FROM articles
        WHERE id IN (${ids.publishedArticle}, ${ids.futureArticle}, ${ids.draftArticle})
      `;
      await transaction`
        DELETE FROM tourist_places
        WHERE id IN (
          ${ids.rootPlace}, ${ids.childPlace}, ${ids.inactivePlace}, ${ids.deletedRegionPlace}
        )
      `;
      await transaction`
        DELETE FROM businesses
        WHERE id IN (
          ${ids.completeBusiness}, ${ids.partialBusiness}, ${ids.inactiveTypeBusiness}
        )
      `;
      await transaction`DELETE FROM attractions WHERE id = ${ids.attraction}`;
      await transaction`
        DELETE FROM amenities WHERE id IN ${transaction([...ids.amenities])}
      `;
      await transaction`DELETE FROM article_categories WHERE id = ${ids.articleCategory}`;
      await transaction`DELETE FROM attraction_categories WHERE id = ${ids.attractionCategory}`;
      await transaction`
        DELETE FROM business_types
        WHERE id IN (${ids.activeBusinessType}, ${ids.inactiveBusinessType})
      `;
      await transaction`
        DELETE FROM regions WHERE id IN (${ids.childRegion}, ${ids.deletedRegion})
      `;
      await transaction`DELETE FROM regions WHERE id = ${ids.rootRegion}`;
      await transaction`DELETE FROM users WHERE id IN ${transaction(ids.users)}`;
    });
  }

  async function seedFixtures(): Promise<void> {
    await sqlClient.begin(async (transaction) => {
      for (const [index, userId] of ids.users.entries()) {
        await transaction`
          INSERT INTO users (id, email, password_hash, status)
          VALUES (
            ${userId},
            ${`search.integration.${index}@example.test`},
            ${'integration-test-hash'},
            'active'::public.user_status
          )
        `;
      }

      await transaction`
        INSERT INTO regions (id, parent_id, name, slug, level, path, deleted_at)
        VALUES
          (${ids.rootRegion}, NULL, 'Test Root', 'search-test-root', 2, 'search_test.root'::ltree, NULL),
          (
            ${ids.childRegion}, ${ids.rootRegion}, 'Test Child', 'search-test-child', 3,
            'search_test.root.child'::ltree, NULL
          ),
          (
            ${ids.deletedRegion}, NULL, 'Deleted Region', 'search-test-deleted', 2,
            'search_test.deleted'::ltree, CURRENT_TIMESTAMP
          )
      `;
      await transaction`
        INSERT INTO article_categories (id, code, name)
        VALUES (${ids.articleCategory}, 'search-test-article', 'Search Test Article')
      `;
      await transaction`
        INSERT INTO attraction_categories (id, code, name)
        VALUES (${ids.attractionCategory}, 'search-test-attraction', 'Search Test Attraction')
      `;
      await transaction`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES
          (${ids.activeBusinessType}, 'search-test-active', 'Search Test Active', TRUE),
          (${ids.inactiveBusinessType}, 'search-test-inactive', 'Search Test Inactive', FALSE)
      `;
      await transaction`
        INSERT INTO amenities (id, code, name, category)
        VALUES
          (${ids.amenities[0]}, 'search-test-wifi', 'Search Test Wifi', 'connectivity'),
          (${ids.amenities[1]}, 'search-test-view', 'Search Test View', 'comfort')
      `;

      await transaction`
        INSERT INTO articles (
          id, title, slug, excerpt, content, author_id, category_id, status, published_at
        )
        VALUES
          (
            ${ids.publishedArticle}, 'Mùa vàng Hoàng Su Phì', 'search-test-published',
            'Hoàng Su Phì đang vào mùa vàng.', 'Nội dung công khai', ${ids.users[0]},
            ${ids.articleCategory}, 'published'::public.article_status,
            CURRENT_TIMESTAMP - INTERVAL '2 days'
          ),
          (
            ${ids.futureArticle}, 'Hoàng Su Phì tương lai', 'search-test-future',
            'Chưa được xuất bản.', 'Nội dung tương lai', ${ids.users[0]},
            ${ids.articleCategory}, 'published'::public.article_status,
            CURRENT_TIMESTAMP + INTERVAL '2 days'
          ),
          (
            ${ids.draftArticle}, 'Hoàng Su Phì bản nháp', 'search-test-draft',
            'Bản nháp.', 'Nội dung nháp', ${ids.users[0]}, ${ids.articleCategory},
            'draft'::public.article_status, NULL
          )
      `;

      await transaction`
        INSERT INTO tourist_places (
          id, region_id, name, slug, location, description, status
        )
        VALUES
          (
            ${ids.rootPlace}, ${ids.rootRegion}, 'Hoàng Su Phì Root Place', 'search-test-root-place',
            ST_SetSRID(ST_MakePoint(104.7, 22.6), 4326)::geography,
            'Địa điểm tại vùng gốc.', 'active'
          ),
          (
            ${ids.childPlace}, ${ids.childRegion}, 'Hoàng Su Phì Child Place',
            'search-test-child-place',
            ST_SetSRID(ST_MakePoint(104.71, 22.61), 4326)::geography,
            'Địa điểm tại vùng con.', 'active'
          ),
          (
            ${ids.inactivePlace}, ${ids.rootRegion}, 'Hoàng Su Phì Inactive Place',
            'search-test-inactive-place',
            ST_SetSRID(ST_MakePoint(104.72, 22.62), 4326)::geography,
            'Không công khai.', 'inactive'
          ),
          (
            ${ids.deletedRegionPlace}, ${ids.deletedRegion}, 'Hoàng Su Phì Deleted Region Place',
            'search-test-deleted-region-place',
            ST_SetSRID(ST_MakePoint(104.73, 22.63), 4326)::geography,
            'Region đã xóa.', 'active'
          )
      `;

      await transaction`
        INSERT INTO businesses (
          id, region_id, business_type_id, name, slug, location, description, status,
          price_min, price_max
        )
        VALUES
          (
            ${ids.completeBusiness}, ${ids.rootRegion}, ${ids.activeBusinessType},
            'Hoàng Su Phì Complete Business', 'search-test-complete-business',
            ST_SetSRID(ST_MakePoint(104.74, 22.64), 4326)::geography,
            'Có đầy đủ tiện nghi.', 'active', 100000, 200000
          ),
          (
            ${ids.partialBusiness}, ${ids.childRegion}, ${ids.activeBusinessType},
            'Hoàng Su Phì Partial Business', 'search-test-partial-business',
            ST_SetSRID(ST_MakePoint(104.75, 22.65), 4326)::geography,
            'Thiếu một tiện nghi.', 'active', 300000, 400000
          ),
          (
            ${ids.inactiveTypeBusiness}, ${ids.rootRegion}, ${ids.inactiveBusinessType},
            'Hoàng Su Phì Inactive Type Business', 'search-test-inactive-type-business',
            ST_SetSRID(ST_MakePoint(104.76, 22.66), 4326)::geography,
            'Business Type không hoạt động.', 'active', 50000, 75000
          )
      `;
      await transaction`
        INSERT INTO business_amenities (business_id, amenity_id)
        VALUES
          (${ids.completeBusiness}, ${ids.amenities[0]}),
          (${ids.completeBusiness}, ${ids.amenities[1]}),
          (${ids.partialBusiness}, ${ids.amenities[0]})
      `;

      await transaction`
        INSERT INTO attractions (
          id, region_id, category_id, name, slug, location, description, status
        )
        VALUES (
          ${ids.attraction}, ${ids.rootRegion}, ${ids.attractionCategory},
          'Hoàng Su Phì Attraction', 'search-test-attraction',
          ST_SetSRID(ST_MakePoint(104.77, 22.67), 4326)::geography,
          'Điểm tham quan công khai.', 'active'
        )
      `;

      await transaction`
        INSERT INTO reviews (
          id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at
        )
        VALUES
          (
            '80000000-0000-4000-8000-000000000001', ${ids.users[0]}, 'BUSINESS',
            ${ids.completeBusiness}, 5, 'Approved 5', 'Public', 'APPROVED', NULL
          ),
          (
            '80000000-0000-4000-8000-000000000002', ${ids.users[1]}, 'BUSINESS',
            ${ids.completeBusiness}, 4, 'Approved 4', 'Public', 'APPROVED', NULL
          ),
          (
            '80000000-0000-4000-8000-000000000003', ${ids.users[2]}, 'BUSINESS',
            ${ids.completeBusiness}, 1, 'Pending', 'Not public', 'PENDING', NULL
          ),
          (
            '80000000-0000-4000-8000-000000000004', ${ids.users[3]}, 'BUSINESS',
            ${ids.completeBusiness}, 1, 'Rejected', 'Not public', 'REJECTED', NULL
          ),
          (
            '80000000-0000-4000-8000-000000000005', ${ids.users[4]}, 'BUSINESS',
            ${ids.completeBusiness}, 1, 'Deleted', 'Not public', 'APPROVED', CURRENT_TIMESTAMP
          ),
          (
            '80000000-0000-4000-8000-000000000006', ${ids.users[0]}, 'PLACE',
            ${ids.rootPlace}, 3, 'Place', 'Public', 'APPROVED', NULL
          ),
          (
            '80000000-0000-4000-8000-000000000007', ${ids.users[0]}, 'ATTRACTION',
            ${ids.attraction}, 5, 'Attraction', 'Public', 'APPROVED', NULL
          ),
          (
            '80000000-0000-4000-8000-000000000008', ${ids.users[0]}, 'ARTICLE',
            ${ids.publishedArticle}, 4, 'Article', 'Public', 'APPROVED', NULL
          )
      `;
    });
  }

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error('SEARCH_TEST_DATABASE_URL is required');
    sqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });
    const databaseRows = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    const databaseName = databaseRows[0]?.databaseName;
    if (!databaseName?.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Search integration tests require a dedicated database ending in _test');
    }

    const database = drizzle(sqlClient, { schema }) as Database;
    repository = new DrizzleSearchRepository(database);
    await cleanFixtures();
    await seedFixtures();
  });

  afterAll(async () => {
    if (!sqlClient) return;
    await cleanFixtures();
    await sqlClient.end({ timeout: 5 });
  });

  test('executes Vietnamese FTS and excludes non-public records end-to-end', async () => {
    expect(await repository.inspectQuery('???')).toEqual({ lexemeCount: 0, hasLexemes: false });
    const page = await repository.search(
      makeQuery({ q: 'hoang su phi', types: ['article', 'place'], sort: 'relevance' })
    );
    const idsFound = page.items.map((item) => item.id);

    expect(idsFound).toContain(ids.publishedArticle);
    expect(idsFound).toContain(ids.rootPlace);
    expect(idsFound).toContain(ids.childPlace);
    expect(idsFound).not.toContain(ids.futureArticle);
    expect(idsFound).not.toContain(ids.draftArticle);
    expect(idsFound).not.toContain(ids.inactivePlace);
    expect(idsFound).not.toContain(ids.deletedRegionPlace);
  });

  test('validates references set-wise and distinguishes invalid states', async () => {
    const result = await repository.validateReferences({
      regionId: ids.deletedRegion,
      articleCategoryId: ids.articleCategory,
      attractionCategoryId: ids.attractionCategory,
      businessTypeId: ids.inactiveBusinessType,
      amenityIds: [ids.amenities[0], ids.missingAmenity],
    });

    expect(result.region).toBe('deleted');
    expect(result.articleCategoryExists).toBe(true);
    expect(result.attractionCategoryExists).toBe(true);
    expect(result.businessType).toBe('inactive');
    expect(result.foundAmenityIds).toEqual([ids.amenities[0]]);
    expect(result.missingAmenityIds).toEqual([ids.missingAmenity]);
  });

  test('applies exact and descendant Region semantics', async () => {
    const exact = await repository.search(
      makeQuery({
        types: ['place'],
        regionId: ids.rootRegion,
        includeDescendants: false,
      })
    );
    const descendants = await repository.search(
      makeQuery({
        types: ['place'],
        regionId: ids.rootRegion,
        includeDescendants: true,
      })
    );

    expect(exact.items.map((item) => item.id)).toEqual([ids.rootPlace]);
    expect(descendants.items.map((item) => item.id).sort()).toEqual(
      [ids.rootPlace, ids.childPlace].sort()
    );
  });

  test('applies ALL-amenities and approved Review rating semantics', async () => {
    const page = await repository.search(
      makeQuery({
        types: ['business'],
        amenityIds: ids.amenities,
        minRating: '4.5',
        sort: 'rating',
      })
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe(ids.completeBusiness);
    expect(page.items[0]?.rating).toBe('4.50');
    expect(page.items[0]?.sortValue).toBe('4.5000000000000000');
  });

  test('applies price interval-overlap filters and projects exact decimal strings', async () => {
    const page = await repository.search(
      makeQuery({
        types: ['article', 'business', 'place'],
        priceMin: '150000',
        priceMax: '250000',
      })
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      entityType: 'business',
      id: ids.completeBusiness,
      priceMin: '100000.00',
      priceMax: '200000.00',
    });
  });

  test('price sorts use stable exact keysets without duplicates or missing rows', async () => {
    const first = await repository.search(
      makeQuery({ types: ['business'], sort: 'price_asc', limit: 1 })
    );
    const second = await repository.search(
      makeQuery({ types: ['business'], sort: 'price_asc', limit: 1, keyset: first.lastKeyset })
    );
    const descending = await repository.search(
      makeQuery({ types: ['business'], sort: 'price_desc', limit: 2 })
    );

    expect(first.items.map((item) => item.id)).toEqual([ids.completeBusiness]);
    expect(first.lastKeyset).toMatchObject({ sort: 'price_asc', sortValue: '100000.00' });
    expect(second.items.map((item) => item.id)).toEqual([ids.partialBusiness]);
    expect(descending.items.map((item) => item.id)).toEqual([
      ids.partialBusiness,
      ids.completeBusiness,
    ]);
  });

  test('keyset pages have no duplicates or missing rows on a static dataset', async () => {
    const foundIds: string[] = [];
    let keyset: SearchRepositoryQuery['keyset'] = null;

    for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
      const page = await repository.search(
        makeQuery({ types: ['article', 'attraction', 'business', 'place'], limit: 2, keyset })
      );
      foundIds.push(...page.items.map((item) => item.id));
      if (!page.hasMore) break;
      keyset = page.lastKeyset;
    }

    expect(new Set(foundIds).size).toBe(foundIds.length);
    expect(foundIds.sort()).toEqual(
      [
        ids.publishedArticle,
        ids.attraction,
        ids.completeBusiness,
        ids.partialBusiness,
        ids.rootPlace,
        ids.childPlace,
      ].sort()
    );
  });
});
