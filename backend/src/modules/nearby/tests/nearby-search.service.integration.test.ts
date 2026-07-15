import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { NearbyCursorCodec, type NearbyCursorKeyring } from '../application/nearby-cursor.codec';
import { NearbySearchService } from '../application/nearby-search.service';
import { DrizzleNearbyRepository } from '../repository/nearby.repository';

const testDatabaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

const origin = { lng: 104.6644, lat: 22.7844 }; // Bản Phùng Commune Center

// Distinct set of UUIDs starting with X1 to prevent parallel collision with repository integration tests
const ids = {
  // Users
  user1: 'e1100000-0000-4000-8000-000000000001',
  user2: 'e1100000-0000-4000-8000-000000000002',
  // Regions
  regionActive: 'e2100000-0000-4000-8000-000000000001',
  regionDeleted: 'e2100000-0000-4000-8000-000000000002',
  // Categories & Types
  attractionCat: 'e3100000-0000-4000-8000-000000000001',
  utilityCat: 'e3100000-0000-4000-8000-000000000002',
  activeBusinessType: 'e4100000-0000-4000-8000-000000000001',
  // Tourist Places
  placeVeryClose: 'e5100000-0000-4000-8000-000000000001',
  placeWithin1km: 'e5100000-0000-4000-8000-000000000002',
  placeWithin5km: 'e5100000-0000-4000-8000-000000000003',
  placeOutside5km: 'e5100000-0000-4000-8000-000000000004',
  // Attractions & Utilities
  attractionVeryClose: 'e7100000-0000-4000-8000-000000000001',
  utilityWithin1km: 'e7100000-0000-4000-8000-000000000004',
  // Businesses
  businessWithin5kmActiveType: 'e6100000-0000-4000-8000-000000000001',
  // Reviews
  review1: 'e8100000-0000-4000-8000-000000000001',
  review2: 'e8100000-0000-4000-8000-000000000002',
} as const;

