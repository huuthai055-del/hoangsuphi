import fs from 'node:fs';
import path from 'node:path';
import type { Hono } from 'hono';
import postgres from 'postgres';
import type {
  INearbyRepository,
  NearbySearchCriteria,
} from '../repository/nearby-repository.interface';
import { generateRepositoryExplainEvidence } from './nearby-benchmark-explain';
import { requireDedicatedBenchmarkDatabase } from './nearby-benchmark-safety';

const mode = process.argv[2];
const validModes = ['--seed', '--run', '--cleanup'] as const;

if (!mode || !(validModes as readonly string[]).includes(mode)) {
  console.error(
    'Usage: bun src/modules/nearby/benchmark/run-nearby-benchmark.ts [--seed | --run | --cleanup]'
  );
  process.exit(1);
}

const databaseUrl = (() => {
  const value = process.env.NEARBY_BENCHMARK_DATABASE_URL;
  if (!value) {
    throw new Error('NEARBY_BENCHMARK_DATABASE_URL must be set to a dedicated benchmark database.');
  }
  return value;
})();

const benchmarkDatabaseName = requireDedicatedBenchmarkDatabase(databaseUrl);

const BENCHMARK_ITERATIONS = 30;

// Set env for DI registration
process.env.DATABASE_URL = databaseUrl;
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_ANON_MAX = '1000000';
process.env.RATE_LIMIT_AUTH_MAX = '1000000';

