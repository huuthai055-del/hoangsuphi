import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { NearbySearchCriteria } from '../repository/nearby-repository.interface';
import { DrizzleNearbyRepository } from '../repository/nearby.repository';

const testDatabaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

const origin = { lng: 104.6644, lat: 22.7844 }; // Bản Phùng Commune Center

const ids = {
  user1: 'e1000000-0000-4000-8000-000000000001',
  user2: 'e1000000-0000-4000-8000-000000000002',
  // Regions
  regionActive: 'e2000000-0000-4000-8000-000000000001',
  regionDeleted: 'e2000000-0000-4000-8000-000000000002',
  regionSibling: 'e2000000-0000-4000-8000-000000000003',
  // Categories & Types
  attractionCat: 'e3000000-0000-4000-8000-000000000001',
  utilityCat: 'e3000000-0000-4000-8000-000000000002',
  activeBusinessType: 'e4000000-0000-4000-8000-000000000001',
  inactiveBusinessType: 'e4000000-0000-4000-8000-000000000002',
  // Tourist Places
  placeVeryClose: 'e5000000-0000-4000-8000-000000000001',
  placeWithin1km: 'e5000000-0000-4000-8000-000000000002',
  placeWithin5km: 'e5000000-0000-4000-8000-000000000003',
  placeOutside5km: 'e5000000-0000-4000-8000-000000000004',
  placeInactive: 'e5000000-0000-4000-8000-000000000005',
  placeDeleted: 'e5000000-0000-4000-8000-000000000006',
  placeInDeletedRegion: 'e5000000-0000-4000-8000-000000000007',
  placeInSiblingRegion: 'e5000000-0000-4000-8000-000000000008',
  // Attractions & Utilities
  attractionVeryClose: 'e7000000-0000-4000-8000-000000000001',
  attractionDeleted: 'e7000000-0000-4000-8000-000000000002',
  attractionInactive: 'e7000000-0000-4000-8000-000000000003',
  utilityWithin1km: 'e7000000-0000-4000-8000-000000000004',
  // Businesses
  businessWithin5kmActiveType: 'e6000000-0000-4000-8000-000000000001',
  businessWithin5kmInactiveType: 'e6000000-0000-4000-8000-000000000002',
  businessDeleted: 'e6000000-0000-4000-8000-000000000003',
  businessInactive: 'e6000000-0000-4000-8000-000000000004',
  // Reviews
  review1: 'e8000000-0000-4000-8000-000000000001',
  review2: 'e8000000-0000-4000-8000-000000000002',
  reviewPending: 'e8000000-0000-4000-8000-000000000003',
  reviewDeleted: 'e8000000-0000-4000-8000-000000000004',
  reviewRejected: 'e8000000-0000-4000-8000-000000000005',
} as const;

