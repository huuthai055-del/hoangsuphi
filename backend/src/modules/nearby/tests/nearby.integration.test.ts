import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { container } from '@/common/di/container';
import type { Hono } from 'hono';
import type postgres from 'postgres';
import type { NearbyCursorCodec } from '../application/nearby-cursor.codec';
import { buildNearbyQueryFingerprint } from '../application/nearby-query-fingerprint';
import { cleanFixtures, ids, origin, seedFixtures } from './nearby.integration.fixtures';
import { getParamErrorReason, setupTestApp } from './nearby.integration.helpers';

const testDatabaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

integrationDescribe('Nearby Search PostgreSQL/PostGIS E2E Integration Suite', () => {
  let app: Hono;
  let sqlClient: postgres.Sql;

  beforeAll(async () => {
    if (!testDatabaseUrl) return;
    const result = setupTestApp(testDatabaseUrl);
    app = result.app;
    sqlClient = result.sqlClient;

    // Safety check: Database must be a test database
    const [row] = await sqlClient`SELECT current_database() AS "dbName"`;
    if (!row) {
      throw new Error('Database connection check returned no rows');
    }
    const dbName = row.dbName as string;
    if (!dbName.endsWith('_test')) {
      throw new Error(
        `Database name "${dbName}" does not end with "_test". Destructive tests aborted.`
      );
    }

    // Verify spatial indices and SRIDs
    const [sridRow] = await sqlClient`SELECT ST_SRID(ST_MakePoint(104.6, 22.7)::geography) AS srid`;
    if (!sridRow) {
      throw new Error('Spatial reference system check returned no rows');
    }
    expect(sridRow.srid).toBe(4326);

    await sqlClient.begin(async (tx) => {
      await cleanFixtures(tx);
      await seedFixtures(tx);
    });
  });

  afterAll(async () => {
    if (testDatabaseUrl && sqlClient) {
      await sqlClient.begin(async (tx) => {
        await cleanFixtures(tx);
      });
      await sqlClient.end({ timeout: 5 });
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP A: BASIC END-TO-END
  // -------------------------------------------------------------
  test('A1. Minimum valid request returns 200, default parameters and correct shape', async () => {
    const response = await app.request(`/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toBeArray();
    expect(body.meta).toBeObject();
    expect(body.meta.origin.latitude).toBe(origin.lat);
    expect(body.meta.origin.longitude).toBe(origin.lng);
    expect(body.meta.radiusMeters).toBe(5000);
    expect(body.error).toBeNull();
    expect(body.meta.totalReturned).toBeGreaterThan(0);
  });

  test('A2. Empty results when search coordinates are far away', async () => {
    const farLat = 40.7128; // New York
    const farLng = -74.006;
    const response = await app.request(`/api/v1/nearby?lat=${farLat}&lng=${farLng}`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.totalReturned).toBe(0);
    expect(body.meta.hasMore).toBe(false);
    expect(body.meta.nextCursor).toBeNull();
  });

  // -------------------------------------------------------------
  // TEST GROUP B: RADIUS AND DISTANCE
  // -------------------------------------------------------------
  test('B1. Within radius items are returned, outside are excluded', async () => {
    // 5km radius: Very Close (~10m), 1km (~370m), 5km (~2.6km) are within radius
    // Outside 5km (~7.7km) is excluded
    const response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=place`
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const itemIds = body.data.map((item: any) => item.id);

    expect(itemIds).toContain(ids.placeVeryClose);
    expect(itemIds).toContain(ids.placeWithin1km);
    expect(itemIds).toContain(ids.placeWithin5km);
    expect(itemIds).not.toContain(ids.placeOutside5km);

    // Verify distance calculation rounding
    const veryCloseItem = body.data.find((item: any) => item.id === ids.placeVeryClose);
    expect(veryCloseItem.distanceMeters).toBeCloseTo(10.26, 1);
  });

  // -------------------------------------------------------------
  // TEST GROUP C: ENTITY TYPE MAPPING
  // -------------------------------------------------------------
  test('C1. Entity types are parsed and mapped accurately', async () => {
    // types=place -> TOURIST_PLACE
    let response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=place`
    );
    let body = await response.json();
    for (const item of body.data) {
      expect(item.entityType).toBe('TOURIST_PLACE');
    }

    // types=attraction -> ATTRACTION
    response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=attraction`
    );
    body = await response.json();
    for (const item of body.data) {
      expect(item.entityType).toBe('ATTRACTION');
    }

    // types=utility -> UTILITY
    response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=utility`
    );
    body = await response.json();
    for (const item of body.data) {
      expect(item.entityType).toBe('UTILITY');
    }

    // types=business -> BUSINESS
    response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=business`
    );
    body = await response.json();
    for (const item of body.data) {
      expect(item.entityType).toBe('BUSINESS');
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP D: VISIBILITY POLICY
  // -------------------------------------------------------------
  test('D1. Endpoint does not return deleted, inactive or hidden entities', async () => {
    const response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000`
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const itemIds = body.data.map((item: any) => item.id);

    expect(itemIds).not.toContain(ids.placeInactive);
    expect(itemIds).not.toContain(ids.placeDeleted);
    expect(itemIds).not.toContain(ids.placeInDeletedRegion);
    expect(itemIds).not.toContain(ids.attractionDeleted);
    expect(itemIds).not.toContain(ids.attractionInactive);
    expect(itemIds).not.toContain(ids.businessDeleted);
    expect(itemIds).not.toContain(ids.businessInactive);
    expect(itemIds).not.toContain(ids.businessWithin5kmInactiveType);
  });

  // -------------------------------------------------------------
  // TEST GROUP E: REGION FILTER
  // -------------------------------------------------------------
  test('E1. Filters direct region match, does not descend recursively', async () => {
    const response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&regionId=${ids.regionActive}`
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    for (const item of body.data) {
      expect(item.region.id).toBe(ids.regionActive);
    }

    const itemIds = body.data.map((item: any) => item.id);
    expect(itemIds).not.toContain(ids.placeInSiblingRegion);
  });

  // -------------------------------------------------------------
  // TEST GROUP F: CATEGORY FILTER
  // -------------------------------------------------------------
  test('F1. Filters accurately by category ID depending on entity type', async () => {
    // Attraction category filter: should include attractionVeryClose but exclude attractionDifferentCategory
    let response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=attraction&categoryId=${ids.attractionCat}`
    );
    let body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    const attractionIds = body.data.map((item: any) => item.id);
    expect(attractionIds).toContain(ids.attractionVeryClose);
    expect(attractionIds).not.toContain(ids.attractionDifferentCategory);

    // Business type filter: should include businessWithin5kmActiveType but exclude businessDifferentType
    response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=business&categoryId=${ids.activeBusinessType}`
    );
    body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
    const businessIds = body.data.map((item: any) => item.id);
    expect(businessIds).toContain(ids.businessWithin5kmActiveType);
    expect(businessIds).not.toContain(ids.businessDifferentType);
  });

  // -------------------------------------------------------------
  // TEST GROUP G: RATING AGGREGATION
  // -------------------------------------------------------------
  test('G1. Review count and average calculated correctly (excluding pending/deleted)', async () => {
    const response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&types=place`
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const veryClosePlace = body.data.find((item: any) => item.id === ids.placeVeryClose);

    expect(veryClosePlace).toBeDefined();
    // 4 and 5 stars -> avg 4.5, count 2. Pending/deleted are excluded.
    expect(veryClosePlace.rating.average).toBe(4.5);
    expect(veryClosePlace.rating.count).toBe(2);
  });

  // -------------------------------------------------------------
  // TEST GROUP H: GLOBAL ORDERING
  // -------------------------------------------------------------
  test('H1. Sorts globally by distance ASC, entity rank ASC, and UUID ASC', async () => {
    // Seed fixtures are:
    // Place Very Close (~10m), Attraction Very Close (~10m), Business Equal Distance (~10m)
    // Rank: Place (1) -> Attraction (2) -> Business (3)
    const response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=100`
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    const results = body.data.map((item: any) => ({
      id: item.id,
      entityType: item.entityType,
    }));

    // Check ranks order for equal distance
    const veryCloseIndex = results.findIndex((r: any) => r.id === ids.placeVeryClose);
    const attractionIndex = results.findIndex((r: any) => r.id === ids.attractionVeryClose);
    const businessIndex = results.findIndex((r: any) => r.id === ids.businessEqualDistance);

    expect(veryCloseIndex).toBeLessThan(attractionIndex);
    expect(attractionIndex).toBeLessThan(businessIndex);

    // Check UUID tie-breaker order for same distance and rank
    const placeEq1Index = results.findIndex((r: any) => r.id === ids.placeEqualDistance1);
    const placeEq2Index = results.findIndex((r: any) => r.id === ids.placeEqualDistance2);

    expect(veryCloseIndex).toBeLessThan(placeEq1Index);
    expect(placeEq1Index).toBeLessThan(placeEq2Index);
  });

  // -------------------------------------------------------------
  // TEST GROUP I: KEYSET PAGINATION
  // -------------------------------------------------------------
  test('I1. Paginations keyset roundtrip traverses all pages without duplicate or missing items', async () => {
    // 1. Get baseline (all active items in 5km radius with a large limit)
    const baselineResponse = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&limit=50`
    );
    expect(baselineResponse.status).toBe(200);
    const baselineBody = await baselineResponse.json();
    const baselineIds = baselineBody.data.map((item: any) => item.id);
    expect(baselineIds.length).toBeGreaterThan(4); // Ensure we have enough items to verify multiple pages

    // 2. Traverse page-by-page using limit = 2
    const collectedIds: string[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;
    let pageCount = 0;

    while (hasMore) {
      pageCount++;
      let url = `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&limit=2`;
      if (nextCursor) {
        url += `&cursor=${encodeURIComponent(nextCursor)}`;
      }

      const response = await app.request(url);
      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.data.length).toBeLessThanOrEqual(2);
      if (hasMore) {
        expect(body.data.length).toBeGreaterThan(0);
      }

      // Check for duplicates within paginated items
      for (const item of body.data) {
        expect(collectedIds).not.toContain(item.id);
        collectedIds.push(item.id);
      }

      hasMore = body.meta.hasMore;
      nextCursor = body.meta.nextCursor;

      // Safety break to prevent infinite loop in tests
      if (pageCount > 20) {
        throw new Error('Pagination loop exceeded 20 pages. Possible infinite loop.');
      }
    }

    // Verify last page has nextCursor null
    expect(nextCursor).toBeNull();

    // Verify the set of collected IDs matches baseline exactly
    expect(collectedIds).toHaveLength(baselineIds.length);
    for (const id of baselineIds) {
      expect(collectedIds).toContain(id);
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP J: CURSOR SECURITY
  // -------------------------------------------------------------
  test('J1. Rejects tampered cursor signature and mismatched query context', async () => {
    // 1. Tampered MAC
    const codec = container.resolve<NearbyCursorCodec>('NearbyCursorCodec');
    const query = {
      lat: origin.lat.toFixed(6),
      lng: origin.lng.toFixed(6),
      radius: 5000,
      types: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
      regionId: null,
      categoryId: null,
      minRating: null,
      limit: 20,
      sort: 'DISTANCE_ENTITY_TYPE_RANK_ENTITY_ID_ASC',
    } as const;
    const fingerprint = buildNearbyQueryFingerprint(query);
    const validCursor = codec.encode(
      {
        distance: '10.25531',
        entityType: 'TOURIST_PLACE',
        id: ids.placeVeryClose,
      },
      fingerprint
    );

    const tamperedCursor = `${validCursor.substring(0, validCursor.length - 5)}AAAAA`;
    let response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&cursor=${tamperedCursor}`
    );
    expect(response.status).toBe(400);
    let body = await response.json();
    expect(body.code).toBe('VAL_001');
    expect(getParamErrorReason(body.invalidParams, 'cursor')).toBeString();

    // 2. Query mismatch (e.g. changing radius from 5000 to 10000)
    response = await app.request(
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=10000&cursor=${validCursor}`
    );
    expect(response.status).toBe(400);
    body = await response.json();
    expect(body.code).toBe('VAL_001');
    expect(getParamErrorReason(body.invalidParams, 'cursor')).toBe('Query fingerprint mismatch');
  });

  // -------------------------------------------------------------
  // TEST GROUP K: HTTP PARAMETER VALIDATIONS
  // -------------------------------------------------------------
  test('K1. Invalid coordinate format and parameters rejected with 400 VAL_001', async () => {
    const cases = [
      ['/api/v1/nearby?lng=104.6644', 'lat'],
      ['/api/v1/nearby?lat=91.0&lng=104.6644', 'lat'],
      ['/api/v1/nearby?lat=22.7844&lng=181.0', 'lng'],
      ['/api/v1/nearby?lat=22.7844&lng=104.6644&radius=99', 'radius'],
      ['/api/v1/nearby?lat=22.7844&lng=104.6644&limit=51', 'limit'],
    ] as const;

    for (const [url, field] of cases) {
      const response = await app.request(url);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('VAL_001');
      expect(getParamErrorReason(body.invalidParams, field)).toBeString();
    }
  });

  // -------------------------------------------------------------
  // TEST GROUP L: PUBLIC RESPONSE CONTRACT
  // -------------------------------------------------------------
  test('L1. Response contract properties match expectations', async () => {
    const response = await app.request(`/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}`);
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body).toHaveProperty('error');
    expect(body.error).toBeNull();

    const firstItem = body.data[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('entityType');
    expect(firstItem).toHaveProperty('distanceMeters');
    expect(firstItem).not.toHaveProperty('rawDistanceMeters');
    expect(firstItem).not.toHaveProperty('entityTypeRank');
  });

  // -------------------------------------------------------------
  // TEST GROUP M: ERROR CONTRACT
  // -------------------------------------------------------------
  test('M1. Error response follows RFC 7807 problem details specification', async () => {
    const response = await app.request('/api/v1/nearby?lat=invalid-lat');
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');

    const body = await response.json();
    expect(body).toMatchObject({
      type: 'https://hoangsuphi.vn/errors/validation-failed',
      title: 'Validation Failed',
      status: 400,
      code: 'VAL_001',
    });
    expect(body.invalidParams).toBeArray();
  });
});