integrationDescribe('NearbySearchService & Repository Integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let service: NearbySearchService;
  let codec: NearbyCursorCodec;

  const mockKeyring: NearbyCursorKeyring = {
    activeKeyId: 'k1',
    keys: {
      k1: '12345678901234567890123456789012',
    },
  };

  async function cleanFixtures(): Promise<void> {
    await sqlClient.begin(async (tx) => {
      await tx`DELETE FROM reviews WHERE id IN (${ids.review1}, ${ids.review2})`;
      await tx`DELETE FROM tourist_places WHERE id IN (${ids.placeVeryClose}, ${ids.placeWithin1km}, ${ids.placeWithin5km}, ${ids.placeOutside5km})`;
      await tx`DELETE FROM attractions WHERE id IN (${ids.attractionVeryClose}, ${ids.utilityWithin1km})`;
      await tx`DELETE FROM businesses WHERE id IN (${ids.businessWithin5kmActiveType})`;
      await tx`DELETE FROM attraction_categories WHERE id IN (${ids.attractionCat}, ${ids.utilityCat})`;
      await tx`DELETE FROM business_types WHERE id IN (${ids.activeBusinessType})`;
      await tx`DELETE FROM regions WHERE id IN (${ids.regionActive}, ${ids.regionDeleted})`;
      await tx`DELETE FROM users WHERE id IN (${ids.user1}, ${ids.user2})`;
    });
  }

  async function seedFixtures(): Promise<void> {
    await sqlClient.begin(async (tx) => {
      // 0. Users
      await tx`
        INSERT INTO users (id, email, password_hash, status)
        VALUES
          (${ids.user1}, 'nearby.service.user1@example.test', 'passhash', 'active'::public.user_status),
          (${ids.user2}, 'nearby.service.user2@example.test', 'passhash', 'active'::public.user_status)
      `;

      // 1. Regions
      await tx`
        INSERT INTO regions (id, parent_id, name, slug, level, path, deleted_at)
        VALUES
          (${ids.regionActive}, NULL, 'Active Region', 'active-region', 3, 'ha_giang.hoang_su_phi.active_region'::ltree, NULL),
          (${ids.regionDeleted}, NULL, 'Deleted Region', 'deleted-region', 3, 'ha_giang.hoang_su_phi.deleted_region'::ltree, CURRENT_TIMESTAMP)
      `;

      // 2. Categories
      await tx`
        INSERT INTO attraction_categories (id, code, name, is_utility)
        VALUES
          (${ids.attractionCat}, 'srv-attraction', 'Service Attraction Category', FALSE),
          (${ids.utilityCat}, 'srv-utility', 'Service Utility Category', TRUE)
      `;
      await tx`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES
          (${ids.activeBusinessType}, 'srv-business-active', 'Service Active Business Type', TRUE)
      `;

      // 3. Seed Places
      // placeVeryClose: ~10m (104.6645, 22.7844)
      // placeWithin1km: ~370m (104.6680, 22.7844)
      // placeWithin5km: ~2.6km (104.6900, 22.7844)
      // placeOutside5km: ~7.7km (104.7400, 22.7844)
      await tx`
        INSERT INTO tourist_places (id, region_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.placeVeryClose}, ${ids.regionActive}, 'Service Very Close Place', 'srv-place-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeWithin1km}, ${ids.regionActive}, 'Service Within 1km Place', 'srv-place-within-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeWithin5km}, ${ids.regionActive}, 'Service Within 5km Place', 'srv-place-within-5km', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeOutside5km}, ${ids.regionActive}, 'Service Outside 5km Place', 'srv-place-outside-5km', ST_SetSRID(ST_MakePoint(104.7400, 22.7844), 4326)::geography, 'active', NULL)
      `;

      // 4. Attractions & Utilities
      await tx`
        INSERT INTO attractions (id, region_id, category_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.attractionVeryClose}, ${ids.regionActive}, ${ids.attractionCat}, 'Service Attraction', 'srv-attraction-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.utilityWithin1km}, ${ids.regionActive}, ${ids.utilityCat}, 'Service Utility', 'srv-utility-within-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL)
      `;

      // 5. Businesses
      await tx`
        INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.businessWithin5kmActiveType}, ${ids.regionActive}, ${ids.activeBusinessType}, 'Service Business', 'srv-business-active-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL)
      `;

      // 6. Seed Reviews
      await tx`
        INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
        VALUES
          (${ids.review1}, ${ids.user1}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 4, 'Ok', 'Good', 'APPROVED'::public.review_status, NULL),
          (${ids.review2}, ${ids.user2}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 5, 'Super', 'Great', 'APPROVED'::public.review_status, NULL)
      `;
    });
  }

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error('SEARCH_TEST_DATABASE_URL is not set');
    }
    sqlClient = postgres(testDatabaseUrl, { max: 2, prepare: false });
    const databaseRows = await sqlClient<
      { databaseName: string }[]
    >`SELECT current_database() AS "databaseName"`;
    const databaseName = databaseRows[0]?.databaseName;
    if (!databaseName?.endsWith('_test')) {
      await sqlClient.end({ timeout: 5 });
      throw new Error('Nearby integration tests require a dedicated database ending in _test');
    }
    const dbInstance = drizzle(sqlClient, { schema });
    const repository = new DrizzleNearbyRepository(dbInstance);
    codec = new NearbyCursorCodec(mockKeyring);
    service = new NearbySearchService(repository, codec);

    await cleanFixtures();
    await seedFixtures();
  });

  afterAll(async () => {
    if (!sqlClient) return;
    await cleanFixtures();
    await sqlClient.end({ timeout: 5 });
  });

  test('successfully performs keyset pagination roundtrip', async () => {
    // Page 1: limit = 2
    const page1 = await service.search({
      latitude: origin.lat,
      longitude: origin.lng,
      radiusMeters: 5000,
      limit: 2,
    });

    expect(page1.items.length).toBe(2);
    expect(page1.pagination.hasNextPage).toBe(true);
    expect(page1.pagination.nextCursor).not.toBeNull();

    // Verify distance is rounded in public display DTO
    expect(page1.items[0]?.distanceMeters).toBeCloseTo(10.26, 1);

    // Page 2: pass page 1's nextCursor
    const nextCursor = page1.pagination.nextCursor;
    if (!nextCursor) {
      throw new Error('nextCursor is missing');
    }
    const page2 = await service.search({
      latitude: origin.lat,
      longitude: origin.lng,
      radiusMeters: 5000,
      limit: 2,
      cursor: nextCursor,
    });

    expect(page2.items.length).toBeGreaterThan(0);
    // The items on Page 2 must not contain any items from Page 1 (stable pagination)
    const page1Ids = page1.items.map((i) => i.id);
    for (const item of page2.items) {
      expect(page1Ids).not.toContain(item.id);
    }
  });

  test('correctly aggregates rating scores end-to-end', async () => {
    const res = await service.search({
      latitude: origin.lat,
      longitude: origin.lng,
      radiusMeters: 5000,
      entityTypes: ['place'],
    });

    const veryClosePlaceItem = res.items.find((i) => i.id === ids.placeVeryClose);
    expect(veryClosePlaceItem).toBeDefined();
    expect(veryClosePlaceItem?.rating.average).toBe(4.5);
    expect(veryClosePlaceItem?.rating.count).toBe(2);
  });
});
