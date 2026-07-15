import { describe, expect, mock, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import { SEARCH_FTS_INDEXES } from '@/lib/database/search/fts-index-manifest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SearchReferenceFilter, SearchRepositoryQuery } from './search-read-model';
import {
  buildBoundedSearchSql,
  buildExactPerEntityTopKSearchSql,
  buildReferenceValidationSql,
  buildSearchQueryInspectionSql,
  buildUnifiedSearchSql,
  getEligibleSearchEntityTypes,
} from './search-sql.fragments';
import { DrizzleSearchRepository, SearchRepositoryOperationError } from './search.repository';

const dialect = new PgDialect();

function compile(statement: SQL | null): { text: string; params: unknown[] } {
  if (!statement) throw new Error('Expected a SQL statement');
  const query = dialect.sqlToQuery(statement);
  return {
    text: query.sql.replace(/\s+/g, ' ').trim(),
    params: query.params,
  };
}

function makeQuery(overrides: Partial<SearchRepositoryQuery> = {}): SearchRepositoryQuery {
  return {
    q: 'hoang su phi',
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
    sort: 'relevance',
    keyset: null,
    limit: 20,
    ...overrides,
  };
}

function makeFilters(overrides: Partial<SearchReferenceFilter> = {}): SearchReferenceFilter {
  return {
    regionId: null,
    articleCategoryId: null,
    attractionCategoryId: null,
    businessTypeId: null,
    amenityIds: [],
    ...overrides,
  };
}

function makeRawRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    entityType: 'business',
    entityOrder: 3,
    id: '019f5ff3-0000-7000-8000-000000000001',
    name: 'Hoàng Su Phì Lodge',
    slug: 'hoang-su-phi-lodge',
    summarySource: '<p>Raw source</p>',
    thumbnailCandidate: null,
    regionId: '019f5ff3-0000-7000-8000-000000000002',
    regionName: 'Thông Nguyên',
    regionSlug: 'thong-nguyen',
    categoryId: '019f5ff3-0000-7000-8000-000000000003',
    categoryCode: 'homestay',
    categoryName: 'Homestay',
    rating: '4.67',
    priceMin: null,
    priceMax: null,
    relevance: 0.3125,
    newestCursorValue: '2026-07-14 09:30:00.123456+00',
    rawRating: '4.6666666666666667',
    priceCursorValue: null,
    ...overrides,
  };
}

class FakeDatabase {
  readonly execute = mock(async (_statement: SQL) => this.results.shift() ?? []);

  constructor(private readonly results: Record<string, unknown>[][]) {}
}

function makeRepository(...results: Record<string, unknown>[][]): {
  repository: DrizzleSearchRepository;
  database: FakeDatabase;
} {
  const database = new FakeDatabase(results);
  return {
    repository: new DrizzleSearchRepository(database as unknown as Database),
    database,
  };
}