integrationDescribe('DrizzleNearbyRepository PostgreSQL/PostGIS Integration', () => {
  let sqlClient: ReturnType<typeof postgres>;
  let repository: DrizzleNearbyRepository;

  async function cleanFixtures(): Promise<void> {
    await sqlClient.begin(async (tx) => {
      await tx`DELETE FROM reviews WHERE id IN (${ids.review1}, ${ids.review2}, ${ids.reviewPending}, ${ids.reviewDeleted}, ${ids.reviewRejected})`;
      await tx`DELETE FROM tourist_places WHERE id IN (${ids.placeVeryClose}, ${ids.placeWithin1km}, ${ids.placeWithin5km}, ${ids.placeOutside5km}, ${ids.placeInactive}, ${ids.placeDeleted}, ${ids.placeInDeletedRegion}, ${ids.placeInSiblingRegion})`;
      await tx`DELETE FROM attractions WHERE id IN (${ids.attractionVeryClose}, ${ids.attractionDeleted}, ${ids.attractionInactive}, ${ids.utilityWithin1km})`;
      await tx`DELETE FROM businesses WHERE id IN (${ids.businessWithin5kmActiveType}, ${ids.businessWithin5kmInactiveType}, ${ids.businessDeleted}, ${ids.businessInactive})`;
      await tx`DELETE FROM attraction_categories WHERE id IN (${ids.attractionCat}, ${ids.utilityCat})`;
      await tx`DELETE FROM business_types WHERE id IN (${ids.activeBusinessType}, ${ids.inactiveBusinessType})`;
      await tx`DELETE FROM regions WHERE id IN (${ids.regionActive}, ${ids.regionDeleted}, ${ids.regionSibling})`;
      await tx`DELETE FROM users WHERE id IN (${ids.user1}, ${ids.user2})`;
    });
  }

  async function seedFixtures(): Promise<void> {
    await sqlClient.begin(async (tx) => {
      // 0. Mock Users (for reviews)
      await tx`
        INSERT INTO users (id, email, password_hash, status)
        VALUES
          (${ids.user1}, 'nearby.user1@example.test', 'passhash', 'active'::public.user_status),
          (${ids.user2}, 'nearby.user2@example.test', 'passhash', 'active'::public.user_status)
      `;

      // 1. Seed Regions
      await tx`
        INSERT INTO regions (id, parent_id, name, slug, level, path, deleted_at)
        VALUES
          (${ids.regionActive}, NULL, 'Bản Phùng Active', 'ban-phung-active', 3, 'ha_giang.hoang_su_phi.ban_phung_active'::ltree, NULL),
          (${ids.regionDeleted}, NULL, 'Bản Phùng Deleted', 'ban-phung-deleted', 3, 'ha_giang.hoang_su_phi.ban_phung_deleted'::ltree, CURRENT_TIMESTAMP),
          (${ids.regionSibling}, NULL, 'Thông Nguyên Sibling', 'thong-nguyen-sibling', 3, 'ha_giang.hoang_su_phi.thong_nguyen_sibling'::ltree, NULL)
      `;

      // 2. Seed Categories & Types
      await tx`
        INSERT INTO attraction_categories (id, code, name, is_utility)
        VALUES
          (${ids.attractionCat}, 'nearby-attraction', 'Attraction Category', FALSE),
          (${ids.utilityCat}, 'nearby-utility', 'Utility Category', TRUE)
      `;
      await tx`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES
          (${ids.activeBusinessType}, 'nearby-business-active', 'Active Business Type', TRUE),
          (${ids.inactiveBusinessType}, 'nearby-business-inactive', 'Inactive Business Type', FALSE)
      `;

      // 3. Seed Tourist Places
      // placeVeryClose: ~10m (104.6645, 22.7844)
      // placeWithin1km: ~370m (104.6680, 22.7844)
      // placeWithin5km: ~2.6km (104.6900, 22.7844)
      // placeOutside5km: ~7.7km (104.7400, 22.7844)
      await tx`
        INSERT INTO tourist_places (id, region_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.placeVeryClose}, ${ids.regionActive}, 'Very Close Place', 'place-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeWithin1km}, ${ids.regionActive}, 'Within 1km Place', 'place-within-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeWithin5km}, ${ids.regionActive}, 'Within 5km Place', 'place-within-5km', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeOutside5km}, ${ids.regionActive}, 'Outside 5km Place', 'place-outside-5km', ST_SetSRID(ST_MakePoint(104.7400, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeInactive}, ${ids.regionActive}, 'Inactive Place', 'place-inactive', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'inactive', NULL),
          (${ids.placeDeleted}, ${ids.regionActive}, 'Deleted Place', 'place-deleted', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
          (${ids.placeInDeletedRegion}, ${ids.regionDeleted}, 'Place in Deleted Region', 'place-in-deleted-region', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeInSiblingRegion}, ${ids.regionSibling}, 'Place in Sibling Region', 'place-in-sibling-region', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL)
      `;

      // 4. Seed Attractions & Utilities
      await tx`
        INSERT INTO attractions (id, region_id, category_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.attractionVeryClose}, ${ids.regionActive}, ${ids.attractionCat}, 'Very Close Attraction', 'attraction-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.attractionDeleted}, ${ids.regionActive}, ${ids.attractionCat}, 'Deleted Attraction', 'attraction-deleted', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
          (${ids.attractionInactive}, ${ids.regionActive}, ${ids.attractionCat}, 'Inactive Attraction', 'attraction-inactive', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'inactive', NULL),
          (${ids.utilityWithin1km}, ${ids.regionActive}, ${ids.utilityCat}, 'Within 1km Utility', 'utility-within-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL)
      `;

      // 5. Seed Businesses
      await tx`
        INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.businessWithin5kmActiveType}, ${ids.regionActive}, ${ids.activeBusinessType}, 'Within 5km Business Active Type', 'business-active-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.businessWithin5kmInactiveType}, ${ids.regionActive}, ${ids.inactiveBusinessType}, 'Within 5km Business Inactive Type', 'business-inactive-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.businessDeleted}, ${ids.regionActive}, ${ids.activeBusinessType}, 'Deleted Business', 'business-deleted', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
          (${ids.businessInactive}, ${ids.regionActive}, ${ids.activeBusinessType}, 'Inactive Business', 'business-inactive', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'inactive', NULL)
      `;

      // 6. Seed Reviews
      // PlaceVeryClose has two approved reviews: avg = 4.5, count = 2
      await tx`
        INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
        VALUES
          (${ids.review1}, ${ids.user1}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 4, 'Good', 'Nice place', 'APPROVED'::public.review_status, NULL),
          (${ids.review2}, ${ids.user2}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 5, 'Great', 'Awesome place', 'APPROVED'::public.review_status, NULL),
          (${ids.reviewPending}, ${ids.user1}, 'PLACE'::public.owner_type, ${ids.placeWithin1km}, 5, 'Pending review', 'Ok', 'PENDING'::public.review_status, NULL),
          (${ids.reviewDeleted}, ${ids.user1}, 'PLACE'::public.owner_type, ${ids.placeWithin1km}, 5, 'Deleted review', 'Ok', 'APPROVED'::public.review_status, CURRENT_TIMESTAMP),
          (${ids.reviewRejected}, ${ids.user1}, 'BUSINESS'::public.owner_type, ${ids.businessWithin5kmActiveType}, 1, 'Rejected', 'Bad', 'REJECTED'::public.review_status, NULL)
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
    repository = new DrizzleNearbyRepository(dbInstance);

    await cleanFixtures();
    await seedFixtures();
  });

  afterAll(async () => {
    if (!sqlClient) return;
    await cleanFixtures();
    await sqlClient.end({ timeout: 5 });
  });

  function makeCriteria(overrides: Partial<NearbySearchCriteria> = {}): NearbySearchCriteria {
    return {
      latitude: String(origin.lat),
      longitude: String(origin.lng),
      radiusMeters: 5000, // 5km default
      entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
      limit: 10,
      ...overrides,
    };
  }

  // 19.1 Unified Result
  test('returns unified results mapping each entity type correctly', async () => {
    const page = await repository.searchNearby(makeCriteria());
    const items = page.items;

    // Verify all four entity types are returned
    expect(items.map((i) => i.entityType)).toContain('TOURIST_PLACE');
    expect(items.map((i) => i.entityType)).toContain('ATTRACTION');
    expect(items.map((i) => i.entityType)).toContain('BUSINESS');
    expect(items.map((i) => i.entityType)).toContain('UTILITY');

    // Utility is categorized under attractions table, check that categories are partitioned correctly
    const attractionsFound = items.filter((i) => i.entityType === 'ATTRACTION');
    const utilitiesFound = items.filter((i) => i.entityType === 'UTILITY');

    for (const a of attractionsFound) {
      expect(a.entityId).toBe(ids.attractionVeryClose);
    }
    for (const u of utilitiesFound) {
      expect(u.entityId).toBe(ids.utilityWithin1km);
    }
  });

  // 19.2 Radius filters
  test('respects the radius parameter, excluding entities outside the radius', async () => {
    // 500 meters: very close (~10m) and within 1km (~370m) should appear.
    // Within 5km (~2.6km) place should be excluded.
    const page = await repository.searchNearby(makeCriteria({ radiusMeters: 500 }));
    const idsFound = page.items.map((i) => i.entityId);

    expect(idsFound).toContain(ids.placeVeryClose);
    expect(idsFound).toContain(ids.attractionVeryClose);
    expect(idsFound).toContain(ids.placeWithin1km);
    expect(idsFound).toContain(ids.utilityWithin1km);

    expect(idsFound).not.toContain(ids.placeWithin5km);
    expect(idsFound).not.toContain(ids.businessWithin5kmActiveType);
    expect(idsFound).not.toContain(ids.placeOutside5km);
  });

  // 19.3 Coordinate mapping
  test('correctly projects ST_X as longitude and ST_Y as latitude without reversing', async () => {
    const page = await repository.searchNearby(makeCriteria({ limit: 1 }));
    const veryClosePlace = page.items.find((i) => i.entityId === ids.placeVeryClose);

    expect(veryClosePlace).toBeDefined();
    expect(veryClosePlace?.longitude).toBeCloseTo(104.6645, 6);
    expect(veryClosePlace?.latitude).toBeCloseTo(22.7844, 6);
  });

  // 19.4 Visibility Policies
  test('respects entity and region visibility policies', async () => {
    const page = await repository.searchNearby(makeCriteria({ radiusMeters: 10000 }));
    const idsFound = page.items.map((i) => i.entityId);

    // Active nodes in active regions must appear
    expect(idsFound).toContain(ids.placeVeryClose);
    expect(idsFound).toContain(ids.placeWithin1km);
    expect(idsFound).toContain(ids.placeWithin5km);

    // Inactive entities must be excluded
    expect(idsFound).not.toContain(ids.placeInactive);
    expect(idsFound).not.toContain(ids.attractionInactive);
    expect(idsFound).not.toContain(ids.businessInactive);

    // Deleted entities must be excluded
    expect(idsFound).not.toContain(ids.placeDeleted);
    expect(idsFound).not.toContain(ids.attractionDeleted);
    expect(idsFound).not.toContain(ids.businessDeleted);

    // Entities in deleted regions must be excluded
    expect(idsFound).not.toContain(ids.placeInDeletedRegion);

    // Business type inactive must exclude the business
    expect(idsFound).not.toContain(ids.businessWithin5kmInactiveType);
  });

  // 19.5 Entity Type Filter
  test('respects selected entityTypes filters', async () => {
    const pageOnlyPlaces = await repository.searchNearby(
      makeCriteria({ entityTypes: ['TOURIST_PLACE'] })
    );
    expect(pageOnlyPlaces.items.every((i) => i.entityType === 'TOURIST_PLACE')).toBe(true);

    const pageOnlyBusinesses = await repository.searchNearby(
      makeCriteria({ entityTypes: ['BUSINESS'] })
    );
    expect(pageOnlyBusinesses.items.every((i) => i.entityType === 'BUSINESS')).toBe(true);

    const pageMultiple = await repository.searchNearby(
      makeCriteria({ entityTypes: ['TOURIST_PLACE', 'UTILITY'] })
    );
    expect(
      pageMultiple.items.every(
        (i) => i.entityType === 'TOURIST_PLACE' || i.entityType === 'UTILITY'
      )
    ).toBe(true);
  });

  // 19.6 Region Filter
  test('respects direct regionId filter and excludes other regions', async () => {
    const pageActiveRegion = await repository.searchNearby(
      makeCriteria({ regionId: ids.regionActive })
    );
    const idsFound = pageActiveRegion.items.map((i) => i.entityId);

    expect(idsFound).toContain(ids.placeVeryClose);
    expect(idsFound).not.toContain(ids.placeInSiblingRegion);

    const pageSiblingRegion = await repository.searchNearby(
      makeCriteria({ regionId: ids.regionSibling })
    );
    const siblingIds = pageSiblingRegion.items.map((i) => i.entityId);

    expect(siblingIds).toContain(ids.placeInSiblingRegion);
    expect(siblingIds).not.toContain(ids.placeVeryClose);
  });

  // 19.7 Category/BusinessType Filter
  test('filters correctly by categoryId (attractions vs business types)', async () => {
    // 1. Filter by Attraction Category
    const pageAttCat = await repository.searchNearby(
      makeCriteria({ categoryId: ids.attractionCat, entityTypes: ['ATTRACTION'] })
    );
    expect(pageAttCat.items.map((i) => i.entityId)).toContain(ids.attractionVeryClose);
    expect(pageAttCat.items.map((i) => i.entityId)).not.toContain(ids.utilityWithin1km);

    // 2. Filter by Utility Category
    const pageUtCat = await repository.searchNearby(
      makeCriteria({ categoryId: ids.utilityCat, entityTypes: ['UTILITY'] })
    );
    expect(pageUtCat.items.map((i) => i.entityId)).toContain(ids.utilityWithin1km);
    expect(pageUtCat.items.map((i) => i.entityId)).not.toContain(ids.attractionVeryClose);

    // 3. Filter by Business Type Category
    const pageBusType = await repository.searchNearby(
      makeCriteria({ categoryId: ids.activeBusinessType, entityTypes: ['BUSINESS'] })
    );
    expect(pageBusType.items.map((i) => i.entityId)).toContain(ids.businessWithin5kmActiveType);

    // 4. Mismatch taxonomy category: category is attraction type but query requests BUSINESS
    const pageMismatchBus = await repository.searchNearby(
      makeCriteria({ categoryId: ids.attractionCat, entityTypes: ['BUSINESS'] })
    );
    expect(pageMismatchBus.items.length).toBe(0);

    // 5. Mismatch taxonomy category: category is business type but query requests ATTRACTION
    const pageMismatchAtt = await repository.searchNearby(
      makeCriteria({ categoryId: ids.activeBusinessType, entityTypes: ['ATTRACTION'] })
    );
    expect(pageMismatchAtt.items.length).toBe(0);
  });

  // 19.8 Rating filters and averages
  test('calculates rating average and review count correctly, and filters by minRating', async () => {
    const pageAll = await repository.searchNearby(makeCriteria());

    // placeVeryClose has reviews (rating 4 and 5) -> avg: "4.5000000000000000", count: 2
    const place1 = pageAll.items.find((i) => i.entityId === ids.placeVeryClose);
    expect(place1).toBeDefined();
    expect(place1?.reviewCount).toBe(2);
    expect(place1?.averageRating).toBeDefined();
    expect(Number(place1?.averageRating)).toBeCloseTo(4.5, 2);

    // placeWithin1km has only pending/deleted reviews -> avg: null, count: 0
    const place2 = pageAll.items.find((i) => i.entityId === ids.placeWithin1km);
    expect(place2).toBeDefined();
    expect(place2?.reviewCount).toBe(0);
    expect(place2?.averageRating).toBeNull();

    // businessWithin5kmActiveType has only rejected review -> avg: null, count: 0
    const business = pageAll.items.find((i) => i.entityId === ids.businessWithin5kmActiveType);
    expect(business).toBeDefined();
    expect(business?.reviewCount).toBe(0);
    expect(business?.averageRating).toBeNull();

    // 1. With minRating = undefined/null: returns both reviewed and unreviewed entities
    const pageRatingNull = await repository.searchNearby(makeCriteria({ minRating: undefined }));
    expect(pageRatingNull.items.map((i) => i.entityId)).toContain(ids.placeVeryClose);
    expect(pageRatingNull.items.map((i) => i.entityId)).toContain(ids.placeWithin1km);

    // 2. With minRating = '0': returns both reviewed and unreviewed entities
    const pageRatingZero = await repository.searchNearby(makeCriteria({ minRating: '0' }));
    expect(pageRatingZero.items.map((i) => i.entityId)).toContain(ids.placeVeryClose);
    expect(pageRatingZero.items.map((i) => i.entityId)).toContain(ids.placeWithin1km);

    // 3. With minRating = '4.0': excludes unreviewed and poorly reviewed ones, returns placeVeryClose (4.5)
    const pageRatingFour = await repository.searchNearby(makeCriteria({ minRating: '4.0' }));
    expect(pageRatingFour.items.map((i) => i.entityId)).toContain(ids.placeVeryClose);
    expect(pageRatingFour.items.map((i) => i.entityId)).not.toContain(ids.placeWithin1km);
    expect(pageRatingFour.items.map((i) => i.entityId)).not.toContain(
      ids.businessWithin5kmActiveType
    );

    // 4. With minRating = '5.0': excludes placeVeryClose (4.5)
    const pageRatingFive = await repository.searchNearby(makeCriteria({ minRating: '5.0' }));
    expect(pageRatingFive.items.map((i) => i.entityId)).not.toContain(ids.placeVeryClose);
  });

  // 19.9 Global Ordering
  test('returns results sorted globally by distance ASC, rank ASC, and entityId ASC', async () => {
    const page = await repository.searchNearby(makeCriteria());
    const items = page.items;

    // Verify ordering sequence:
    // 1. placeVeryClose (~10m, rank 1) & attractionVeryClose (~10m, rank 2)
    // 2. placeWithin1km (~370m, rank 1) & utilityWithin1km (~370m, rank 4)
    // 3. placeWithin5km (~2.6km, rank 1) & businessWithin5kmActiveType (~2.6km, rank 3)

    expect(items.length).toBeGreaterThanOrEqual(6);

    // Assert strictly increasing distance
    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];
      if (!current || !next) {
        throw new Error('Expected items to be defined');
      }

      const currentDist = Number(current.rawDistanceMeters);
      const nextDist = Number(next.rawDistanceMeters);

      if (currentDist === nextDist) {
        if (current.entityTypeRank === next.entityTypeRank) {
          expect(current.entityId.localeCompare(next.entityId)).toBeLessThan(0);
        } else {
          expect(current.entityTypeRank).toBeLessThan(next.entityTypeRank);
        }
      } else {
        expect(currentDist).toBeLessThan(nextDist);
      }
    }
  });

  // 19.10 Keyset Pagination
  test('handles keyset pagination boundary accurately across pages without duplicates or omissions', async () => {
    // We request limit = 2. It will query LIMIT 3, return 3 items.
    const criteria: NearbySearchCriteria = makeCriteria({ limit: 2 });

    // Page 1
    const page1 = await repository.searchNearby(criteria);
    expect(page1.items.length).toBe(3); // limit + 1 = 3 items

    // Keyset cursor is from the 2nd item (index 1) to retrieve Page 2 starting at index 2
    const boundary = page1.items[1];
    if (!boundary) {
      throw new Error('Expected boundary to be defined');
    }

    // Page 2
    const page2 = await repository.searchNearby(
      makeCriteria({
        limit: 2,
        after: {
          rawDistanceMeters: boundary.rawDistanceMeters,
          entityType: boundary.entityType,
          entityTypeRank: boundary.entityTypeRank,
          entityId: boundary.entityId,
        },
      })
    );

    // Page 2 first item must be equal to Page 1's third item
    expect(page2.items.length).toBeGreaterThan(0);
    expect(page2.items[0]?.entityId).toBe(page1.items[2]?.entityId);

    // Keyset cursor is from Page 1's third item (index 2) to retrieve Page 2 starting at index 3
    const boundary2 = page1.items[2];
    if (!boundary2) {
      throw new Error('Expected boundary2 to be defined');
    }
    const page2Shifted = await repository.searchNearby(
      makeCriteria({
        limit: 2,
        after: {
          rawDistanceMeters: boundary2.rawDistanceMeters,
          entityType: boundary2.entityType,
          entityTypeRank: boundary2.entityTypeRank,
          entityId: boundary2.entityId,
        },
      })
    );

    // The first item of Page 2 shifted must not be in Page 1
    const page1Ids = page1.items.map((i) => i.entityId);
    expect(page2Shifted.items.length).toBeGreaterThan(0);
    expect(page1Ids).not.toContain(page2Shifted.items[0]?.entityId);
  });
});
