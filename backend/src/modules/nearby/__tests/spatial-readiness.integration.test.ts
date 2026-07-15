import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import postgres from 'postgres';

const testDatabaseUrl = process.env.SEARCH_TEST_DATABASE_URL;
const integrationDescribe = testDatabaseUrl ? describe : describe.skip;

const origin = { lng: 104.6644, lat: 22.7844 }; // Bản Phùng Commune Center

const ids = {
  region: 'f2000000-0000-4000-8000-000000000001',
  // Tourist Places
  placeVeryClose: 'f5000000-0000-4000-8000-000000000001',
  placeWithin1km: 'f5000000-0000-4000-8000-000000000002',
  placeWithin5km: 'f5000000-0000-4000-8000-000000000003',
  placeOutside5km: 'f5000000-0000-4000-8000-000000000004',
  placeNearBoundary: 'f5000000-0000-4000-8000-000000000005',
  placeInactive: 'f5000000-0000-4000-8000-000000000006',
  placeDeleted: 'f5000000-0000-4000-8000-000000000007',
  // Categories & Types
  attractionCat: 'f3000000-0000-4000-8000-000000000001',
  utilityCat: 'f3000000-0000-4000-8000-000000000002',
  activeBusinessType: 'f4000000-0000-4000-8000-000000000001',
  inactiveBusinessType: 'f4000000-0000-4000-8000-000000000002',
  // Attractions & Businesses
  attractionVeryClose: 'f7000000-0000-4000-8000-000000000001',
  utilityWithin1km: 'f7000000-0000-4000-8000-000000000002',
  businessWithin5kmActiveType: 'f6000000-0000-4000-8000-000000000001',
  businessWithin5kmInactiveType: 'f6000000-0000-4000-8000-000000000002',
} as const;