// Helper for deterministic UUID generation to simulate keyset benchmarks
function benchmarkUuid(namespace: string, ordinal: number): string {
  const crypto = require('node:crypto');
  const hex = crypto
    .createHash('md5')
    .update(`hsp-nearby-benchmark:${namespace}:${ordinal}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function main() {
  const sql = postgres(databaseUrl, { max: 5, prepare: false });

  if (mode === '--seed') {
    try {
      await seed(sql);
    } finally {
      await sql.end();
    }
    return;
  }

  if (mode === '--cleanup') {
    try {
      await cleanup(sql);
    } finally {
      await sql.end();
    }
    return;
  }

  // Otherwise, it's --run
  console.log('Initializing application context for benchmark...');
  // Force App initialisation to load DI container with overridden RATE_LIMIT envs
  const { createApp } = await import('../../../app');
  const { container } = await import('@/common/di/container');
  const app = createApp();
  const repo = container.resolve<INearbyRepository>('NearbyRepository');

  try {
    await runBenchmarks(app, repo, sql);
  } finally {
    await sql.end();
  }
}

async function seed(sql: postgres.Sql) {
  console.log('Seeding production-like benchmark dataset...');
  await cleanup(sql);

  // 1. Users
  console.log('Inserting 100 benchmark users...');
  await sql`
    INSERT INTO users (id, email, password_hash, status)
    SELECT
      md5('hsp-nearby-benchmark:user:' || i)::uuid,
      'benchmark-user-' || i || '@example.invalid',
      '$not-real$',
      'active'
    FROM generate_series(1, 100) AS source(i)
    ON CONFLICT (id) DO NOTHING;
  `;

  // 2. Region Parent
  console.log('Inserting parent region...');
  await sql`
    INSERT INTO regions (id, parent_id, name, slug, level, path)
    VALUES ('b1200000-0000-4000-8000-000000000001', NULL, 'benchmark-region-parent', 'benchmark-region-parent', 3, 'ha_giang.hoang_su_phi.bench_parent'::ltree)
    ON CONFLICT (id) DO NOTHING;
  `;

  // 3. Child regions
  console.log('Inserting 9 child regions...');
  await sql`
    INSERT INTO regions (id, parent_id, name, slug, level, path)
    SELECT
      md5('hsp-nearby-benchmark:region:' || i)::uuid,
      'b1200000-0000-4000-8000-000000000001',
      'benchmark-region-' || i,
      'benchmark-region-' || i,
      4,
      text2ltree('ha_giang.hoang_su_phi.bench_parent.bench_child_' || i)
    FROM generate_series(2, 10) AS source(i)
    ON CONFLICT (id) DO NOTHING;
  `;

  // 4. Categories (5 types: odd is attraction, even is utility)
  console.log('Inserting 5 categories...');
  await sql`
    INSERT INTO attraction_categories (id, code, name, is_utility)
    SELECT
      md5('hsp-nearby-benchmark:category:' || i)::uuid,
      'benchmark-category-' || i,
      'Benchmark Category ' || i,
      i % 2 = 0
    FROM generate_series(1, 5) AS source(i)
    ON CONFLICT (id) DO NOTHING;
  `;

  // 5. Business Types (5 types: odd is active, even is inactive)
  console.log('Inserting 5 business types...');
  await sql`
    INSERT INTO business_types (id, code, name, is_active)
    SELECT
      md5('hsp-nearby-benchmark:businesstype:' || i)::uuid,
      'benchmark-businesstype-' || i,
      'Benchmark Business Type ' || i,
      i % 2 = 1
    FROM generate_series(1, 5) AS source(i)
    ON CONFLICT (id) DO NOTHING;
  `;

  // 6. Tourist Places (1,200 rows with varying offsets)
  console.log('Inserting 1,200 tourist places...');
  await sql`
    INSERT INTO tourist_places (id, region_id, name, slug, location, status, deleted_at)
    SELECT
      md5('hsp-nearby-benchmark:place:' || i)::uuid,
      md5('hsp-nearby-benchmark:region:' || (2 + (i % 9)))::uuid,
      'benchmark-place-' || i,
      'benchmark-place-' || i,
      ST_SetSRID(ST_MakePoint(
        104.6644 + sin(i) * CASE (i % 6)
          WHEN 0 THEN 0.0001
          WHEN 1 THEN 0.003
          WHEN 2 THEN 0.015
          WHEN 3 THEN 0.04
          WHEN 4 THEN 0.12
          ELSE 0.25
        END,
        22.7844 + cos(i) * CASE (i % 6)
          WHEN 0 THEN 0.0001
          WHEN 1 THEN 0.003
          WHEN 2 THEN 0.015
          WHEN 3 THEN 0.04
          WHEN 4 THEN 0.12
          ELSE 0.25
        END
      ), 4326)::geography,
      CASE WHEN i % 20 = 0 THEN 'inactive' ELSE 'active' END,
      CASE WHEN i % 50 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM generate_series(1, 1200) AS source(i);
  `;

  // 7. Attractions & Utilities (2,500 rows)
  console.log('Inserting 2,500 attractions...');
  await sql`
    INSERT INTO attractions (id, region_id, category_id, name, slug, location, status, deleted_at)
    SELECT
      md5('hsp-nearby-benchmark:attraction:' || i)::uuid,
      md5('hsp-nearby-benchmark:region:' || (2 + (i % 9)))::uuid,
      md5('hsp-nearby-benchmark:category:' || (1 + (i % 5)))::uuid,
      'benchmark-attraction-' || i,
      'benchmark-attraction-' || i,
      ST_SetSRID(ST_MakePoint(
        104.6644 + sin(i + 1) * CASE (i % 6)
          WHEN 0 THEN 0.0001
          WHEN 1 THEN 0.003
          WHEN 2 THEN 0.015
          WHEN 3 THEN 0.04
          WHEN 4 THEN 0.12
          ELSE 0.25
        END,
        22.7844 + cos(i + 1) * CASE (i % 6)
          WHEN 0 THEN 0.0001
          WHEN 1 THEN 0.003
          WHEN 2 THEN 0.015
          WHEN 3 THEN 0.04
          WHEN 4 THEN 0.12
          ELSE 0.25
        END
      ), 4326)::geography,
      CASE WHEN i % 20 = 0 THEN 'inactive' ELSE 'active' END,
      CASE WHEN i % 50 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM generate_series(1, 2500) AS source(i);
  `;

  // 8. Businesses (6,000 rows)
  console.log('Inserting 6,000 businesses...');
  await sql`
    INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, status, deleted_at)
    SELECT
      md5('hsp-nearby-benchmark:business:' || i)::uuid,
      md5('hsp-nearby-benchmark:region:' || (2 + (i % 9)))::uuid,
      md5('hsp-nearby-benchmark:businesstype:' || (1 + (i % 5)))::uuid,
      'benchmark-business-' || i,
      'benchmark-business-' || i,
      ST_SetSRID(ST_MakePoint(
        104.6644 + sin(i + 2) * CASE (i % 6)
          WHEN 0 THEN 0.0001
          WHEN 1 THEN 0.003
          WHEN 2 THEN 0.015
          WHEN 3 THEN 0.04
          WHEN 4 THEN 0.12
          ELSE 0.25
        END,
        22.7844 + cos(i + 2) * CASE (i % 6)
          WHEN 0 THEN 0.0001
          WHEN 1 THEN 0.003
          WHEN 2 THEN 0.015
          WHEN 3 THEN 0.04
          WHEN 4 THEN 0.12
          ELSE 0.25
        END
      ), 4326)::geography,
      CASE WHEN i % 20 = 0 THEN 'inactive' ELSE 'active' END,
      CASE WHEN i % 50 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM generate_series(1, 6000) AS source(i);
  `;

  // 9. Insert Reviews (one unique review per entity to avoid constraint violation)
  console.log('Inserting benchmark reviews...');
  await sql`
    INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
    SELECT
      md5('hsp-nearby-benchmark:review:place:' || i)::uuid,
      md5('hsp-nearby-benchmark:user:' || (1 + (i % 100)))::uuid,
      'PLACE'::public.owner_type,
      md5('hsp-nearby-benchmark:place:' || i)::uuid,
      1 + (i % 5),
      'Đánh giá benchmark place ' || i,
      'Review content place ' || i,
      CASE WHEN i % 20 = 0 THEN 'PENDING'::public.review_status WHEN i % 30 = 0 THEN 'REJECTED'::public.review_status ELSE 'APPROVED'::public.review_status END,
      CASE WHEN i % 50 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM generate_series(1, 1200) AS source(i);
  `;
  await sql`
    INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
    SELECT
      md5('hsp-nearby-benchmark:review:attraction:' || i)::uuid,
      md5('hsp-nearby-benchmark:user:' || (1 + (i % 100)))::uuid,
      'ATTRACTION'::public.owner_type,
      md5('hsp-nearby-benchmark:attraction:' || i)::uuid,
      1 + (i % 5),
      'Đánh giá benchmark attraction ' || i,
      'Review content attraction ' || i,
      CASE WHEN i % 20 = 0 THEN 'PENDING'::public.review_status WHEN i % 30 = 0 THEN 'REJECTED'::public.review_status ELSE 'APPROVED'::public.review_status END,
      CASE WHEN i % 50 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM generate_series(1, 2500) AS source(i);
  `;
  await sql`
    INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
    SELECT
      md5('hsp-nearby-benchmark:review:business:' || i)::uuid,
      md5('hsp-nearby-benchmark:user:' || (1 + (i % 100)))::uuid,
      'BUSINESS'::public.owner_type,
      md5('hsp-nearby-benchmark:business:' || i)::uuid,
      1 + (i % 5),
      'Đánh giá benchmark business ' || i,
      'Review content business ' || i,
      CASE WHEN i % 20 = 0 THEN 'PENDING'::public.review_status WHEN i % 30 = 0 THEN 'REJECTED'::public.review_status ELSE 'APPROVED'::public.review_status END,
      CASE WHEN i % 50 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM generate_series(1, 6000) AS source(i);
  `;

  console.log('Running ANALYZE...');
  await sql`ANALYZE users`;
  await sql`ANALYZE regions`;
  await sql`ANALYZE attraction_categories`;
  await sql`ANALYZE business_types`;
  await sql`ANALYZE tourist_places`;
  await sql`ANALYZE attractions`;
  await sql`ANALYZE businesses`;
  await sql`ANALYZE reviews`;

  console.log('Seeding benchmark dataset complete!');
}

async function cleanup(sql: postgres.Sql) {
  console.log('Cleaning up benchmark records...');
  await sql`DELETE FROM reviews WHERE title LIKE 'Đánh giá benchmark %'`;
  await sql`DELETE FROM tourist_places WHERE name LIKE 'benchmark-place-%'`;
  await sql`DELETE FROM attractions WHERE name LIKE 'benchmark-attraction-%'`;
  await sql`DELETE FROM businesses WHERE name LIKE 'benchmark-business-%'`;
  await sql`DELETE FROM business_types WHERE name LIKE 'Benchmark Business Type %'`;
  await sql`DELETE FROM attraction_categories WHERE name LIKE 'Benchmark Category %'`;
  await sql`DELETE FROM regions WHERE name LIKE 'benchmark-region-%' OR name = 'benchmark-region-parent'`;
  await sql`DELETE FROM users WHERE email LIKE 'benchmark-user-%@example.invalid'`;
  console.log('Cleanup complete!');
}

interface LatencyStats {
  min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  avg: number;
  stdDev: number;
}

interface BenchmarkHttpBody {
  data: unknown[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    totalReturned: number;
  };
  error: null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function requestSuccessfulNearby(app: Hono, url: string): Promise<BenchmarkHttpBody> {
  const response = await app.request(url);
  const body: unknown = await response.json();
  if (response.status !== 200) {
    throw new Error(`Nearby HTTP benchmark returned ${response.status} for ${url}`);
  }
  if (
    !isRecord(body) ||
    !Array.isArray(body.data) ||
    !isRecord(body.meta) ||
    body.error !== null ||
    typeof body.meta.hasMore !== 'boolean' ||
    typeof body.meta.totalReturned !== 'number' ||
    !('nextCursor' in body.meta)
  ) {
    throw new Error(`Nearby HTTP benchmark returned an invalid success envelope for ${url}`);
  }
  if (body.meta.totalReturned !== body.data.length) {
    throw new Error(`Nearby HTTP benchmark returned inconsistent totalReturned for ${url}`);
  }

  return body as unknown as BenchmarkHttpBody;
}

function calculateStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    throw new Error('Cannot calculate latency statistics without samples');
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
  const percentile = (value: number) => sorted[Math.ceil(sorted.length * value) - 1] ?? max;
  const p50 = percentile(0.5);
  const p95 = percentile(0.95);
  const p99 = percentile(0.99);

  const variance = sorted.reduce((sum, val) => sum + (val - avg) ** 2, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return { min, p50, p95, p99, max, avg, stdDev };
}

interface BenchmarkDataset {
  touristPlaces: number;
  attractions: number;
  businesses: number;
  reviews: number;
}

async function inspectBenchmarkDataset(client: postgres.Sql): Promise<BenchmarkDataset> {
  const [counts] = await client<BenchmarkDataset[]>`
    SELECT
      (SELECT COUNT(*)::integer FROM tourist_places WHERE name LIKE 'benchmark-place-%') AS "touristPlaces",
      (SELECT COUNT(*)::integer FROM attractions WHERE name LIKE 'benchmark-attraction-%') AS "attractions",
      (SELECT COUNT(*)::integer FROM businesses WHERE name LIKE 'benchmark-business-%') AS "businesses",
      (
        SELECT COUNT(*)::integer
        FROM reviews
        WHERE owner_id IN (
          SELECT id FROM tourist_places WHERE name LIKE 'benchmark-place-%'
          UNION ALL
          SELECT id FROM attractions WHERE name LIKE 'benchmark-attraction-%'
          UNION ALL
          SELECT id FROM businesses WHERE name LIKE 'benchmark-business-%'
        )
      ) AS "reviews"
  `;
  if (!counts) {
    throw new Error('Could not inspect the benchmark dataset');
  }
  if (
    counts.touristPlaces !== 1200 ||
    counts.attractions !== 2500 ||
    counts.businesses !== 6000 ||
    counts.reviews !== 9700
  ) {
    throw new Error(
      `Benchmark dataset is incomplete: ${JSON.stringify(counts)}. Run db:nearby:benchmark:seed.`
    );
  }
  return counts;
}

async function runBenchmarks(app: Hono, repo: INearbyRepository, sql: postgres.Sql) {
  const origin = { lat: 22.7844, lng: 104.6644 };
  const regionId = benchmarkUuid('region', 2);
  const categoryId = benchmarkUuid('category', 1); // is_utility=false (Attraction)
  const utilityCategoryId = benchmarkUuid('category', 2); // is_utility=true (Utility)
  const businessTypeId = benchmarkUuid('businesstype', 1);
  const dataset = await inspectBenchmarkDataset(sql);

  // Define Benchmark Matrix Scenarios
  interface ScenarioDef {
    id: string;
    description: string;
    url: string;
    criteria: NearbySearchCriteria;
    expectedRows?: 'nonempty' | 'empty';
  }

  const scenarios: ScenarioDef[] = [
    // Scenario A: Radius
    {
      id: 'A1',
      description: 'Radius 100m',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=100`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 100,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'A2',
      description: 'Radius 1km',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=1000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 1000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'A3',
      description: 'Radius 5km',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'A4',
      description: 'Radius 10km',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=10000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 10000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'A5',
      description: 'Radius 25km',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=25000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 25000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'A6',
      description: 'Radius 50km',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=50000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 50000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },

    // Scenario B: Entity Types
    {
      id: 'B1',
      description: 'Only Tourist Place (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=place`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE'],
        limit: 20,
      },
    },
    {
      id: 'B2',
      description: 'Only Attraction (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=attraction`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['ATTRACTION'],
        limit: 20,
      },
    },
    {
      id: 'B3',
      description: 'Only Business (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=business`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['BUSINESS'],
        limit: 20,
      },
    },
    {
      id: 'B4',
      description: 'Only Utility (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=utility`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'B5',
      description: 'Attraction + Utility (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=attraction,utility`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['ATTRACTION', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'B6',
      description: 'All 4 types (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },

    // Scenario C: Filters
    {
      id: 'C1',
      description: 'No filters (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'C2',
      description: 'Region filter (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&regionId=${regionId}`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        regionId,
        limit: 20,
      },
    },
    {
      id: 'C3',
      description: 'Category filter [Attraction] (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=attraction&categoryId=${categoryId}`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['ATTRACTION'],
        categoryId,
        limit: 20,
      },
    },
    {
      id: 'C4',
      description: 'Category filter [Utility] (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=utility&categoryId=${utilityCategoryId}`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['UTILITY'],
        categoryId: utilityCategoryId,
        limit: 20,
      },
    },
    {
      id: 'C5',
      description: 'Category filter [Business] (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&types=business&categoryId=${businessTypeId}`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['BUSINESS'],
        categoryId: businessTypeId,
        limit: 20,
      },
    },
    {
      id: 'C6',
      description: 'MinRating filter (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&minRating=4.0`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        minRating: '4.0',
        limit: 20,
      },
    },
    {
      id: 'C7',
      description: 'Region + MinRating (5km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&regionId=${regionId}&minRating=3.0`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        regionId,
        minRating: '3.0',
        limit: 20,
      },
    },
    {
      id: 'C8',
      description: 'Filter empty result (5km)',
      url: `/api/v1/nearby?lat=10.0&lng=10.0&radius=5000&regionId=${regionId}`,
      criteria: {
        latitude: '10.0',
        longitude: '10.0',
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        regionId,
        limit: 20,
      },
      expectedRows: 'empty',
    },

    // Scenario D: Pagination
    {
      id: 'D1',
      description: 'Page 1, limit 20',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&limit=20`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'D2',
      description: 'Page 1, limit 50',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&limit=50`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 50,
      },
    },

    // Scenario E: Density
    {
      id: 'E1',
      description: 'Low density (100m)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=100`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 100,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'E2',
      description: 'High density (10km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=10000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 10000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'E3',
      description: 'All items (50km)',
      url: `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=50000`,
      criteria: {
        latitude: String(origin.lat),
        longitude: String(origin.lng),
        radiusMeters: 50000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
    },
    {
      id: 'E4',
      description: 'Zero items (far coordinates)',
      url: '/api/v1/nearby?lat=10.0&lng=10.0',
      criteria: {
        latitude: '10.0',
        longitude: '10.0',
        radiusMeters: 5000,
        entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
        limit: 20,
      },
      expectedRows: 'empty',
    },
  ];

  console.log('\nRunning warmups for benchmark scenarios...');
  // Warmup runs. Any invalid URL, error response, or scenario mismatch fails the benchmark.
  for (const s of scenarios) {
    const repositoryPage = await repo.searchNearby(s.criteria);
    const body = await requestSuccessfulNearby(app, s.url);
    const shouldBeEmpty = s.expectedRows === 'empty';
    if (shouldBeEmpty && (repositoryPage.items.length !== 0 || body.data.length !== 0)) {
      throw new Error(`${s.id} was expected to return no rows`);
    }
    if (!shouldBeEmpty && (repositoryPage.items.length === 0 || body.data.length === 0)) {
      throw new Error(`${s.id} was expected to return representative rows`);
    }
  }

  type BenchmarkResult = {
    scenario: string;
    description: string;
    rows: number;
    dbP50: number;
    dbP95: number;
    dbP99: number;
    dbMax: number;
    httpP50: number;
    httpP95: number;
    httpP99: number;
    httpMax: number;
    dbSamplesMs: number[];
    httpSamplesMs: number[];
  };
  const results: BenchmarkResult[] = [];

  console.log(`Running benchmark scenarios (${BENCHMARK_ITERATIONS} iterations each)...`);
  for (const s of scenarios) {
    const dbTimes: number[] = [];
    const httpTimes: number[] = [];
    let returnedCount = 0;

    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      // 1. Measure DB query directly via repository
      const dbStart = performance.now();
      const dbResult = await repo.searchNearby(s.criteria);
      dbTimes.push(performance.now() - dbStart);
      returnedCount = dbResult.items.length;

      // 2. Measure E2E HTTP call
      const httpStart = performance.now();
      const body = await requestSuccessfulNearby(app, s.url);
      httpTimes.push(performance.now() - httpStart);
      if (body.data.length !== Math.min(returnedCount, s.criteria.limit)) {
        throw new Error(`${s.id} repository and HTTP row counts diverged`);
      }
    }

    const dbStats = calculateStats(dbTimes);
    const httpStats = calculateStats(httpTimes);

    results.push({
      scenario: s.id,
      description: s.description,
      rows: returnedCount,
      dbP50: dbStats.p50,
      dbP95: dbStats.p95,
      dbP99: dbStats.p99,
      dbMax: dbStats.max,
      httpP50: httpStats.p50,
      httpP95: httpStats.p95,
      httpP99: httpStats.p99,
      httpMax: httpStats.max,
      dbSamplesMs: dbTimes,
      httpSamplesMs: httpTimes,
    });

    console.log(
      `Finished ${s.id}: ${s.description} (Returned rows: ${returnedCount}, DB P50: ${dbStats.p50.toFixed(2)}ms, HTTP P50: ${httpStats.p50.toFixed(2)}ms)`
    );
  }

  // Handle Dynamic Scenarios (Scenario D3)
  try {
    const pageOneCriteria: NearbySearchCriteria = {
      latitude: String(origin.lat),
      longitude: String(origin.lng),
      radiusMeters: 5000,
      entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
      limit: 20,
    };
    const pageOneRepository = await repo.searchNearby(pageOneCriteria);
    const exactLastItem = pageOneRepository.items[19];
    const p1Body = await requestSuccessfulNearby(
      app,
      `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&limit=20`
    );
    const cursor = p1Body.meta.nextCursor;

    if (cursor && exactLastItem) {
      const d3Times: number[] = [];
      const d3HttpTimes: number[] = [];
      const d3Criteria: NearbySearchCriteria = {
        ...pageOneCriteria,
        after: {
          rawDistanceMeters: exactLastItem.rawDistanceMeters,
          entityType: exactLastItem.entityType,
          entityTypeRank: exactLastItem.entityTypeRank,
          entityId: exactLastItem.entityId,
        },
      };

      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const dbStart = performance.now();
        const repositoryPage = await repo.searchNearby(d3Criteria);
        d3Times.push(performance.now() - dbStart);

        const httpStart = performance.now();
        const body = await requestSuccessfulNearby(
          app,
          `/api/v1/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=5000&limit=20&cursor=${encodeURIComponent(cursor)}`
        );
        d3HttpTimes.push(performance.now() - httpStart);
        if (body.data.length !== Math.min(repositoryPage.items.length, d3Criteria.limit)) {
          throw new Error('D3 repository and HTTP row counts diverged');
        }
      }

      const dbStats = calculateStats(d3Times);
      const httpStats = calculateStats(d3HttpTimes);

      results.push({
        scenario: 'D3',
        description: 'Page 2 with cursor (5km, limit 20)',
        rows: 20,
        dbP50: dbStats.p50,
        dbP95: dbStats.p95,
        dbP99: dbStats.p99,
        dbMax: dbStats.max,
        httpP50: httpStats.p50,
        httpP95: httpStats.p95,
        httpP99: httpStats.p99,
        httpMax: httpStats.max,
        dbSamplesMs: d3Times,
        httpSamplesMs: d3HttpTimes,
      });
      console.log(
        `Finished D3: Page 2 with cursor (DB P50: ${dbStats.p50.toFixed(2)}ms, HTTP P50: ${httpStats.p50.toFixed(2)}ms)`
      );
    } else {
      throw new Error('D3 could not obtain an exact page-one keyset and signed HTTP cursor');
    }
  } catch (error) {
    throw new Error('Failed to run cursor pagination benchmark', { cause: error });
  }

  // Print results table in markdown format
  console.log('\n========================================================================');
  console.log('BENCHMARK RESULTS SUMMARY TABLE');
  console.log('========================================================================');
  console.log(
    '| Scenario | Description | Rows | P50 DB | P95 DB | P99 DB | Max DB | P50 HTTP | P95 HTTP | P99 HTTP |'
  );
  console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of results) {
    console.log(
      `| ${r.scenario} | ${r.description} | ${r.rows} | ${r.dbP50.toFixed(2)} | ${r.dbP95.toFixed(2)} | ${r.dbP99.toFixed(2)} | ${r.dbMax.toFixed(2)} | ${r.httpP50.toFixed(2)} | ${r.httpP95.toFixed(2)} | ${r.httpP99.toFixed(2)} |`
    );
  }
  console.log('========================================================================\n');

  const tightRadiusResult = results.find((result) => result.scenario === 'A5');
  if (!tightRadiusResult || tightRadiusResult.dbP95 >= 150) {
    throw new Error(
      `Nearby 25km DB p95 gate failed: ${tightRadiusResult?.dbP95.toFixed(2) ?? 'missing'}ms`
    );
  }

  const evidenceDirectory = path.resolve(process.cwd(), 'docs/benchmark-evidence');
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDirectory, 'benchmark-results.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        databaseName: benchmarkDatabaseName,
        iterationsPerScenario: BENCHMARK_ITERATIONS,
        percentileMethod: 'nearest-rank',
        dataset,
        results,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  // Generate EXPLAIN evidence outputs
  await generateExplainEvidence(sql, scenarios);

  // Concurrency sanity checks
  await runConcurrencySanityCheck(app);
}

