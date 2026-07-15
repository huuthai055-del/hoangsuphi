import postgres from 'postgres';
import {
  SEARCH_BENCHMARK_DATASET,
  assertDedicatedBenchmarkDatabase,
} from './search-benchmark.model';

interface CountRow extends Record<string, unknown> {
  tableName: string;
  rowCount: number;
}

const UUID_SQL = (namespace: string, ordinal: string): string =>
  `md5('hsp-search-benchmark:${namespace}:' || (${ordinal})::text)::uuid`;

const benchmarkTermSql = (ordinal: string): string => `CASE
  WHEN ${ordinal} % 100 = 7 THEN 'Chiêu Lầu Thi'
  WHEN ${ordinal} % 100 = 44 THEN normalize('Hoàng Su Phì', NFD)
  WHEN ${ordinal} % 10 IN (4, 5, 6) THEN 'Ruộng bậc thang mùa vàng'
  WHEN ${ordinal} % 5 IN (0, 1, 2) THEN 'Hoàng Su Phì'
  ELSE 'Bản làng Tây Côn Lĩnh'
END`;

function makeSeedStatements(): readonly string[] {
  const targets = SEARCH_BENCHMARK_DATASET;
  return [
    `TRUNCATE TABLE
      reviews,
      business_amenities,
      articles,
      tourist_places,
      businesses,
      attractions,
      article_categories,
      amenities,
      business_types,
      attraction_categories,
      regions,
      users
    CASCADE`,
    `INSERT INTO users (id, email, password_hash, status, permissions_version, created_at, updated_at)
    SELECT
      ${UUID_SQL('user', 'i')},
      'benchmark-user-' || i || '@example.invalid',
      '$benchmark$not-a-real-password-hash',
      'active'::user_status,
      1,
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second'
    FROM generate_series(1, ${targets.users}) AS source(i)`,
    `INSERT INTO article_categories (id, code, name, description)
    SELECT
      ${UUID_SQL('article-category', 'i')},
      'benchmark-article-' || i,
      'Danh mục bài viết ' || i,
      'Danh mục synthetic dành riêng cho Search benchmark'
    FROM generate_series(1, ${targets.articleCategories}) AS source(i)`,
    `INSERT INTO attraction_categories (id, code, name, is_utility)
    SELECT
      ${UUID_SQL('attraction-category', 'i')},
      'benchmark-attraction-' || i,
      'Danh mục điểm tham quan ' || i,
      i % 5 = 0
    FROM generate_series(1, ${targets.attractionCategories}) AS source(i)`,
    `INSERT INTO business_types (id, code, name, sort_order, is_active)
    SELECT
      ${UUID_SQL('business-type', 'i')},
      'benchmark-business-' || i,
      'Loại hình kinh doanh ' || i,
      i,
      i < ${targets.businessTypes}
    FROM generate_series(1, ${targets.businessTypes}) AS source(i)`,
    `INSERT INTO amenities (id, code, name, category)
    SELECT
      ${UUID_SQL('amenity', 'i')},
      'benchmark-amenity-' || i,
      'Tiện ích ' || i,
      (ARRAY['connectivity', 'transport', 'service', 'food', 'comfort'])[1 + (i % 5)]
    FROM generate_series(1, ${targets.amenities}) AS source(i)`,
    `INSERT INTO regions (
      id, parent_id, name, slug, level, path, description,
      latitude, longitude, geom, created_at, updated_at, deleted_at
    )
    SELECT
      ${UUID_SQL('region', 'i')},
      CASE
        WHEN i = 1 THEN NULL
        WHEN i = 2 THEN ${UUID_SQL('region', '1')}
        WHEN i = 3 THEN ${UUID_SQL('region', '2')}
        WHEN i BETWEEN 4 AND 23 THEN ${UUID_SQL('region', '3')}
        ELSE ${UUID_SQL('region', '4 + ((i - 24) % 20)')}
      END,
      CASE
        WHEN i = 1 THEN 'Việt Nam'
        WHEN i = 2 THEN 'Hà Giang'
        WHEN i = 3 THEN 'Hoàng Su Phì'
        WHEN i BETWEEN 4 AND 23 THEN 'Xã benchmark ' || (i - 3)
        ELSE 'Thôn benchmark ' || (i - 23)
      END,
      'benchmark-region-' || i,
      CASE WHEN i = 1 THEN 0 WHEN i = 2 THEN 1 WHEN i = 3 THEN 2 WHEN i <= 23 THEN 3 ELSE 4 END,
      CASE
        WHEN i = 1 THEN 'vn'::ltree
        WHEN i = 2 THEN 'vn.ha_giang'::ltree
        WHEN i = 3 THEN 'vn.ha_giang.hoang_su_phi'::ltree
        WHEN i BETWEEN 4 AND 23 THEN
          text2ltree('vn.ha_giang.hoang_su_phi.commune_' || (i - 3))
        ELSE
          text2ltree(
            'vn.ha_giang.hoang_su_phi.commune_' || (1 + ((i - 24) % 20)) ||
            '.village_' || (i - 23)
          )
      END,
      'Cây địa giới synthetic nhiều cấp dành cho benchmark',
      22.5 + (i % 100) * 0.001,
      104.5 + (i % 100) * 0.001,
      ST_SetSRID(ST_MakePoint(104.5 + (i % 100) * 0.001, 22.5 + (i % 100) * 0.001), 4326)::geography,
      TIMESTAMPTZ '2025-01-01 00:00:00+00',
      TIMESTAMPTZ '2025-01-01 00:00:00+00',
      CASE WHEN i > 23 AND i % 20 = 0 THEN TIMESTAMPTZ '2025-06-01 00:00:00+00' ELSE NULL END
    FROM generate_series(1, ${targets.regions}) AS source(i)`,
    `WITH source AS (
      SELECT i, ${benchmarkTermSql('i')} AS term
      FROM generate_series(1, ${targets.articles}) AS generated(i)
    )
    INSERT INTO articles (
      id, category_id, author_id, title, slug, excerpt, content, status,
      view_count, is_featured, published_at, created_at, updated_at, deleted_at
    )
    SELECT
      ${UUID_SQL('article', 'i')},
      ${UUID_SQL('article-category', '1 + ((i - 1) % 10)')},
      ${UUID_SQL('user', '1 + ((i - 1) % 1000)')},
      term || ' — bài viết ' || i,
      'benchmark-article-' || i,
      term || '. Cẩm nang du lịch địa phương và trải nghiệm thực tế.',
      '<p>' || repeat(
        term || ' ruộng bậc thang văn hóa bản địa du lịch bền vững. ',
        CASE WHEN i % 20 = 0 THEN 120 ELSE 8 + (i % 32) END
      ) || '</p>',
      CASE
        WHEN i % 20 IN (0, 1) THEN 'draft'::article_status
        WHEN i % 20 = 2 THEN 'archived'::article_status
        ELSE 'published'::article_status
      END,
      i % 50_000,
      i % 17 = 0,
      CASE
        WHEN i % 20 IN (0, 1, 2) THEN NULL
        WHEN i % 20 = 3 THEN TIMESTAMPTZ '2099-01-01 00:00:00+00'
        ELSE TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second'
      END,
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      CASE WHEN i % 100 = 0 THEN TIMESTAMPTZ '2025-06-01 00:00:00+00' ELSE NULL END
    FROM source`,
    `WITH source AS (
      SELECT i, ${benchmarkTermSql('i')} AS term
      FROM generate_series(1, ${targets.places}) AS generated(i)
    )
    INSERT INTO tourist_places (
      id, region_id, name, slug, location, description, status, created_at, updated_at, deleted_at
    )
    SELECT
      ${UUID_SQL('place', 'i')},
      ${UUID_SQL('region', '4 + ((i - 1) % 100)')},
      left(term || ' địa điểm ' || i, 100),
      'benchmark-place-' || i,
      ST_SetSRID(ST_MakePoint(104.5 + (i % 100) * 0.001, 22.5 + (i % 100) * 0.001), 4326)::geography,
      repeat(term || ' cảnh quan bản làng. ', 3 + (i % 12)),
      CASE WHEN i % 10 IN (0, 1) THEN 'inactive' ELSE 'active' END,
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      CASE WHEN i % 100 = 0 THEN TIMESTAMPTZ '2025-06-01 00:00:00+00' ELSE NULL END
    FROM source`,
    `WITH source AS (
      SELECT i, ${benchmarkTermSql('i')} AS term
      FROM generate_series(1, ${targets.businesses}) AS generated(i)
    )
    INSERT INTO businesses (
      id, region_id, business_type_id, name, slug, location, description,
      status, created_at, updated_at, deleted_at
    )
    SELECT
      ${UUID_SQL('business', 'i')},
      ${UUID_SQL('region', '4 + ((i - 1) % 100)')},
      ${UUID_SQL('business-type', '1 + ((i - 1) % 10)')},
      left(term || ' homestay ' || i, 100),
      'benchmark-business-' || i,
      ST_SetSRID(ST_MakePoint(104.5 + (i % 100) * 0.001, 22.5 + (i % 100) * 0.001), 4326)::geography,
      repeat(term || ' lưu trú ẩm thực dịch vụ địa phương. ', 3 + (i % 12)),
      CASE WHEN i % 10 IN (0, 1) THEN 'inactive' ELSE 'active' END,
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      CASE WHEN i % 100 = 0 THEN TIMESTAMPTZ '2025-06-01 00:00:00+00' ELSE NULL END
    FROM source`,
    `WITH source AS (
      SELECT i, ${benchmarkTermSql('i')} AS term
      FROM generate_series(1, ${targets.attractions}) AS generated(i)
    )
    INSERT INTO attractions (
      id, region_id, category_id, name, slug, location, description,
      status, created_at, updated_at, deleted_at
    )
    SELECT
      ${UUID_SQL('attraction', 'i')},
      ${UUID_SQL('region', '4 + ((i - 1) % 100)')},
      ${UUID_SQL('attraction-category', '1 + ((i - 1) % 10)')},
      left(term || ' điểm tham quan ' || i, 100),
      'benchmark-attraction-' || i,
      ST_SetSRID(ST_MakePoint(104.5 + (i % 100) * 0.001, 22.5 + (i % 100) * 0.001), 4326)::geography,
      repeat(term || ' thắng cảnh văn hóa tiện ích. ', 3 + (i % 12)),
      CASE WHEN i % 10 IN (0, 1) THEN 'inactive' ELSE 'active' END,
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      TIMESTAMPTZ '2025-01-01 00:00:00+00' + i * INTERVAL '1 second',
      CASE WHEN i % 100 = 0 THEN TIMESTAMPTZ '2025-06-01 00:00:00+00' ELSE NULL END
    FROM source`,
    `INSERT INTO business_amenities (business_id, amenity_id, note)
    SELECT
      ${UUID_SQL('business', 'business_ordinal')},
      ${UUID_SQL('amenity', '1 + ((business_ordinal + amenity_offset - 2) % 25)')},
      NULL
    FROM generate_series(1, ${targets.businesses}) AS businesses(business_ordinal)
    CROSS JOIN generate_series(1, 10) AS amenity_offsets(amenity_offset)`,
    `WITH review_source AS (
      SELECT
        i,
        1 + ((i - 1) % 45000) AS entity_ordinal,
        floor((i - 1) / 45000)::integer AS review_round
      FROM generate_series(1, ${targets.reviews}) AS generated(i)
    ), owner_source AS (
      SELECT
        i,
        entity_ordinal,
        review_round,
        CASE
          WHEN entity_ordinal <= 20000 THEN 'ARTICLE'::owner_type
          WHEN entity_ordinal <= 25000 THEN 'PLACE'::owner_type
          WHEN entity_ordinal <= 35000 THEN 'BUSINESS'::owner_type
          ELSE 'ATTRACTION'::owner_type
        END AS owner_type,
        CASE
          WHEN entity_ordinal <= 20000 THEN ${UUID_SQL('article', 'entity_ordinal')}
          WHEN entity_ordinal <= 25000 THEN ${UUID_SQL('place', 'entity_ordinal - 20000')}
          WHEN entity_ordinal <= 35000 THEN ${UUID_SQL('business', 'entity_ordinal - 25000')}
          ELSE ${UUID_SQL('attraction', 'entity_ordinal - 35000')}
        END AS owner_id
      FROM review_source
    )
    INSERT INTO reviews (
      id, user_id, owner_type, owner_id, rating, title, content,
      status, created_at, updated_at, deleted_at
    )
    SELECT
      ${UUID_SQL('review', 'i')},
      ${UUID_SQL('user', '1 + ((entity_ordinal + review_round * 137 - 1) % 1000)')},
      owner_type,
      owner_id,
      1 + (i % 5),
      'Đánh giá benchmark ' || i,
      'Nội dung đánh giá synthetic dành riêng cho performance verification.',
      CASE
        WHEN i % 100 < 85 THEN 'APPROVED'::review_status
        WHEN i % 100 < 95 THEN 'PENDING'::review_status
        ELSE 'REJECTED'::review_status
      END,
      TIMESTAMPTZ '2025-02-01 00:00:00+00' + i * INTERVAL '1 second',
      TIMESTAMPTZ '2025-02-01 00:00:00+00' + i * INTERVAL '1 second',
      CASE WHEN i % 50 = 0 THEN TIMESTAMPTZ '2025-06-01 00:00:00+00' ELSE NULL END
    FROM owner_source`,
    'ANALYZE users',
    'ANALYZE regions',
    'ANALYZE article_categories',
    'ANALYZE attraction_categories',
    'ANALYZE business_types',
    'ANALYZE amenities',
    'ANALYZE articles',
    'ANALYZE tourist_places',
    'ANALYZE businesses',
    'ANALYZE attractions',
    'ANALYZE business_amenities',
    'ANALYZE reviews',
  ];
}