describe('Search SQL contract', () => {
  test('inspection uses the approved parser/configuration and parameter-binds q', () => {
    const q = 'Hoàng Su Phì';
    const compiled = compile(buildSearchQueryInspectionSql(q));

    expect(compiled.text).toContain('websearch_to_tsquery');
    expect(compiled.text).toContain("'public.hsp_vietnamese'::regconfig");
    expect(compiled.text).toContain('numnode');
    expect(compiled.text).not.toContain(q);
    expect(compiled.params).toEqual([q]);
  });

  test('reference validation is one set-based query with partial amenity detection', () => {
    const filters = makeFilters({
      regionId: '019f5ff3-0000-7000-8000-000000000010',
      articleCategoryId: '019f5ff3-0000-7000-8000-000000000011',
      attractionCategoryId: '019f5ff3-0000-7000-8000-000000000012',
      businessTypeId: '019f5ff3-0000-7000-8000-000000000013',
      amenityIds: ['019f5ff3-0000-7000-8000-000000000014', '019f5ff3-0000-7000-8000-000000000015'],
    });
    const compiled = compile(buildReferenceValidationSql(filters));

    expect(compiled.text).toContain('WITH "requested_amenities"');
    expect(compiled.text).toContain("'deleted'::text");
    expect(compiled.text).toContain("'inactive'::text");
    expect(compiled.text).toContain('"missingAmenityIds"');
    expect(compiled.text).not.toContain(filters.amenityIds[0] ?? 'missing');
    expect(compiled.params).toEqual(expect.arrayContaining(filters.amenityIds));
  });

  test('Article visibility excludes deleted, non-published and future-published rows', () => {
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ q: null, types: ['article'], sort: 'newest' }))
    );

    expect(compiled.text).toContain('"articles"."deleted_at" IS NULL');
    expect(compiled.text).toContain("= 'published'::public.article_status");
    expect(compiled.text).toContain('"articles"."published_at" IS NOT NULL');
    expect(compiled.text).toContain('"articles"."published_at" <= CURRENT_TIMESTAMP');
    expect(compiled.text).toContain('INNER JOIN "article_categories" AS "search_article_category"');
  });

  test('Place visibility requires active row and non-deleted Region', () => {
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ q: null, types: ['place'], sort: 'newest' }))
    );

    expect(compiled.text).toContain('"tourist_places"."status" = \'active\'');
    expect(compiled.text).toContain('"search_place_region"."deleted_at" IS NULL');
    expect(compiled.text).toContain('INNER JOIN "regions" AS "search_place_region"');
  });

  test('Business visibility requires active row, Region and Business Type', () => {
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ q: null, types: ['business'], sort: 'newest' }))
    );

    expect(compiled.text).toContain('"businesses"."status" = \'active\'');
    expect(compiled.text).toContain('"search_business_region"."deleted_at" IS NULL');
    expect(compiled.text).toContain('"search_business_type"."is_active" = TRUE');
  });

  test('Attraction visibility requires active row, Region and category existence', () => {
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ q: null, types: ['attraction'], sort: 'newest' }))
    );

    expect(compiled.text).toContain('"attractions"."status" = \'active\'');
    expect(compiled.text).toContain('"search_attraction_region"."deleted_at" IS NULL');
    expect(compiled.text).toContain(
      'INNER JOIN "attraction_categories" AS "search_attraction_category"'
    );
  });

  test('all Region-backed branches exclude deleted Regions', () => {
    const compiled = compile(
      buildUnifiedSearchSql(
        makeQuery({ q: null, types: ['attraction', 'business', 'place'], sort: 'newest' })
      )
    );

    expect(compiled.text.match(/"deleted_at" IS NULL/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(compiled.text).not.toContain('\'article\'::text AS "entityType"');
  });

  test('accented and unaccented q share the same server-owned FTS configuration', () => {
    const accented = compile(buildUnifiedSearchSql(makeQuery({ q: 'Hoàng Su Phì' })));
    const unaccented = compile(buildUnifiedSearchSql(makeQuery({ q: 'hoang su phi' })));

    expect(accented.text).toBe(unaccented.text);
    expect(accented.params).toContain('Hoàng Su Phì');
    expect(unaccented.params).toContain('hoang su phi');
    expect(accented.text.match(/public\.hsp_vietnamese/g)?.length ?? 0).toBeGreaterThan(4);
  });

  test('multi-type search uses UNION ALL and emits each requested entity once', () => {
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ types: ['article', 'business', 'place'] }))
    );

    expect(compiled.text.match(/UNION ALL/g)?.length).toBe(2);
    expect(compiled.text.match(/'article'::text AS "entityType"/g)?.length).toBe(1);
    expect(compiled.text.match(/'business'::text AS "entityType"/g)?.length).toBe(1);
    expect(compiled.text.match(/'place'::text AS "entityType"/g)?.length).toBe(1);
  });

  test('exact Region filter excludes Article and compares selected Region id', () => {
    const regionId = '019f5ff3-0000-7000-8000-000000000020';
    const query = makeQuery({ regionId, includeDescendants: false, sort: 'newest', q: null });
    const compiled = compile(buildUnifiedSearchSql(query));

    expect(getEligibleSearchEntityTypes(query)).toEqual(['attraction', 'business', 'place']);
    expect(compiled.text).toContain('= "search_selected_region"."id"');
    expect(compiled.text).not.toContain('\'article\'::text AS "entityType"');
    expect(compiled.params).toContain(regionId);
  });

  test('descendant Region filter uses ltree containment without recursive query', () => {
    const compiled = compile(
      buildUnifiedSearchSql(
        makeQuery({
          q: null,
          regionId: '019f5ff3-0000-7000-8000-000000000021',
          includeDescendants: true,
          sort: 'newest',
        })
      )
    );

    expect(compiled.text).toContain('<@ "search_selected_region"."path"');
    expect(compiled.text).not.toContain('WITH RECURSIVE');
  });

  test('Article Category filter keeps only Article and remains parameter-bound', () => {
    const categoryId = '019f5ff3-0000-7000-8000-000000000022';
    const query = makeQuery({ articleCategoryId: categoryId, types: ['article', 'business'] });
    const compiled = compile(buildUnifiedSearchSql(query));

    expect(getEligibleSearchEntityTypes(query)).toEqual(['article']);
    expect(compiled.text).toContain('"articles"."category_id" =');
    expect(compiled.params).toContain(categoryId);
  });

  test('Attraction Category filter keeps only Attraction', () => {
    const query = makeQuery({
      attractionCategoryId: '019f5ff3-0000-7000-8000-000000000023',
      types: ['article', 'attraction'],
    });
    const compiled = compile(buildUnifiedSearchSql(query));

    expect(getEligibleSearchEntityTypes(query)).toEqual(['attraction']);
    expect(compiled.text).toContain('"attractions"."category_id" =');
  });

  test('Business Type filter keeps only Business and enforces active type', () => {
    const query = makeQuery({
      businessTypeId: '019f5ff3-0000-7000-8000-000000000024',
      types: ['business', 'place'],
    });
    const compiled = compile(buildUnifiedSearchSql(query));

    expect(getEligibleSearchEntityTypes(query)).toEqual(['business']);
    expect(compiled.text).toContain('"businesses"."business_type_id" =');
    expect(compiled.text).toContain('"search_business_type"."is_active" = TRUE');
  });

  test('ALL-amenities semantics use grouped distinct match and never duplicate Business', () => {
    const amenityIds = [
      '019f5ff3-0000-7000-8000-000000000025',
      '019f5ff3-0000-7000-8000-000000000026',
    ];
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ amenityIds, types: ['business', 'place'] }))
    );

    expect(compiled.text).toContain('"search_amenity_matches" AS');
    expect(compiled.text).toContain('GROUP BY "business_amenities"."business_id"');
    expect(compiled.text).toContain('HAVING COUNT(DISTINCT');
    expect(compiled.text).toContain('INNER JOIN "search_amenity_matches"');
    expect(compiled.text).not.toContain('= ANY');
  });

  test('rating aggregate includes only approved and non-deleted Reviews', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery()));

    expect(compiled.text).toContain("= 'APPROVED'::public.review_status");
    expect(compiled.text).toContain('"deleted_at" IS NULL');
    expect(compiled.text).toContain('AVG("reviews"."rating"::numeric)');
    expect(compiled.text).toContain('"search_page_ratings" AS');
    expect(compiled.text).not.toContain('"search_ratings" AS');
    expect(compiled.text).not.toContain("'PENDING'");
    expect(compiled.text).not.toContain("'REJECTED'");
  });

  test('minRating compares the raw aggregate and naturally excludes null ratings', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery({ minRating: '4.25' })));

    expect(compiled.text).toContain('"search_ratings"."raw_rating" >=');
    expect(compiled.text).toContain('::numeric');
    expect(compiled.params).toContain('4.25');
  });

  test('relevance uses ts_rank_cd normalization bit 1 and deterministic order', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery({ sort: 'relevance' })));

    expect(compiled.text).toContain('ts_rank_cd');
    expect(compiled.text).toContain('"search_input"."query", 1)');
    expect(compiled.text).toContain('ORDER BY "relevance" DESC, "entityOrder" ASC, "id" ASC');
  });

  test('newest uses published time for Article, created time otherwise, null-last', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery({ q: null, sort: 'newest' })));

    expect(compiled.text).toContain('"articles"."published_at" AS "newestValue"');
    expect(compiled.text).toContain('"businesses"."created_at" AS "newestValue"');
    expect(compiled.text).toContain('"newestValue" DESC NULLS LAST');
  });

  test('rating ordering uses unrounded average and puts null last', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery({ q: null, sort: 'rating' })));

    expect(compiled.text).toContain('"search_ratings" AS');
    expect(compiled.text).not.toContain('"search_page_ratings" AS');
    expect(compiled.text).toContain('ROUND("search_ratings"."raw_rating", 2) AS "rating"');
    expect(compiled.text).toContain('"rawRating" DESC NULLS LAST');
  });

  test('canonical entity order is article, attraction, business, place', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery()));

    expect(compiled.text).toContain('\'article\'::text AS "entityType", 1::integer');
    expect(compiled.text).toContain('\'attraction\'::text AS "entityType", 2::integer');
    expect(compiled.text).toContain('\'business\'::text AS "entityType", 3::integer');
    expect(compiled.text).toContain('\'place\'::text AS "entityType", 4::integer');
  });

  test('relevance keyset uses full tuple and cannot duplicate equal-score rows', () => {
    const compiled = compile(
      buildUnifiedSearchSql(
        makeQuery({
          keyset: {
            sort: 'relevance',
            sortValue: 0.3125,
            entityType: 'business',
            id: '019f5ff3-0000-7000-8000-000000000030',
          },
        })
      )
    );

    expect(compiled.text).toContain('"relevance" <');
    expect(compiled.text).toContain('"relevance" =');
    expect(compiled.text).toContain('"entityOrder" >');
    expect(compiled.text).toContain('"id" >');
    expect(compiled.text).not.toContain('OFFSET');
  });

  test('newest deep keyset includes lower values, null bucket and complete ties', () => {
    const timestamp = '2026-07-14 09:30:00.123456+00';
    const compiled = compile(
      buildUnifiedSearchSql(
        makeQuery({
          q: null,
          sort: 'newest',
          keyset: {
            sort: 'newest',
            sortValue: timestamp,
            entityType: 'article',
            id: '019f5ff3-0000-7000-8000-000000000031',
          },
        })
      )
    );

    expect(compiled.text).toContain('"newestValue" IS NULL');
    expect(compiled.text).toContain('"newestValue" <');
    expect(compiled.text).toContain('"newestValue" =');
    expect(compiled.params).toContain(timestamp);
  });

  test('rating null keyset remains inside null bucket with canonical tie-breakers', () => {
    const compiled = compile(
      buildUnifiedSearchSql(
        makeQuery({
          q: null,
          sort: 'rating',
          keyset: {
            sort: 'rating',
            sortValue: null,
            entityType: 'attraction',
            id: '019f5ff3-0000-7000-8000-000000000032',
          },
        })
      )
    );

    expect(compiled.text).toContain('"rawRating" IS NULL AND');
    expect(compiled.text).toContain('"entityOrder" >');
    expect(compiled.text).toContain('"id" >');
  });

  test('price interval filters keep only Business and bind both overlap bounds', () => {
    const query = makeQuery({
      q: null,
      priceMin: '100000',
      priceMax: '250000.5',
      sort: 'newest',
    });
    const compiled = compile(buildUnifiedSearchSql(query));

    expect(getEligibleSearchEntityTypes(query)).toEqual(['business']);
    expect(compiled.text).toContain('"businesses"."price_max" >=');
    expect(compiled.text).toContain('"businesses"."price_min" <=');
    expect(compiled.params).toContain('100000');
    expect(compiled.params).toContain('250000.5');
    expect(compiled.text).not.toContain('\'article\'::text AS "entityType"');
  });

  test.each([
    ['price_asc', '100000.00', '"priceMin" ASC NULLS LAST', '"priceMin" >'],
    ['price_desc', '250000.50', '"priceMax" DESC NULLS LAST', '"priceMax" <'],
  ] as const)(
    '%s uses exact numeric keyset, null bucket and stable ties',
    (sort, value, order, after) => {
      const compiled = compile(
        buildUnifiedSearchSql(
          makeQuery({
            q: null,
            types: ['business'],
            sort,
            keyset: {
              sort,
              sortValue: value,
              entityType: 'business',
              id: '019f5ff3-0000-7000-8000-000000000033',
            },
          })
        )
      );

      expect(compiled.text).toContain(order);
      expect(compiled.text).toContain(after);
      expect(compiled.text).toContain('IS NULL');
      expect(compiled.text).toContain('"entityOrder" >');
      expect(compiled.params).toContain(value);
    }
  );

  test('query takes limit plus one, never total count or offset', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery({ limit: 7 })));

    expect(compiled.params).toContain(8);
    expect(compiled.text).not.toContain('OFFSET');
    expect(compiled.text).not.toContain('COUNT(*)');
    expect(compiled.text).not.toContain('COUNT("search_candidates"');
  });

  test('filter-only query does not execute FTS and projects null relevance', () => {
    const compiled = compile(
      buildUnifiedSearchSql(makeQuery({ q: null, types: ['place'], sort: 'newest' }))
    );

    expect(compiled.text).toContain('SELECT NULL::tsquery AS "query"');
    expect(compiled.text).toContain('NULL::real AS "relevance"');
    expect(compiled.text).not.toContain('@@ "search_input"."query"');
    expect(compiled.text).not.toContain('ts_rank_cd');
  });

  test('incompatible entity filters produce no branch instead of OR semantics', () => {
    const query = makeQuery({
      regionId: '019f5ff3-0000-7000-8000-000000000040',
      articleCategoryId: '019f5ff3-0000-7000-8000-000000000041',
      types: ['article', 'business'],
    });

    expect(getEligibleSearchEntityTypes(query)).toEqual([]);
    expect(buildUnifiedSearchSql(query)).toBeNull();
  });

  test('canonical FTS documents stay aligned with all four Step 4.1.2 manifests', () => {
    const compiled = compile(buildUnifiedSearchSql(makeQuery()));

    for (const definition of SEARCH_FTS_INDEXES) {
      for (const [field, weight] of definition.fieldWeights) {
        expect(compiled.text).toContain(`"${definition.tableName}"."${field}"`);
        expect(compiled.text).toContain(`'${weight}'`);
      }
    }
  });

  test('benchmark prototype can select stored vectors without changing the default query shape', () => {
    const expression = compile(buildUnifiedSearchSql(makeQuery()));
    const stored = compile(buildUnifiedSearchSql(makeQuery(), 'stored'));

    expect(expression.text).toContain('to_tsvector');
    expect(stored.text).not.toContain('to_tsvector');
    expect(stored.text).toContain('"articles"."search_vector"');
    expect(stored.text).toContain('"attractions"."search_vector"');
    expect(stored.text).toContain('"businesses"."search_vector"');
    expect(stored.text).toContain('"tourist_places"."search_vector"');
    expect(stored.params).toContain('hoang su phi');
  });

  test('bounded benchmark ranking uses a materialized proxy pool before exact re-ranking', () => {
    const compiled = compile(
      buildBoundedSearchSql(makeQuery(), {
        candidateLimit: 500,
        candidateStrategy: 'global_ts_rank',
      })
    );

    expect(compiled.text).toContain('"search_proxy_candidates" AS');
    expect(compiled.text).toContain('"search_bounded_candidates" AS MATERIALIZED');
    expect(compiled.text).toContain('ts_rank(');
    expect(compiled.text).toContain('ts_rank_cd(');
    expect(compiled.text.indexOf('ts_rank(')).toBeLessThan(compiled.text.indexOf('ts_rank_cd('));
    expect(compiled.text).toContain('ORDER BY "proxyRank" DESC, "entityOrder" ASC, "id" ASC');
    expect(compiled.text).toContain('"search_bounded_candidates"."searchDocument"');
    expect(compiled.text).toContain('"articles"."search_vector"');
    expect(compiled.text).not.toContain('to_tsvector');
    expect(compiled.params).toContain(500);
    expect(compiled.params).toContain('hoang su phi');
  });

  test('bounded canonical strategy takes a stable quota from every eligible entity', () => {
    const compiled = compile(
      buildBoundedSearchSql(makeQuery(), {
        candidateLimit: 500,
        candidateStrategy: 'per_entity_canonical',
      })
    );

    expect(compiled.text).toContain('"search_bounded_candidates" AS MATERIALIZED');
    expect(compiled.text).toContain('"search_entity_candidates_1"');
    expect(compiled.text).toContain('"search_entity_candidates_4"');
    expect(compiled.text.match(/ORDER BY "id" ASC/g)?.length).toBe(4);
    expect(compiled.text).not.toContain('"proxyRank"');
    expect(compiled.text).not.toContain('ts_rank(');
    expect(compiled.text).toContain('ts_rank_cd(');
    expect(compiled.params.filter((parameter) => parameter === 500)).toHaveLength(4);
  });

  test('bounded ranking applies the public keyset after exact re-ranking', () => {
    const compiled = compile(
      buildBoundedSearchSql(
        makeQuery({
          keyset: {
            sort: 'relevance',
            sortValue: 0.3125,
            entityType: 'business',
            id: '019f5ff3-0000-7000-8000-000000000080',
          },
        }),
        { candidateLimit: 500 }
      )
    );

    expect(compiled.text.indexOf('"search_candidates" AS')).toBeLessThan(
      compiled.text.indexOf('"search_page" AS')
    );
    expect(compiled.text).toContain('WHERE ( "relevance" <');
    expect(compiled.text).not.toContain('OFFSET');
  });

  test('bounded ranking falls back to stored exact query outside relevance search', () => {
    const query = makeQuery({ q: null, sort: 'newest' });
    const compiled = compile(buildBoundedSearchSql(query, { candidateLimit: 500 }));
    const storedExact = compile(buildUnifiedSearchSql(query, 'stored'));

    expect(compiled).toEqual(storedExact);
    expect(compiled.text).not.toContain('"search_bounded_candidates"');
    expect(compiled.text).not.toContain('"proxyRank"');
  });

  test('bounded ranking rejects an unsafe server-side candidate bound', () => {
    expect(() => buildBoundedSearchSql(makeQuery(), { candidateLimit: 50 })).toThrow(
      'between 51 and 5000'
    );
    expect(() => buildBoundedSearchSql(makeQuery(), { candidateLimit: 5_001 })).toThrow(
      'between 51 and 5000'
    );
  });

  test('exact per-entity prototype locally limits every branch before a small global merge', () => {
    const compiled = compile(buildExactPerEntityTopKSearchSql(makeQuery()));

    expect(compiled.text).toContain('"search_per_entity_candidates" AS');
    expect(compiled.text).toContain('"search_ranked_page" AS MATERIALIZED');
    expect(compiled.text).toContain('"search_per_entity_hydrated" AS');
    expect(compiled.text.match(/ts_rank_cd\(/g)?.length).toBe(4);
    expect(
      compiled.text.match(/ORDER BY "relevance" DESC, "entityOrder" ASC, "id" ASC/g)?.length
    ).toBe(6);
    expect(compiled.text.match(/LIMIT /g)?.length).toBe(5);
    expect(compiled.params.filter((parameter) => parameter === 21)).toHaveLength(5);
    expect(compiled.text).toContain(' UNION ALL ');
    expect(compiled.text).toContain('"articles"."search_vector"');
    expect(compiled.text).not.toContain('to_tsvector');
    expect(compiled.text).not.toContain('OFFSET');

    const rankedPagePosition = compiled.text.indexOf('"search_ranked_page" AS MATERIALIZED');
    const summaryPosition = compiled.text.indexOf('AS "summarySource"');
    expect(summaryPosition).toBeGreaterThan(rankedPagePosition);
  });

  test('exact per-entity prototype applies the complete unrounded cursor inside every branch', () => {
    const sortValue = 0.3123456835746765;
    const cursorId = '019f5ff3-0000-7000-8000-000000000081';
    const compiled = compile(
      buildExactPerEntityTopKSearchSql(
        makeQuery({
          keyset: {
            sort: 'relevance',
            sortValue,
            entityType: 'business',
            id: cursorId,
          },
        })
      )
    );

    expect(compiled.text.match(/WHERE \( "relevance" </g)?.length).toBe(4);
    expect(compiled.text.match(/"entityOrder" >/g)?.length).toBe(4);
    expect(compiled.text.match(/"id" >/g)?.length).toBe(4);
    expect(compiled.params).toContain(sortValue);
    expect(compiled.params).toContain(cursorId);
    expect(compiled.text.indexOf('WHERE ( "relevance" <')).toBeLessThan(
      compiled.text.indexOf('"search_ranked_page" AS MATERIALIZED')
    );
  });

  test('exact per-entity prototype applies every eligibility filter before local limit', () => {
    const compiled = compile(
      buildExactPerEntityTopKSearchSql(
        makeQuery({
          types: ['business'],
          regionId: '019f5ff3-0000-7000-8000-000000000082',
          includeDescendants: true,
          businessTypeId: '019f5ff3-0000-7000-8000-000000000083',
          amenityIds: [
            '019f5ff3-0000-7000-8000-000000000084',
            '019f5ff3-0000-7000-8000-000000000085',
          ],
          minRating: '4.25',
        })
      )
    );
    const firstLocalLimit = compiled.text.indexOf('LIMIT');

    for (const predicate of [
      '"businesses"."deleted_at" IS NULL',
      '"businesses"."status" = \'active\'',
      '"search_business_region"."deleted_at" IS NULL',
      '"search_business_type"."is_active" = TRUE',
      '"search_business_region"."path" <@ "search_selected_region"."path"',
      'INNER JOIN "search_amenity_matches"',
      '"search_ratings"."raw_rating" >=',
    ]) {
      expect(compiled.text.indexOf(predicate)).toBeGreaterThanOrEqual(0);
      expect(compiled.text.indexOf(predicate)).toBeLessThan(firstLocalLimit);
    }
    expect(compiled.text.indexOf('AS "summarySource"')).toBeGreaterThan(firstLocalLimit);
  });

  test('exact per-entity prototype falls back to stored exact shape outside relevance search', () => {
    const query = makeQuery({ q: null, sort: 'newest' });
    expect(compile(buildExactPerEntityTopKSearchSql(query))).toEqual(
      compile(buildUnifiedSearchSql(query, 'stored'))
    );
  });

  test('client values are parameters and cannot select identifier, direction or function', () => {
    const q = "x'); DROP TABLE articles; --";
    const compiled = compile(buildUnifiedSearchSql(makeQuery({ q })));

    expect(compiled.text).not.toContain(q);
    expect(compiled.params).toContain(q);
    expect(compiled.text).toContain('ORDER BY "relevance" DESC');
  });
});

