import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Hono } from 'hono';
import postgres from 'postgres';
import { errorHandlerMiddleware } from '@/middleware/error';
import { RecommendationsService } from '../application/recommendations.service';
import { RecommendationsController } from '../http/recommendations.controller';
import { createRecommendationsRouter } from '../http/recommendations.routes';
import { DrizzleRecommendationsRepository } from './recommendations.repository';

const testDatabaseUrl =
  process.env.RECOMMENDATIONS_TEST_DATABASE_URL ?? process.env.SEARCH_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

const ids = {
  users: [
    '97000000-0000-4000-8000-000000000001',
    '97000000-0000-4000-8000-000000000002',
    '97000000-0000-4000-8000-000000000003',
    '97000000-0000-4000-8000-000000000004',
  ],
  activeRegion: '97100000-0000-4000-8000-000000000001',
  siblingRegion: '97100000-0000-4000-8000-000000000002',
  deletedRegion: '97100000-0000-4000-8000-000000000003',
  articleCategory: '97200000-0000-4000-8000-000000000001',
  attractionCategory: '97200000-0000-4000-8000-000000000002',
  activeBusinessType: '97200000-0000-4000-8000-000000000003',
  inactiveBusinessType: '97200000-0000-4000-8000-000000000004',
  topArticle: '97300000-0000-4000-8000-000000000001',
  futureArticle: '97300000-0000-4000-8000-000000000002',
  draftArticle: '97300000-0000-4000-8000-000000000003',
  sourcePlace: '97400000-0000-4000-8000-000000000001',
  nearestPlace: '97400000-0000-4000-8000-000000000002',
  inactivePlace: '97400000-0000-4000-8000-000000000003',
  deletedRegionPlace: '97400000-0000-4000-8000-000000000004',
  ratedBusiness: '97500000-0000-4000-8000-000000000001',
  inactiveTypeBusiness: '97500000-0000-4000-8000-000000000002',
  ratedAttraction: '97600000-0000-4000-8000-000000000001',
  siblingAttraction: '97600000-0000-4000-8000-000000000002',
  reviews: [
    '97700000-0000-4000-8000-000000000001',
    '97700000-0000-4000-8000-000000000002',
    '97700000-0000-4000-8000-000000000003',
    '97700000-0000-4000-8000-000000000004',
    '97700000-0000-4000-8000-000000000005',
    '97700000-0000-4000-8000-000000000006',
    '97700000-0000-4000-8000-000000000007',
  ],
} as const;