async function readCounts(sqlClient: ReturnType<typeof postgres>): Promise<CountRow[]> {
  return sqlClient<CountRow[]>`
    SELECT 'articles'::text AS "tableName", COUNT(*)::integer AS "rowCount" FROM articles
    UNION ALL SELECT 'tourist_places', COUNT(*)::integer FROM tourist_places
    UNION ALL SELECT 'businesses', COUNT(*)::integer FROM businesses
    UNION ALL SELECT 'attractions', COUNT(*)::integer FROM attractions
    UNION ALL SELECT 'reviews', COUNT(*)::integer FROM reviews
    UNION ALL SELECT 'business_amenities', COUNT(*)::integer FROM business_amenities
    ORDER BY "tableName"
  `;
}

function validateCounts(rows: readonly CountRow[]): void {
  const expected: Readonly<Record<string, number>> = {
    articles: SEARCH_BENCHMARK_DATASET.articles,
    tourist_places: SEARCH_BENCHMARK_DATASET.places,
    businesses: SEARCH_BENCHMARK_DATASET.businesses,
    attractions: SEARCH_BENCHMARK_DATASET.attractions,
    reviews: SEARCH_BENCHMARK_DATASET.reviews,
    business_amenities: SEARCH_BENCHMARK_DATASET.businessAmenities,
  };

  for (const [tableName, count] of Object.entries(expected)) {
    const actual = rows.find((row) => row.tableName === tableName)?.rowCount;
    if (actual !== count) {
      throw new Error(
        `Benchmark seed count mismatch for ${tableName}: expected=${count} actual=${actual}`
      );
    }
  }
}

export async function seedSearchBenchmarkDatabase(databaseUrl: string): Promise<void> {
  const expectedDatabaseName = assertDedicatedBenchmarkDatabase(databaseUrl);
  const sqlClient = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 10,
    onnotice: () => undefined,
  });

  try {
    const identity = await sqlClient<{ databaseName: string; readOnly: boolean }[]>`
      SELECT
        current_database()::text AS "databaseName",
        current_setting('transaction_read_only')::boolean AS "readOnly"
    `;
    if (identity[0]?.databaseName !== expectedDatabaseName || identity[0]?.readOnly !== false) {
      throw new Error('Benchmark database identity/read-write guard failed');
    }

    const startedAt = performance.now();
    await sqlClient.begin(async (transaction) => {
      for (const statement of makeSeedStatements()) {
        await transaction.unsafe(statement);
      }
    });

    const counts = await readCounts(sqlClient);
    validateCounts(counts);
    const elapsedMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({ status: 'seeded', database: expectedDatabaseName, elapsedMs, counts })
    );
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}