describe('DrizzleSearchRepository', () => {
  test('maps lexeme and punctuation-only inspection without deciding HTTP behavior', async () => {
    const { repository } = makeRepository([{ lexemeCount: 3 }], [{ lexemeCount: 0 }]);

    expect(await repository.inspectQuery('hoang su phi')).toEqual({
      lexemeCount: 3,
      hasLexemes: true,
    });
    expect(await repository.inspectQuery('???')).toEqual({ lexemeCount: 0, hasLexemes: false });
  });

  test('maps Region deletion, inactive Business Type and missing Amenity IDs distinctly', async () => {
    const missingAmenityId = '019f5ff3-0000-7000-8000-000000000050';
    const filters = makeFilters({
      regionId: '019f5ff3-0000-7000-8000-000000000051',
      businessTypeId: '019f5ff3-0000-7000-8000-000000000052',
      amenityIds: ['019f5ff3-0000-7000-8000-000000000053', missingAmenityId],
    });
    const { repository, database } = makeRepository([
      {
        region: 'deleted',
        articleCategoryExists: null,
        attractionCategoryExists: null,
        businessType: 'inactive',
        foundAmenityIds: [filters.amenityIds[0]],
        missingAmenityIds: [missingAmenityId],
      },
    ]);

    const result = await repository.validateReferences(filters);
    expect(result.region).toBe('deleted');
    expect(result.businessType).toBe('inactive');
    expect(result.missingAmenityIds).toEqual([missingAmenityId]);
    expect(result.allAmenitiesExist).toBe(false);
    expect(database.execute).toHaveBeenCalledTimes(1);
  });

  test('returns no-query defaults when no reference filter was requested', async () => {
    const { repository, database } = makeRepository();

    expect(await repository.validateReferences(makeFilters())).toEqual({
      region: 'not_requested',
      articleCategoryExists: null,
      attractionCategoryExists: null,
      businessType: 'not_requested',
      requestedAmenityIds: [],
      foundAmenityIds: [],
      missingAmenityIds: [],
      allAmenitiesExist: true,
    });
    expect(database.execute).not.toHaveBeenCalled();
  });

  test('uses limit plus one to report hasMore and emits exact last keyset', async () => {
    const rows = [
      makeRawRow({
        id: '019f5ff3-0000-7000-8000-000000000061',
        rawRating: '4.9000000000000000',
      }),
      makeRawRow({
        id: '019f5ff3-0000-7000-8000-000000000062',
        rawRating: '4.6666666666666667',
      }),
      makeRawRow({
        id: '019f5ff3-0000-7000-8000-000000000063',
        rawRating: '4.5000000000000000',
      }),
    ];
    const { repository } = makeRepository(rows);
    const result = await repository.search(
      makeQuery({ q: null, types: ['business'], sort: 'rating', limit: 2 })
    );

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.lastKeyset).toEqual({
      sort: 'rating',
      sortValue: '4.6666666666666667',
      entityType: 'business',
      id: '019f5ff3-0000-7000-8000-000000000062',
    });
  });

  test('filter-only projection keeps an internal cover candidate without leaking raw source fields', async () => {
    const raw = makeRawRow({
      relevance: 99,
      priceMin: '100000',
      priceMax: '200000',
      thumbnailCandidate: 'private/storage/key.webp',
      storageKey: 'private/storage/key.webp',
      content: '<script>secret article body</script>',
    });
    const { repository } = makeRepository([raw]);
    const result = await repository.search(
      makeQuery({ q: null, types: ['business'], sort: 'newest', limit: 20 })
    );
    const item = result.items[0];

    expect(item?.relevance).toBeNull();
    expect(item?.priceMin).toBe('100000');
    expect(item?.priceMax).toBe('200000');
    expect(item?.thumbnailCandidate).toBe('private/storage/key.webp');
    expect(item).not.toHaveProperty('storageKey');
    expect(item).not.toHaveProperty('content');
    expect(item?.summarySource).toBe('<p>Raw source</p>');
  });

  test('preserves exact PostgreSQL timestamp text for newest cursor', async () => {
    const exactTimestamp = '2026-07-14 09:30:00.123456+00';
    const { repository } = makeRepository([makeRawRow({ newestCursorValue: exactTimestamp })]);
    const result = await repository.search(
      makeQuery({ q: null, types: ['business'], sort: 'newest' })
    );

    expect(result.lastKeyset).toEqual({
      sort: 'newest',
      sortValue: exactTimestamp,
      entityType: 'business',
      id: '019f5ff3-0000-7000-8000-000000000001',
    });
  });

  test.each([
    ['price_asc', '100000.00'],
    ['price_desc', '250000.50'],
  ] as const)('preserves exact PostgreSQL numeric text for %s cursor', async (sort, value) => {
    const { repository } = makeRepository([
      makeRawRow({ priceMin: '100000.00', priceMax: '250000.50', priceCursorValue: value }),
    ]);
    const result = await repository.search(makeQuery({ q: null, types: ['business'], sort }));

    expect(result.lastKeyset).toEqual({
      sort,
      sortValue: value,
      entityType: 'business',
      id: '019f5ff3-0000-7000-8000-000000000001',
    });
  });

  test('returns an empty page when AND eligibility removes every entity branch', async () => {
    const { repository, database } = makeRepository();
    const result = await repository.search(
      makeQuery({
        regionId: '019f5ff3-0000-7000-8000-000000000070',
        articleCategoryId: '019f5ff3-0000-7000-8000-000000000071',
        types: ['article'],
      })
    );

    expect(result).toEqual({ items: [], hasMore: false, lastKeyset: null });
    expect(database.execute).not.toHaveBeenCalled();
  });

  test('rejects untrusted pagination invariants before executing SQL', async () => {
    const { repository, database } = makeRepository();

    await expect(repository.search(makeQuery({ limit: 51 }))).rejects.toThrow(
      'limit must be between 1 and 50'
    );
    await expect(repository.search(makeQuery({ q: null, sort: 'relevance' }))).rejects.toThrow(
      'Relevance sort requires a search query'
    );
    expect(database.execute).not.toHaveBeenCalled();
  });

  test('wraps database failures without exposing raw database details in its message', async () => {
    const database = new FakeDatabase([]);
    database.execute.mockImplementationOnce(async () => {
      throw new Error('relation secret_internal_table does not exist');
    });
    const repository = new DrizzleSearchRepository(database as unknown as Database);

    const promise = repository.inspectQuery('hoang su phi');
    await expect(promise).rejects.toBeInstanceOf(SearchRepositoryOperationError);
    await expect(promise).rejects.not.toThrow('secret_internal_table');
  });
});