integrationDescribe('DrizzleRecommendationsRepository PostgreSQL/PostGIS integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let repository: DrizzleRecommendationsRepository;
  let app: Hono;

  async function cleanFixtures(): Promise<void> {
    await sqlClient.begin(async (transaction) => {
      await transaction`DELETE FROM reviews WHERE id IN ${transaction([...ids.reviews])}`;
      await transaction`
        DELETE FROM articles
        WHERE id IN (${ids.topArticle}, ${ids.futureArticle}, ${ids.draftArticle})
      `;
      await transaction`
        DELETE FROM tourist_places
        WHERE id IN (
          ${ids.sourcePlace}, ${ids.nearestPlace}, ${ids.inactivePlace}, ${ids.deletedRegionPlace}
        )
      `;
      await transaction`
        DELETE FROM businesses WHERE id IN (${ids.ratedBusiness}, ${ids.inactiveTypeBusiness})
      `;
      await transaction`
        DELETE FROM attractions WHERE id IN (${ids.ratedAttraction}, ${ids.siblingAttraction})
      `;
      await transaction`DELETE FROM article_categories WHERE id = ${ids.articleCategory}`;
      await transaction`DELETE FROM attraction_categories WHERE id = ${ids.attractionCategory}`;
      await transaction`
        DELETE FROM business_types WHERE id IN (${ids.activeBusinessType}, ${ids.inactiveBusinessType})
      `;
      await transaction`
        DELETE FROM regions
        WHERE id IN (${ids.activeRegion}, ${ids.siblingRegion}, ${ids.deletedRegion})
      `;
      await transaction`DELETE FROM users WHERE id IN ${transaction([...ids.users])}`;
    });
  }

  async function seedFixtures(): Promise<void> {
    await sqlClient.begin(async (transaction) => {
      for (const [index, userId] of ids.users.entries()) {
        await transaction`
          INSERT INTO users (id, email, password_hash, status)
          VALUES (
            ${userId},
            ${`recommendations.integration.${index}@example.test`},
            'integration-test-hash',
            'active'::public.user_status
          )
        `;
      }

      await transaction`
        INSERT INTO regions (id, parent_id, name, slug, level, path, deleted_at)
        VALUES
          (${ids.activeRegion}, NULL, 'Recommendation Active Region', 'recommendation-active', 3, 'recommendation.active'::ltree, NULL),
          (${ids.siblingRegion}, NULL, 'Recommendation Sibling Region', 'recommendation-sibling', 3, 'recommendation.sibling'::ltree, NULL),
          (${ids.deletedRegion}, NULL, 'Recommendation Deleted Region', 'recommendation-deleted', 3, 'recommendation.deleted'::ltree, CURRENT_TIMESTAMP)
      `;
      await transaction`
        INSERT INTO article_categories (id, code, name)
        VALUES (${ids.articleCategory}, 'recommendation-article', 'Recommendation Article')
      `;
      await transaction`
        INSERT INTO attraction_categories (id, code, name, is_utility)
        VALUES (${ids.attractionCategory}, 'recommendation-attraction', 'Recommendation Attraction', FALSE)
      `;
      await transaction`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES
          (${ids.activeBusinessType}, 'rec-active-business', 'Recommendation Active Business', TRUE),
          (${ids.inactiveBusinessType}, 'rec-inactive-business', 'Recommendation Inactive Business', FALSE)
      `;

      await transaction`
        INSERT INTO articles (
          id, title, slug, excerpt, content, author_id, category_id, status, published_at, created_at
        )
        VALUES
          (
            ${ids.topArticle}, 'Recommendation Top Article', 'recommendation-top-article',
            'Public recommendation article', 'Public content', ${ids.users[0]}, ${ids.articleCategory},
            'published'::public.article_status, CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours'
          ),
          (
            ${ids.futureArticle}, 'Recommendation Future Article', 'recommendation-future-article',
            'Not public yet', 'Future content', ${ids.users[0]}, ${ids.articleCategory},
            'published'::public.article_status, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 hour'
          ),
          (
            ${ids.draftArticle}, 'Recommendation Draft Article', 'recommendation-draft-article',
            'Not public', 'Draft content', ${ids.users[0]}, ${ids.articleCategory},
            'draft'::public.article_status, NULL, CURRENT_TIMESTAMP
          )
      `;

      await transaction`
        INSERT INTO tourist_places (id, region_id, name, slug, location, status, created_at, deleted_at)
        VALUES
          (
            ${ids.sourcePlace}, ${ids.activeRegion}, 'Recommendation Source Place', 'recommendation-source-place',
            ST_SetSRID(ST_MakePoint(104.7000, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL
          ),
          (
            ${ids.nearestPlace}, ${ids.activeRegion}, 'Recommendation Nearest Place', 'recommendation-nearest-place',
            ST_SetSRID(ST_MakePoint(104.7005, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP - INTERVAL '6 hours', NULL
          ),
          (
            ${ids.inactivePlace}, ${ids.activeRegion}, 'Recommendation Inactive Place', 'recommendation-inactive-place',
            ST_SetSRID(ST_MakePoint(104.7002, 22.6000), 4326)::geography, 'inactive', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL
          ),
          (
            ${ids.deletedRegionPlace}, ${ids.deletedRegion}, 'Recommendation Deleted Region Place', 'recommendation-deleted-region-place',
            ST_SetSRID(ST_MakePoint(104.7003, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL
          )
      `;

      await transaction`
        INSERT INTO businesses (
          id, region_id, business_type_id, name, slug, location, status, created_at, deleted_at
        )
        VALUES
          (
            ${ids.ratedBusiness}, ${ids.activeRegion}, ${ids.activeBusinessType},
            'Recommendation Rated Business', 'recommendation-rated-business',
            ST_SetSRID(ST_MakePoint(104.7010, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL
          ),
          (
            ${ids.inactiveTypeBusiness}, ${ids.activeRegion}, ${ids.inactiveBusinessType},
            'Recommendation Inactive Type Business', 'recommendation-inactive-type-business',
            ST_SetSRID(ST_MakePoint(104.7001, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP, NULL
          )
      `;

      await transaction`
        INSERT INTO attractions (
          id, region_id, category_id, name, slug, location, status, created_at, deleted_at
        )
        VALUES
          (
            ${ids.ratedAttraction}, ${ids.activeRegion}, ${ids.attractionCategory},
            'Recommendation Rated Attraction', 'recommendation-rated-attraction',
            ST_SetSRID(ST_MakePoint(104.7020, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL
          ),
          (
            ${ids.siblingAttraction}, ${ids.siblingRegion}, ${ids.attractionCategory},
            'Recommendation Sibling Attraction', 'recommendation-sibling-attraction',
            ST_SetSRID(ST_MakePoint(104.7030, 22.6000), 4326)::geography, 'active', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL
          )
      `;

      await transaction`
        INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
        VALUES
          (${ids.reviews[0]}, ${ids.users[0]}, 'ARTICLE'::public.owner_type, ${ids.topArticle}, 5, 'Article 1', 'Public', 'APPROVED'::public.review_status, NULL),
          (${ids.reviews[1]}, ${ids.users[1]}, 'ARTICLE'::public.owner_type, ${ids.topArticle}, 5, 'Article 2', 'Public', 'APPROVED'::public.review_status, NULL),
          (${ids.reviews[2]}, ${ids.users[0]}, 'BUSINESS'::public.owner_type, ${ids.ratedBusiness}, 4, 'Business 1', 'Public', 'APPROVED'::public.review_status, NULL),
          (${ids.reviews[3]}, ${ids.users[1]}, 'BUSINESS'::public.owner_type, ${ids.ratedBusiness}, 5, 'Business 2', 'Public', 'APPROVED'::public.review_status, NULL),
          (${ids.reviews[4]}, ${ids.users[2]}, 'BUSINESS'::public.owner_type, ${ids.ratedBusiness}, 1, 'Business pending', 'Not public', 'PENDING'::public.review_status, NULL),
          (${ids.reviews[5]}, ${ids.users[3]}, 'BUSINESS'::public.owner_type, ${ids.ratedBusiness}, 1, 'Business deleted', 'Not public', 'APPROVED'::public.review_status, CURRENT_TIMESTAMP),
          (${ids.reviews[6]}, ${ids.users[0]}, 'ATTRACTION'::public.owner_type, ${ids.ratedAttraction}, 5, 'Attraction', 'Public', 'APPROVED'::public.review_status, NULL)
      `;
    });
  }

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error('A recommendation test database URL is required');
    sqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });
    const rows = await sqlClient<{ databaseName: string }[]>`
      SELECT current_database() AS "databaseName"
    `;
    if (!rows[0]?.databaseName.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Recommendation integration tests require a database ending in _test');
    }

    repository = new DrizzleRecommendationsRepository(drizzle(sqlClient, { schema }) as Database);
    const service = new RecommendationsService(repository);
    const controller = new RecommendationsController(service);
    app = new Hono();
    app.route('/api/v1/recommendations', createRecommendationsRouter(controller));
    app.onError(errorHandlerMiddleware());
    await cleanFixtures();
    await seedFixtures();
  });

  afterAll(async () => {
    if (!sqlClient) return;
    await cleanFixtures();
    await sqlClient.end({ timeout: 5 });
  });

  test('resolves only public source entities, including active business-type eligibility', async () => {
    const publicPlace = await repository.resolvePublicSource('place', ids.sourcePlace);
    const hiddenBusiness = await repository.resolvePublicSource('business', ids.inactiveTypeBusiness);

    expect(publicPlace).toMatchObject({ id: ids.sourcePlace, sourceType: 'place' });
    expect(publicPlace?.location).toMatchObject({ x: 104.7, y: 22.6 });
    expect(hiddenBusiness).toBeNull();
  });

  test('returns nearby public candidates, excludes the source and keeps distance ordering', async () => {
    const source = await repository.resolvePublicSource('place', ids.sourcePlace);
    if (!source) throw new Error('Seeded source must be public');

    const results = await repository.findNearby({
      limit: 12,
      sourceId: ids.sourcePlace,
      sourceProjection: source,
    });
    const resultIds = results.map((item) => item.id);

    expect(resultIds).not.toContain(ids.sourcePlace);
    expect(resultIds).toContain(ids.nearestPlace);
    expect(resultIds).toContain(ids.ratedBusiness);
    expect(resultIds).not.toContain(ids.inactivePlace);
    expect(resultIds).not.toContain(ids.deletedRegionPlace);
    expect(resultIds).not.toContain(ids.inactiveTypeBusiness);
    expect(results[0]?.id).toBe(ids.nearestPlace);
    expect(results[0]?.distanceMeters).toBeGreaterThan(0);
  });

  test('returns only candidates in the exact same region and excludes the source', async () => {
    const source = await repository.resolvePublicSource('place', ids.sourcePlace);
    if (!source) throw new Error('Seeded source must be public');

    const resultIds = (
      await repository.findSameRegion({
        limit: 12,
        sourceId: ids.sourcePlace,
        sourceProjection: source,
      })
    ).map((item) => item.id);

    expect(resultIds).toContain(ids.nearestPlace);
    expect(resultIds).toContain(ids.ratedBusiness);
    expect(resultIds).toContain(ids.ratedAttraction);
    expect(resultIds).not.toContain(ids.sourcePlace);
    expect(resultIds).not.toContain(ids.siblingAttraction);
    expect(resultIds).not.toContain(ids.inactiveTypeBusiness);
  });

  test('ranks only approved non-deleted reviews and uses deterministic top-rated ordering', async () => {
    const results = await repository.findTopRated({ limit: 12 });
    const article = results.find((item) => item.id === ids.topArticle);
    const business = results.find((item) => item.id === ids.ratedBusiness);

    expect(results[0]?.id).toBe(ids.topArticle);
    expect(article).toMatchObject({ ratingAverage: 5, ratingCount: 2 });
    expect(business).toMatchObject({ ratingAverage: 4.5, ratingCount: 2 });
    expect(results.map((item) => item.id)).not.toContain(ids.inactiveTypeBusiness);
  });

  test('returns the newest public candidates and excludes future, draft and inactive records', async () => {
    const resultIds = (await repository.findNewest({ limit: 12 })).map((item) => item.id);

    expect(resultIds[0]).toBe(ids.ratedBusiness);
    expect(resultIds).toContain(ids.topArticle);
    expect(resultIds).not.toContain(ids.futureArticle);
    expect(resultIds).not.toContain(ids.draftArticle);
    expect(resultIds).not.toContain(ids.inactivePlace);
    expect(resultIds).not.toContain(ids.inactiveTypeBusiness);
  });

  test('executes the public HTTP route through controller, service and PostgreSQL repository', async () => {
    const topRatedResponse = await app.request('/api/v1/recommendations?strategy=top_rated&limit=2');
    expect(topRatedResponse.status).toBe(200);
    expect(topRatedResponse.headers.get('cache-control')).toContain('no-store');
    const topRatedBody = await topRatedResponse.json();
    expect(topRatedBody.error).toBeNull();
    expect(topRatedBody.meta).toEqual({ strategy: 'top_rated', limit: 2, source: null });
    expect(topRatedBody.data.map((item: { id: string }) => item.id)).toEqual([
      ids.topArticle,
      ids.ratedAttraction,
    ]);

    const unavailableSourceResponse = await app.request(
      '/api/v1/recommendations?strategy=nearby&sourceType=place&sourceId=97400000-0000-4000-8000-000000000099'
    );
    expect(unavailableSourceResponse.status).toBe(404);
    expect(unavailableSourceResponse.headers.get('content-type')).toContain(
      'application/problem+json'
    );
    const unavailableSourceBody = await unavailableSourceResponse.json();
    expect(unavailableSourceBody.code).toBe('SYS_002');
    expect(unavailableSourceBody.detail).toBe('RECOMMENDATION_SOURCE_NOT_FOUND_OR_UNAVAILABLE');
  });
});