async function generateExplainEvidence(
  client: postgres.Sql,
  scenarios: readonly {
    id: string;
    criteria: NearbySearchCriteria;
  }[]
): Promise<void> {
  console.log('Generating EXPLAIN evidence from the current repository SQL...');
  const evidenceDirectory = path.resolve(process.cwd(), 'docs/benchmark-evidence');
  const evidenceDefinitions = [
    ['01_tourist_place_5km.txt', 'B1'],
    ['02_attraction_5km.txt', 'B2'],
    ['03_business_5km.txt', 'B3'],
    ['04_utility_5km.txt', 'B4'],
    ['05_all_types_5km.txt', 'B6'],
    ['06_region_filter_5km.txt', 'C2'],
    ['07_category_filter_5km.txt', 'C3'],
    ['08_min_rating_5km.txt', 'C6'],
    ['09_all_types_25km.txt', 'A5'],
  ] as const;

  const explainScenarios = evidenceDefinitions.map(([fileName, scenarioId]) => {
    const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
    if (!scenario) {
      throw new Error(`Missing benchmark scenario ${scenarioId} for EXPLAIN evidence`);
    }
    return { fileName, criteria: scenario.criteria };
  });

  await generateRepositoryExplainEvidence(client, explainScenarios, evidenceDirectory);
  console.log(`Saved ${explainScenarios.length} current-query EXPLAIN plans.`);
}
async function runConcurrencySanityCheck(app: Hono) {
  console.log('\nRunning concurrency sanity check (10 concurrent requests)...');
  const url = '/api/v1/nearby?lat=22.7844&lng=104.6644&radius=5000';
  const start = performance.now();

  const promises = Array.from({ length: 10 }).map(async () => {
    await requestSuccessfulNearby(app, url);
    return 200;
  });

  const statuses = await Promise.all(promises);
  const duration = performance.now() - start;
  const successRate = (statuses.filter((s) => s === 200).length / statuses.length) * 100;

  console.log('Concurrency sanity check completed:');
  console.log(`- Success Rate: ${successRate}%`);
  console.log(`- Total Duration: ${duration.toFixed(2)}ms`);
  if (successRate !== 100) {
    throw new Error(`Nearby concurrency gate failed with ${successRate}% success`);
  }
}

main().catch((error: unknown) => {
  console.error('Nearby benchmark failed:', error);
  process.exitCode = 1;
});