integrationDescribe('PostgreSQL/PostGIS Spatial Data Readiness Integration', () => {
  let sql: ReturnType<typeof postgres>;

  async function cleanFixtures(): Promise<void> {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM tourist_places WHERE id IN (${ids.placeVeryClose}, ${ids.placeWithin1km}, ${ids.placeWithin5km}, ${ids.placeOutside5km}, ${ids.placeNearBoundary}, ${ids.placeInactive}, ${ids.placeDeleted})`;
      await tx`DELETE FROM attractions WHERE id IN (${ids.attractionVeryClose}, ${ids.utilityWithin1km})`;
      await tx`DELETE FROM businesses WHERE id IN (${ids.businessWithin5kmActiveType}, ${ids.businessWithin5kmInactiveType})`;
      await tx`DELETE FROM attraction_categories WHERE id IN (${ids.attractionCat}, ${ids.utilityCat})`;
      await tx`DELETE FROM business_types WHERE id IN (${ids.activeBusinessType}, ${ids.inactiveBusinessType})`;
      await tx`DELETE FROM regions WHERE id = ${ids.region}`;
    });
  }

  async function seedFixtures(): Promise<void> {
    await sql.begin(async (tx) => {
      // 1. Seed Region
      await tx`
        INSERT INTO regions (id, parent_id, name, slug, level, path, deleted_at)
        VALUES (${ids.region}, NULL, 'Bản Phùng Test', 'ban-phung-test', 3, 'ha_giang.hoang_su_phi.ban_phung_test'::ltree, NULL)
      `;

      // 2. Seed Categories & Types
      await tx`
        INSERT INTO attraction_categories (id, code, name, is_utility)
        VALUES
          (${ids.attractionCat}, 'attraction-test', 'Attraction Test', FALSE),
          (${ids.utilityCat}, 'utility-test', 'Utility Test', TRUE)
      `;
      await tx`
        INSERT INTO business_types (id, code, name, is_active)
        VALUES
          (${ids.activeBusinessType}, 'business-active-test', 'Business Active Test', TRUE),
          (${ids.inactiveBusinessType}, 'business-inactive-test', 'Business Inactive Test', FALSE)
      `;

      // 3. Seed Tourist Places
      // placeVeryClose: ~10m (104.6645, 22.7844)
      // placeWithin1km: ~370m (104.6680, 22.7844)
      // placeWithin5km: ~2.6km (104.6900, 22.7844)
      // placeOutside5km: ~7.7km (104.7400, 22.7844)
      // placeNearBoundary: ~4.8km (104.7120, 22.7844)
      await tx`
        INSERT INTO tourist_places (id, region_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.placeVeryClose}, ${ids.region}, 'Very Close Place', 'place-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeWithin1km}, ${ids.region}, 'Within 1km Place', 'place-within-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeWithin5km}, ${ids.region}, 'Within 5km Place', 'place-within-5km', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeOutside5km}, ${ids.region}, 'Outside 5km Place', 'place-outside-5km', ST_SetSRID(ST_MakePoint(104.7400, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeNearBoundary}, ${ids.region}, 'Near Boundary Place', 'place-near-boundary', ST_SetSRID(ST_MakePoint(104.7120, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.placeInactive}, ${ids.region}, 'Inactive Place', 'place-inactive', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'inactive', NULL),
          (${ids.placeDeleted}, ${ids.region}, 'Deleted Place', 'place-deleted', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP)
      `;

      // 4. Seed Attractions
      await tx`
        INSERT INTO attractions (id, region_id, category_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.attractionVeryClose}, ${ids.region}, ${ids.attractionCat}, 'Very Close Attraction', 'attraction-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.utilityWithin1km}, ${ids.region}, ${ids.utilityCat}, 'Within 1km Utility', 'utility-within-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL)
      `;

      // 5. Seed Businesses
      await tx`
        INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, status, deleted_at)
        VALUES
          (${ids.businessWithin5kmActiveType}, ${ids.region}, ${ids.activeBusinessType}, 'Within 5km Business Active Type', 'business-active-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
          (${ids.businessWithin5kmInactiveType}, ${ids.region}, ${ids.inactiveBusinessType}, 'Within 5km Business Inactive Type', 'business-inactive-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL)
      `;
    });
  }

  beforeAll(async () => {
    sql = postgres(testDatabaseUrl as string, { max: 2, prepare: false });
    const databaseRows = await sql<
      { databaseName: string }[]
    >`SELECT current_database() AS "databaseName"`;
    const databaseName = databaseRows[0]?.databaseName ?? '';
    if (!databaseName.endsWith('_test')) {
      await sql.end({ timeout: 5 });
      throw new Error('Spatial integration tests require a dedicated database ending in _test');
    }
    await cleanFixtures();
    await seedFixtures();
  });

  afterAll(async () => {
    if (!sql) return;
    await cleanFixtures();
    await sql.end({ timeout: 5 });
  });

  // 11.1 PostGIS availability
  test('PostGIS extension is enabled and version is acceptable', async () => {
    const ext = await sql`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'postgis'
    `;
    expect(ext.length).toBe(1);
    expect(ext[0]?.extname).toBe('postgis');

    const [result] = await sql`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(104.0, 22.0), 4326)::geography,
        ST_SetSRID(ST_MakePoint(104.0, 22.1), 4326)::geography,
        true
      ) as dist
    `;
    if (!result) throw new Error('Result not found');
    expect(Number(result.dist)).toBeGreaterThan(0);
  });

  // 11.2 Column metadata (Type, Subtype, SRID check for tourist_places, attractions, businesses)
  test('Spatial columns have geography(Point, 4326) type, subtype Point, and SRID 4326', async () => {
    const geoCols = await sql`
      SELECT f_table_name as table_name, f_geography_column as column_name, type, srid
      FROM geography_columns
      WHERE f_table_name IN ('tourist_places', 'attractions', 'businesses')
    `;
    expect(geoCols.length).toBe(3);

    const touristPlacesCol = geoCols.find((c) => c.table_name === 'tourist_places');
    const attractionsCol = geoCols.find((c) => c.table_name === 'attractions');
    const businessesCol = geoCols.find((c) => c.table_name === 'businesses');

    expect(touristPlacesCol?.column_name).toBe('location');
    expect(touristPlacesCol?.type).toBe('Point');
    expect(touristPlacesCol?.srid).toBe(4326);

    expect(attractionsCol?.column_name).toBe('location');
    expect(attractionsCol?.type).toBe('Point');
    expect(attractionsCol?.srid).toBe(4326);

    expect(businessesCol?.column_name).toBe('location');
    expect(businessesCol?.type).toBe('Point');
    expect(businessesCol?.srid).toBe(4326);
  });

  // 11.3 SRID on existing table fixtures
  test('Spatial fixtures location SRIDs are 4326 for all tables', async () => {
    const [placeResult] = await sql`
      SELECT ST_SRID(location::geometry) as srid FROM tourist_places WHERE id = ${ids.placeVeryClose}
    `;
    const [attractionResult] = await sql`
      SELECT ST_SRID(location::geometry) as srid FROM attractions WHERE id = ${ids.attractionVeryClose}
    `;
    const [businessResult] = await sql`
      SELECT ST_SRID(location::geometry) as srid FROM businesses WHERE id = ${ids.businessWithin5kmActiveType}
    `;
    if (!placeResult || !attractionResult || !businessResult) {
      throw new Error('Fixture results not found');
    }
    expect(Number(placeResult.srid)).toBe(4326);
    expect(Number(attractionResult.srid)).toBe(4326);
    expect(Number(businessResult.srid)).toBe(4326);
  });

  // 11.4 Longitude/latitude order regression
  test('Coordinate order persists X as longitude and Y as latitude for all tables', async () => {
    const [placeResult] = await sql`
      SELECT
        ST_X(location::geometry) as lng,
        ST_Y(location::geometry) as lat
      FROM tourist_places
      WHERE id = ${ids.placeVeryClose}
    `;
    const [attractionResult] = await sql`
      SELECT
        ST_X(location::geometry) as lng,
        ST_Y(location::geometry) as lat
      FROM attractions
      WHERE id = ${ids.attractionVeryClose}
    `;
    const [businessResult] = await sql`
      SELECT
        ST_X(location::geometry) as lng,
        ST_Y(location::geometry) as lat
      FROM businesses
      WHERE id = ${ids.businessWithin5kmActiveType}
    `;
    if (!placeResult || !attractionResult || !businessResult) {
      throw new Error('Fixture coordinate results not found');
    }
    expect(Number(placeResult.lng)).toBeCloseTo(104.6645, 6);
    expect(Number(placeResult.lat)).toBeCloseTo(22.7844, 6);
    expect(Number(attractionResult.lng)).toBeCloseTo(104.6645, 6);
    expect(Number(attractionResult.lat)).toBeCloseTo(22.7844, 6);
    expect(Number(businessResult.lng)).toBeCloseTo(104.69, 6);
    expect(Number(businessResult.lat)).toBeCloseTo(22.7844, 6);
  });

  // 11.5 Distance unit
  test('ST_Distance calculation is computed in meters on WGS84 spheroid', async () => {
    // Distance between (104.6644, 22.7844) and (104.6680, 22.7844) is ~369.5m
    const [result] = await sql`
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
        location,
        true
      ) as dist
      FROM tourist_places
      WHERE id = ${ids.placeWithin1km}
    `;
    if (!result) throw new Error('Distance result not found');
    const distanceMeters = Number(result.dist);
    expect(distanceMeters).toBeGreaterThan(360);
    expect(distanceMeters).toBeLessThan(380);
  });

  // 11.6 ST_DWithin sanity
  test('ST_DWithin correctly filters by radius in meters', async () => {
    // Within 1000m: very close (~10m) and within 1km (~370m) are TRUE; within 5km (~2.6km) is FALSE
    const rows = await sql`
      SELECT id, name,
        ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
          1000,
          true
        ) as is_within
      FROM tourist_places
      WHERE id IN (${ids.placeVeryClose}, ${ids.placeWithin1km}, ${ids.placeWithin5km})
      ORDER BY id
    `;

    const veryClose = rows.find((r) => r.id === ids.placeVeryClose);
    const within1km = rows.find((r) => r.id === ids.placeWithin1km);
    const within5km = rows.find((r) => r.id === ids.placeWithin5km);

    expect(veryClose?.is_within).toBe(true);
    expect(within1km?.is_within).toBe(true);
    expect(within5km?.is_within).toBe(false);
  });

  // 11.7 GiST indexes validation (checking indisvalid, indisready, column targets, and duplicates)
  test('Catalog has valid, ready, and active GiST spatial indexes on the location column', async () => {
    const indexes = await sql`
      SELECT
        t.relname as table_name,
        i.relname as index_name,
        idx.indisvalid,
        idx.indisready,
        a.attname as column_name
      FROM pg_index idx
      JOIN pg_class t ON t.oid = idx.indrelid
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
      WHERE t.relname IN ('tourist_places', 'attractions', 'businesses')
        AND a.attname = 'location'
        AND i.relname IN ('tourist_places_location_gist_idx', 'attractions_location_gist_idx', 'businesses_location_gist_idx')
    `;
    expect(indexes.length).toBe(3);

    const tpIndex = indexes.find((idx) => idx.table_name === 'tourist_places');
    const attIndex = indexes.find((idx) => idx.table_name === 'attractions');
    const busIndex = indexes.find((idx) => idx.table_name === 'businesses');

    expect(tpIndex?.index_name).toBe('tourist_places_location_gist_idx');
    expect(tpIndex?.indisvalid).toBe(true);
    expect(tpIndex?.indisready).toBe(true);
    expect(tpIndex?.column_name).toBe('location');

    expect(attIndex?.index_name).toBe('attractions_location_gist_idx');
    expect(attIndex?.indisvalid).toBe(true);
    expect(attIndex?.indisready).toBe(true);
    expect(attIndex?.column_name).toBe('location');

    expect(busIndex?.index_name).toBe('businesses_location_gist_idx');
    expect(busIndex?.indisvalid).toBe(true);
    expect(busIndex?.indisready).toBe(true);
    expect(busIndex?.column_name).toBe('location');

    // Duplicate check: ensure there is only one GiST index per table on the location column
    const duplicates = await sql`
      SELECT t.relname as table_name, count(i.relname) as index_count
      FROM pg_index idx
      JOIN pg_class t ON t.oid = idx.indrelid
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_am am ON am.oid = i.relam
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
      WHERE t.relname IN ('tourist_places', 'attractions', 'businesses')
        AND a.attname = 'location'
        AND am.amname = 'gist'
      GROUP BY t.relname
    `;
    expect(duplicates.length).toBe(3);
    for (const d of duplicates) {
      expect(Number(d.index_count)).toBe(1);
    }
  });

  // 12. STRUCTURAL COMPATIBILITY TEST (FORCED INDEX EXPLAIN)
  test('Structural compatibility: EXPLAIN forced index scan confirms index usage and operators compatibility', async () => {
    await sql.begin(async (tx) => {
      // Force index scans for very small / empty tables in this transaction
      await tx`SET LOCAL enable_seqscan = off`;

      for (const table of ['tourist_places', 'attractions', 'businesses']) {
        const explainRows = await tx`
          EXPLAIN (ANALYZE, BUFFERS)
          SELECT id
          FROM ${tx(table)}
          WHERE ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
            5000,
            true
          )
        `;
        const planText = explainRows.map((r) => r['QUERY PLAN']).join('\n');
        console.info(`--- Explain forced index plan for ${table} ---`);
        console.info(planText);
        console.info('----------------------------------------------');

        expect(planText).toContain('Index Scan');
        expect(planText).toContain(`${table}_location_gist_idx`);
      }
    });
  });

  // 13. NATIVE PLANNER INDEX SCAN VERIFICATION (NATURAL EXPLAIN)
  test('Native planner behavior: EXPLAIN query plan naturally selects spatial GiST indexes under selectivity', async () => {
    await sql
      .begin(async (tx) => {
        // 1. Temporarily insert 2000 mock points for tourist_places
        await tx`
        INSERT INTO tourist_places (id, region_id, name, slug, location, status)
        SELECT
          (md5(i::text || random()::text)::uuid),
          ${ids.region},
          'Mock Place ' || i,
          'mock-place-' || i,
          ST_SetSRID(ST_MakePoint(104.6 + (i % 50) * 0.001, 22.7 + (i / 50) * 0.001), 4326)::geography,
          'active'
        FROM generate_series(1, 2000) as i
      `;

        // 2. Temporarily insert 2000 mock points for attractions
        await tx`
        INSERT INTO attractions (id, region_id, category_id, name, slug, location, status)
        SELECT
          (md5(i::text || random()::text)::uuid),
          ${ids.region},
          ${ids.attractionCat},
          'Mock Attraction ' || i,
          'mock-attraction-' || i,
          ST_SetSRID(ST_MakePoint(104.6 + (i % 50) * 0.001, 22.7 + (i / 50) * 0.001), 4326)::geography,
          'active'
        FROM generate_series(1, 2000) as i
      `;

        // 3. Temporarily insert 2000 mock points for businesses
        await tx`
        INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, status)
        SELECT
          (md5(i::text || random()::text)::uuid),
          ${ids.region},
          ${ids.activeBusinessType},
          'Mock Business ' || i,
          'mock-business-' || i,
          ST_SetSRID(ST_MakePoint(104.6 + (i % 50) * 0.001, 22.7 + (i / 50) * 0.001), 4326)::geography,
          'active'
        FROM generate_series(1, 2000) as i
      `;

        // 4. Run ANALYZE inside the transaction block to update planner stats
        await tx`ANALYZE tourist_places`;
        await tx`ANALYZE attractions`;
        await tx`ANALYZE businesses`;

        // 5. Run EXPLAIN without seqscan disabled
        for (const table of ['tourist_places', 'attractions', 'businesses']) {
          const explainRows = await tx`
          EXPLAIN (ANALYZE, BUFFERS)
          SELECT id
          FROM ${tx(table)}
          WHERE ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${origin.lng}, ${origin.lat}), 4326)::geography,
            500, -- Small 500m radius gives high selectivity
            true
          )
        `;
          const planText = explainRows.map((r) => r['QUERY PLAN']).join('\n');
          console.info(`--- Explain natural planner plan for ${table} ---`);
          console.info(planText);
          console.info('-------------------------------------------------');

          // Assert that the native planner naturally selected the location GiST index scan
          expect(planText).toContain('Index Scan');
          expect(planText).toContain(`${table}_location_gist_idx`);
        }

        // Rollback transaction to keep test database completely clean
        throw new Error('FORCE_ROLLBACK');
      })
      .catch((err) => {
        if (err.message !== 'FORCE_ROLLBACK') throw err;
      });
  });
});
