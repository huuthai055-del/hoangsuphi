import os from 'node:os';
import { container } from '@/common/di/container';
import { db } from '@/lib/database/client';
import { SEARCH_FTS_INDEXES } from '@/lib/database/search/fts-index-manifest';
import { PgDialect } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import { createApp } from '../../../app';
import { SearchConfig } from '../config/search.config';
import { parseSearchQuery } from '../dto/search.dto';
import {
  SEARCH_ENTITY_TYPES,
  type SearchKeyset,
  type SearchReadProjection,
  type SearchRepositoryPage,
  type SearchRepositoryQuery,
} from '../repository/search-read-model';
import {
  buildBoundedSearchSql,
  buildExactPerEntityTopKSearchSql,
  buildUnifiedSearchSql,
} from '../repository/search-sql.fragments';
import { DrizzleSearchRepository, type SearchSqlBuilder } from '../repository/search.repository';
import { SearchController } from '../route/search.controller';
import { SearchCursorCodec } from '../service/search-cursor';
import { SearchService } from '../service/search.service';
import { type SearchExplainPlanSummary, summarizeExplainPlan } from './search-benchmark-plan';
import {
  type LatencyStatistics,
  SEARCH_BENCHMARK_DATASET,
  SEARCH_BENCHMARK_TABLES,
  type SearchBenchmarkOptions,
  benchmarkUuid,
  calculateLatencyStatistics,
  checksumBenchmarkSnapshot,
} from './search-benchmark.model';
import { SEARCH_STORED_VECTOR_PROTOTYPES } from './search-benchmark.prototype';
import {
  BOUNDED_RANKING_QUALITY_THRESHOLDS,
  type RankingQualityMetrics,
  calculateRankingQuality,
} from './search-benchmark.quality';

const API_PATH = '/api/v1/search';
const FTS_INDEXES = SEARCH_FTS_INDEXES.map((index) => index.indexName);
const STORED_FTS_INDEXES = SEARCH_STORED_VECTOR_PROTOTYPES.map((index) => index.indexName);

type ScenarioFamily = 'fts_core' | 'filters' | 'amenities_rating' | 'pagination_visibility';

interface BenchmarkScenario {
  readonly family: ScenarioFamily;
  readonly name: string;
  readonly query: SearchRepositoryQuery;
  readonly explain: boolean;
}

interface ScenarioMeasurement {
  readonly scenario: string;
  readonly durationMs: number;
}

interface FamilyMeasurement {
  readonly family: ScenarioFamily;
  readonly samples: number;
  readonly latency: LatencyStatistics;
  readonly scenarios: Readonly<Record<string, LatencyStatistics>>;
}

interface DatasetCountRow {
  readonly name: string;
  readonly count: string;
}

interface EnvironmentRow {
  readonly database: string;
  readonly postgresVersion: string;
  readonly serverVersion: string;
  readonly sharedBuffers: string;
  readonly workMem: string;
  readonly effectiveCacheSize: string;
  readonly maxConnections: string;
}

interface IndexCatalogRow {
  readonly name: string;
  readonly isValid: boolean;
  readonly isReady: boolean;
  readonly sizeBytes: string;
}

interface RelationSizeRow {
  readonly name: string;
  readonly tableBytes: string;
  readonly indexesBytes: string;
}

interface ExplainRow {
  readonly 'QUERY PLAN': unknown;
}

interface BoundedKeysetAudit {
  readonly scenario: string;
  readonly pageSize: number;
  readonly pagesRead: number;
  readonly itemsRead: number;
  readonly duplicateFree: boolean;
  readonly firstPageSequenceStable: boolean;
  readonly passed: boolean;
}

interface BoundedRankingQualityReport {
  readonly thresholds: typeof BOUNDED_RANKING_QUALITY_THRESHOLDS;
  readonly scenarios: Readonly<Record<string, RankingQualityMetrics>>;
  readonly keysetAudits: Readonly<Record<string, BoundedKeysetAudit>>;
  readonly allScenariosPassed: boolean;
  readonly allKeysetAuditsPassed: boolean;
}

interface ExactPerEntityPageAudit {
  readonly scenario: string;
  readonly pageSize: number;
  readonly requiredPages: number;
  readonly pagesCompared: number;
  readonly exactItemsCompared: number;
  readonly prototypeItemsCompared: number;
  readonly sequenceMatches: boolean;
  readonly projectionMatches: boolean;
  readonly rankMatches: boolean;
  readonly hasMoreMatches: boolean;
  readonly duplicateFree: boolean;
  readonly prematureExhaustion: boolean;
  readonly crossEntityEqualRankPairs: number;
  readonly cursorBoundaryCrossEntityTie: boolean;
  readonly passed: boolean;
}

interface CrossEntityTieFixture {
  readonly q: string;
  readonly relevance: number;
  readonly cursorEntityType: SearchKeyset['entityType'];
  readonly cursorId: string;
  readonly matchingEntityTypes: readonly SearchKeyset['entityType'][];
}

interface ExactPerEntityEquivalenceReport {
  readonly requiredPagesPerScenario: number;
  readonly scenarios: Readonly<Record<string, ExactPerEntityPageAudit>>;
  readonly crossEntityTieFixture: CrossEntityTieFixture | null;
  readonly crossEntityTieCoverage: boolean;
  readonly totalCrossEntityEqualRankPairs: number;
  readonly allScenariosPassed: boolean;
}

function baseQuery(overrides: Partial<SearchRepositoryQuery> = {}): SearchRepositoryQuery {
  return {
    q: null,
    types: SEARCH_ENTITY_TYPES,
    regionId: null,
    includeDescendants: false,
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

function newestTimestamp(ordinal: number): string {
  return new Date(Date.UTC(2025, 0, 1, 0, 0, ordinal)).toISOString();
}

function buildScenarios(): readonly BenchmarkScenario[] {
  const regionId = benchmarkUuid('region', 3);
  const exactRegionId = benchmarkUuid('region', 4);
  const amenityIds = Array.from({ length: 20 }, (_, index) =>
    benchmarkUuid('amenity', index + 1)
  ).sort();
  const deepKeyset: SearchKeyset = {
    sort: 'newest',
    sortValue: newestTimestamp(10_004),
    entityType: 'article',
    id: benchmarkUuid('article', 10_004),
  };

  return [
    {
      family: 'fts_core',
      name: 'rare_accented',
      query: baseQuery({ q: 'Chiêu Lầu Thi', sort: 'relevance' }),
      explain: true,
    },
    {
      family: 'fts_core',
      name: 'rare_unaccented',
      query: baseQuery({ q: 'chieu lau thi', sort: 'relevance' }),
      explain: true,
    },
    {
      family: 'fts_core',
      name: 'common_term',
      query: baseQuery({ q: 'Hoàng Su Phì', sort: 'relevance' }),
      explain: true,
    },
    {
      family: 'fts_core',
      name: 'multi_term',
      query: baseQuery({ q: 'ruộng bậc thang mùa vàng', sort: 'relevance' }),
      explain: true,
    },
    {
      family: 'fts_core',
      name: 'quoted_phrase',
      query: baseQuery({ q: '"Hoàng Su Phì"', sort: 'relevance' }),
      explain: true,
    },
    {
      family: 'fts_core',
      name: 'websearch_operators',
      query: baseQuery({ q: 'ruộng OR chợ -huyện', sort: 'relevance' }),
      explain: true,
    },
    {
      family: 'filters',
      name: 'multi_type',
      query: baseQuery({ q: 'mùa vàng', sort: 'relevance' }),
      explain: false,
    },
    {
      family: 'filters',
      name: 'region_exact',
      query: baseQuery({
        types: ['attraction', 'business', 'place'],
        regionId: exactRegionId,
        includeDescendants: false,
      }),
      explain: false,
    },
    {
      family: 'filters',
      name: 'region_descendants',
      query: baseQuery({
        types: ['attraction', 'business', 'place'],
        regionId,
        includeDescendants: true,
      }),
      explain: true,
    },
    {
      family: 'filters',
      name: 'article_category',
      query: baseQuery({
        types: ['article'],
        articleCategoryId: benchmarkUuid('article-category', 1),
      }),
      explain: false,
    },
    {
      family: 'filters',
      name: 'attraction_category',
      query: baseQuery({
        types: ['attraction'],
        attractionCategoryId: benchmarkUuid('attraction-category', 1),
      }),
      explain: false,
    },
    {
      family: 'filters',
      name: 'business_type',
      query: baseQuery({
        types: ['business'],
        businessTypeId: benchmarkUuid('business-type', 1),
      }),
      explain: false,
    },
    {
      family: 'amenities_rating',
      name: 'one_amenity',
      query: baseQuery({ types: ['business'], amenityIds: amenityIds.slice(0, 1) }),
      explain: false,
    },
    {
      family: 'amenities_rating',
      name: 'five_amenities',
      query: baseQuery({ types: ['business'], amenityIds: amenityIds.slice(0, 5) }),
      explain: false,
    },
    {
      family: 'amenities_rating',
      name: 'twenty_amenities',
      query: baseQuery({ types: ['business'], amenityIds }),
      explain: true,
    },
    {
      family: 'amenities_rating',
      name: 'minimum_rating',
      query: baseQuery({ minRating: '4.25', sort: 'rating' }),
      explain: true,
    },
    {
      family: 'amenities_rating',
      name: 'rating_null_last',
      query: baseQuery({ sort: 'rating' }),
      explain: false,
    },
    {
      family: 'pagination_visibility',
      name: 'newest_first_page',
      query: baseQuery(),
      explain: true,
    },
    {
      family: 'pagination_visibility',
      name: 'newest_deep_keyset',
      query: baseQuery({ keyset: deepKeyset }),
      explain: true,
    },
    {
      family: 'pagination_visibility',
      name: 'no_result',
      query: baseQuery({ q: 'tu-khoa-khong-ton-tai-4-1-6', sort: 'relevance' }),
      explain: false,
    },
  ];
}

function queryToUrl(query: SearchRepositoryQuery, cursorCodec: SearchCursorCodec): string {
  const params = new URLSearchParams();
  if (query.q !== null) params.set('q', query.q);
  params.set('types', query.types.join(','));
  if (query.regionId !== null) {
    params.set('regionId', query.regionId);
    params.set('includeDescendants', String(query.includeDescendants));
  }
  if (query.articleCategoryId !== null) params.set('articleCategoryId', query.articleCategoryId);
  if (query.attractionCategoryId !== null) {
    params.set('attractionCategoryId', query.attractionCategoryId);
  }
  if (query.businessTypeId !== null) params.set('businessTypeId', query.businessTypeId);
  if (query.minRating !== null) params.set('minRating', query.minRating);
  if (query.amenityIds.length > 0) params.set('amenityIds', [...query.amenityIds].sort().join(','));
  params.set('sort', query.sort);
  params.set('limit', String(query.limit));

  if (query.keyset !== null) {
    const parsed = parseSearchQuery(params);
    params.set('cursor', cursorCodec.encode(query.keyset, cursorCodec.fingerprint(parsed)));
  }

  return `${API_PATH}?${params.toString()}`;
}

function groupStatistics(
  samples: readonly ScenarioMeasurement[]
): Readonly<Record<string, LatencyStatistics>> {
  const grouped = new Map<string, number[]>();
  for (const sample of samples) {
    const values = grouped.get(sample.scenario) ?? [];
    values.push(sample.durationMs);
    grouped.set(sample.scenario, values);
  }
  return Object.fromEntries(
    [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, values]) => [name, calculateLatencyStatistics(values)])
  );
}

function projectionKey(item: SearchReadProjection): string {
  return `${item.entityType}:${item.id}`;
}

async function auditBoundedKeyset(
  scenario: BenchmarkScenario,
  repository: DrizzleSearchRepository
): Promise<BoundedKeysetAudit> {
  const reference = await repository.search({
    ...scenario.query,
    keyset: null,
    limit: 50,
  });
  const pageSize = 20;
  const collected: SearchReadProjection[] = [];
  let keyset: SearchKeyset | null = null;
  let pagesRead = 0;

  while (collected.length < reference.items.length && pagesRead < 3) {
    const page = await repository.search({
      ...scenario.query,
      keyset,
      limit: pageSize,
    });
    pagesRead += 1;
    collected.push(...page.items);
    if (!page.hasMore) break;
    if (page.lastKeyset === null) {
      throw new Error(`Bounded keyset scenario ${scenario.name} hasMore without a keyset`);
    }
    keyset = page.lastKeyset;
  }

  const collectedKeys = collected.map(projectionKey);
  const duplicateFree = new Set(collectedKeys).size === collectedKeys.length;
  const expectedKeys = reference.items.map(projectionKey);
  const firstPageSequenceStable =
    expectedKeys.length <= collectedKeys.length &&
    expectedKeys.every((key, index) => collectedKeys[index] === key);

  return {
    scenario: scenario.name,
    pageSize,
    pagesRead,
    itemsRead: collected.length,
    duplicateFree,
    firstPageSequenceStable,
    passed: duplicateFree && firstPageSequenceStable,
  };
}

async function measureBoundedRankingQuality(
  scenarios: readonly BenchmarkScenario[],
  exactRepository: DrizzleSearchRepository,
  boundedRepository: DrizzleSearchRepository
): Promise<BoundedRankingQualityReport> {
  const relevanceScenarios = scenarios.filter(
    (scenario) => scenario.query.q !== null && scenario.query.sort === 'relevance'
  );
  const qualityEntries: Array<[string, RankingQualityMetrics]> = [];
  const keysetEntries: Array<[string, BoundedKeysetAudit]> = [];

  for (const scenario of relevanceScenarios) {
    const comparisonQuery: SearchRepositoryQuery = {
      ...scenario.query,
      keyset: null,
      limit: 50,
    };
    const [exact, bounded] = await Promise.all([
      exactRepository.search(comparisonQuery),
      boundedRepository.search(comparisonQuery),
    ]);
    qualityEntries.push([scenario.name, calculateRankingQuality(exact.items, bounded.items)]);
    keysetEntries.push([scenario.name, await auditBoundedKeyset(scenario, boundedRepository)]);
  }

  const scenarioMetrics = Object.fromEntries(qualityEntries);
  const keysetAudits = Object.fromEntries(keysetEntries);
  return {
    thresholds: BOUNDED_RANKING_QUALITY_THRESHOLDS,
    scenarios: scenarioMetrics,
    keysetAudits,
    allScenariosPassed: Object.values(scenarioMetrics).every((quality) => quality.passed),
    allKeysetAuditsPassed: Object.values(keysetAudits).every((audit) => audit.passed),
  };
}

function projectionsMatchExactly(
  exact: readonly SearchReadProjection[],
  prototype: readonly SearchReadProjection[]
): boolean {
  return JSON.stringify(exact) === JSON.stringify(prototype);
}

function countCrossEntityEqualRankPairs(items: readonly SearchReadProjection[]): number {
  let count = 0;
  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    if (
      previous?.entityType !== current?.entityType &&
      previous?.relevance !== null &&
      previous?.relevance === current?.relevance
    ) {
      count += 1;
    }
  }
  return count;
}

async function auditExactPerEntityScenario(
  scenario: BenchmarkScenario,
  exactRepository: DrizzleSearchRepository,
  prototypeRepository: DrizzleSearchRepository
): Promise<ExactPerEntityPageAudit> {
  const pageSize = 20;
  const requiredPages = 10;
  const exactKeys = new Set<string>();
  const prototypeKeys = new Set<string>();
  let exactKeyset: SearchKeyset | null = scenario.query.keyset;
  let prototypeKeyset: SearchKeyset | null = scenario.query.keyset;
  let pagesCompared = 0;
  let exactItemsCompared = 0;
  let prototypeItemsCompared = 0;
  let sequenceMatches = true;
  let projectionMatches = true;
  let rankMatches = true;
  let hasMoreMatches = true;
  let duplicateFree = true;
  let prematureExhaustion = false;
  let crossEntityEqualRankPairs = 0;
  let cursorBoundaryCrossEntityTie = false;
  let previousExactItem: SearchReadProjection | undefined;

  while (pagesCompared < requiredPages) {
    const [exactPage, prototypePage]: [SearchRepositoryPage, SearchRepositoryPage] =
      await Promise.all([
        exactRepository.search({ ...scenario.query, keyset: exactKeyset, limit: pageSize }),
        prototypeRepository.search({
          ...scenario.query,
          keyset: prototypeKeyset,
          limit: pageSize,
        }),
      ]);
    pagesCompared += 1;
    exactItemsCompared += exactPage.items.length;
    prototypeItemsCompared += prototypePage.items.length;

    const exactPageKeys = exactPage.items.map(projectionKey);
    const prototypePageKeys = prototypePage.items.map(projectionKey);
    sequenceMatches &&= JSON.stringify(exactPageKeys) === JSON.stringify(prototypePageKeys);
    projectionMatches &&= projectionsMatchExactly(exactPage.items, prototypePage.items);
    rankMatches &&= exactPage.items.every(
      (item, index) => item.relevance === prototypePage.items[index]?.relevance
    );
    hasMoreMatches &&= exactPage.hasMore === prototypePage.hasMore;
    prematureExhaustion ||= !prototypePage.hasMore && exactPage.hasMore;

    if (pagesCompared === 1 && scenario.query.keyset?.sort === 'relevance') {
      const firstExactItem = exactPage.items[0];
      cursorBoundaryCrossEntityTie = Boolean(
        firstExactItem &&
          firstExactItem.relevance === scenario.query.keyset.sortValue &&
          firstExactItem.entityType !== scenario.query.keyset.entityType
      );
      if (cursorBoundaryCrossEntityTie) crossEntityEqualRankPairs += 1;
    }

    const exactWithBoundary = previousExactItem
      ? [previousExactItem, ...exactPage.items]
      : exactPage.items;
    crossEntityEqualRankPairs += countCrossEntityEqualRankPairs(exactWithBoundary);
    previousExactItem = exactPage.items.at(-1);

    for (const key of exactPageKeys) {
      if (exactKeys.has(key)) duplicateFree = false;
      exactKeys.add(key);
    }
    for (const key of prototypePageKeys) {
      if (prototypeKeys.has(key)) duplicateFree = false;
      prototypeKeys.add(key);
    }

    if (!exactPage.hasMore || !prototypePage.hasMore) break;
    if (exactPage.hasMore && exactPage.lastKeyset === null) {
      throw new Error(`Exact baseline ${scenario.name} hasMore without a keyset`);
    }
    if (prototypePage.hasMore && prototypePage.lastKeyset === null) {
      throw new Error(`Per-entity prototype ${scenario.name} hasMore without a keyset`);
    }
    exactKeyset = exactPage.lastKeyset;
    prototypeKeyset = prototypePage.lastKeyset;
  }

  const passed =
    pagesCompared === requiredPages &&
    sequenceMatches &&
    projectionMatches &&
    rankMatches &&
    hasMoreMatches &&
    duplicateFree &&
    !prematureExhaustion;

  return {
    scenario: scenario.name,
    pageSize,
    requiredPages,
    pagesCompared,
    exactItemsCompared,
    prototypeItemsCompared,
    sequenceMatches,
    projectionMatches,
    rankMatches,
    hasMoreMatches,
    duplicateFree,
    prematureExhaustion,
    crossEntityEqualRankPairs,
    cursorBoundaryCrossEntityTie,
    passed,
  };
}

async function findCrossEntityTieFixture(
  sqlClient: postgres.Sql
): Promise<CrossEntityTieFixture | null> {
  const q = 'benchmark';
  const rows = await sqlClient<
    Array<{
      relevance: number;
      cursorEntityType: SearchKeyset['entityType'];
      cursorId: string;
      matchingEntityTypes: SearchKeyset['entityType'][];
    }>
  >`
    WITH search_input AS (
      SELECT websearch_to_tsquery('public.hsp_vietnamese'::regconfig, ${q}) AS query
    ), ranked_entities AS (
      SELECT
        'article'::text AS entity_type,
        1::integer AS entity_order,
        article.id,
        ts_rank_cd(article.search_vector, search_input.query, 1) AS relevance
      FROM public.articles AS article
      INNER JOIN public.article_categories AS category ON category.id = article.category_id
      CROSS JOIN search_input
      WHERE article.status = 'published'::public.article_status
        AND article.deleted_at IS NULL
        AND article.published_at IS NOT NULL
        AND article.published_at <= CURRENT_TIMESTAMP
        AND article.search_vector @@ search_input.query

      UNION ALL

      SELECT
        'attraction'::text,
        2::integer,
        attraction.id,
        ts_rank_cd(attraction.search_vector, search_input.query, 1)
      FROM public.attractions AS attraction
      INNER JOIN public.regions AS region
        ON region.id = attraction.region_id AND region.deleted_at IS NULL
      INNER JOIN public.attraction_categories AS category
        ON category.id = attraction.category_id
      CROSS JOIN search_input
      WHERE attraction.status = 'active'
        AND attraction.deleted_at IS NULL
        AND attraction.search_vector @@ search_input.query

      UNION ALL

      SELECT
        'business'::text,
        3::integer,
        business.id,
        ts_rank_cd(business.search_vector, search_input.query, 1)
      FROM public.businesses AS business
      INNER JOIN public.regions AS region
        ON region.id = business.region_id AND region.deleted_at IS NULL
      INNER JOIN public.business_types AS business_type
        ON business_type.id = business.business_type_id AND business_type.is_active = true
      CROSS JOIN search_input
      WHERE business.status = 'active'
        AND business.deleted_at IS NULL
        AND business.search_vector @@ search_input.query

      UNION ALL

      SELECT
        'place'::text,
        4::integer,
        place.id,
        ts_rank_cd(place.search_vector, search_input.query, 1)
      FROM public.tourist_places AS place
      INNER JOIN public.regions AS region
        ON region.id = place.region_id AND region.deleted_at IS NULL
      CROSS JOIN search_input
      WHERE place.status = 'active'
        AND place.deleted_at IS NULL
        AND place.search_vector @@ search_input.query
    ), shared_scores AS (
      SELECT
        relevance,
        min(entity_order) AS cursor_entity_order,
        array_agg(DISTINCT entity_type ORDER BY entity_type) AS matching_entity_types
      FROM ranked_entities
      GROUP BY relevance
      HAVING count(DISTINCT entity_type) > 1
      ORDER BY relevance DESC
      LIMIT 1
    ), cursor_row AS (
      SELECT ranked_entities.*
      FROM ranked_entities
      INNER JOIN shared_scores
        ON shared_scores.relevance = ranked_entities.relevance
        AND shared_scores.cursor_entity_order = ranked_entities.entity_order
      ORDER BY ranked_entities.id DESC
      LIMIT 1
    )
    SELECT
      cursor_row.relevance AS "relevance",
      cursor_row.entity_type AS "cursorEntityType",
      cursor_row.id::text AS "cursorId",
      shared_scores.matching_entity_types AS "matchingEntityTypes"
    FROM cursor_row
    INNER JOIN shared_scores ON shared_scores.relevance = cursor_row.relevance
  `;
  const fixture = rows[0];
  return fixture ? { q, ...fixture } : null;
}

async function measureExactPerEntityEquivalence(
  scenarios: readonly BenchmarkScenario[],
  exactRepository: DrizzleSearchRepository,
  prototypeRepository: DrizzleSearchRepository,
  sqlClient: postgres.Sql
): Promise<ExactPerEntityEquivalenceReport> {
  const requiredNames = new Set([
    'rare_accented',
    'rare_unaccented',
    'common_term',
    'multi_term',
    'quoted_phrase',
    'websearch_operators',
    'multi_type',
  ]);
  const auditScenarios = scenarios.filter((scenario) => requiredNames.has(scenario.name));
  const crossEntityTieFixture = await findCrossEntityTieFixture(sqlClient);
  if (crossEntityTieFixture) {
    auditScenarios.push({
      family: 'fts_core',
      name: 'cross_entity_equal_rank',
      query: baseQuery({
        q: crossEntityTieFixture.q,
        sort: 'relevance',
        keyset: {
          sort: 'relevance',
          sortValue: crossEntityTieFixture.relevance,
          entityType: crossEntityTieFixture.cursorEntityType,
          id: crossEntityTieFixture.cursorId,
        },
      }),
      explain: false,
    });
  }

  const entries: Array<[string, ExactPerEntityPageAudit]> = [];
  for (const scenario of auditScenarios) {
    entries.push([
      scenario.name,
      await auditExactPerEntityScenario(scenario, exactRepository, prototypeRepository),
    ]);
  }
  const scenarioAudits = Object.fromEntries(entries);
  const totalCrossEntityEqualRankPairs = Object.values(scenarioAudits).reduce(
    (total, audit) => total + audit.crossEntityEqualRankPairs,
    0
  );
  const crossEntityTieCoverage = totalCrossEntityEqualRankPairs > 0;

  return {
    requiredPagesPerScenario: 10,
    scenarios: scenarioAudits,
    crossEntityTieFixture,
    crossEntityTieCoverage,
    totalCrossEntityEqualRankPairs,
    allScenariosPassed:
      crossEntityTieCoverage && Object.values(scenarioAudits).every((audit) => audit.passed),
  };
}

async function measureFamily(
  family: ScenarioFamily,
  scenarios: readonly BenchmarkScenario[],
  options: SearchBenchmarkOptions,
  operation: (scenario: BenchmarkScenario) => Promise<void>
): Promise<FamilyMeasurement> {
  for (let index = 0; index < options.warmupsPerFamily; index += 1) {
    await operation(scenarios[index % scenarios.length] as BenchmarkScenario);
  }

  const measurements = new Array<ScenarioMeasurement>(options.samplesPerFamily);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const sampleIndex = nextIndex;
      nextIndex += 1;
      if (sampleIndex >= options.samplesPerFamily) return;

      const scenario = scenarios[sampleIndex % scenarios.length] as BenchmarkScenario;
      const startedAt = performance.now();
      await operation(scenario);
      measurements[sampleIndex] = {
        scenario: scenario.name,
        durationMs: performance.now() - startedAt,
      };
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, options.samplesPerFamily) }, () => worker())
  );

  return {
    family,
    samples: measurements.length,
    latency: calculateLatencyStatistics(measurements.map((sample) => sample.durationMs)),
    scenarios: groupStatistics(measurements),
  };
}

async function measureBoundary(
  scenarios: readonly BenchmarkScenario[],
  options: SearchBenchmarkOptions,
  operation: (scenario: BenchmarkScenario) => Promise<void>
): Promise<readonly FamilyMeasurement[]> {
  const families: readonly ScenarioFamily[] = [
    'fts_core',
    'filters',
    'amenities_rating',
    'pagination_visibility',
  ];
  const measurements: FamilyMeasurement[] = [];
  for (const family of families) {
    const familyScenarios = scenarios.filter((scenario) => scenario.family === family);
    measurements.push(await measureFamily(family, familyScenarios, options, operation));
  }
  return measurements;
}

async function inspectDataset(
  sqlClient: postgres.Sql,
  expectedFtsIndexes: readonly string[]
): Promise<{
  readonly environment: EnvironmentRow;
  readonly counts: Readonly<Record<string, number>>;
  readonly indexes: readonly IndexCatalogRow[];
  readonly relations: readonly RelationSizeRow[];
  readonly checksum: string;
}> {
  const environmentRows = await sqlClient<EnvironmentRow[]>`
    SELECT
      current_database() AS "database",
      version() AS "postgresVersion",
      current_setting('server_version') AS "serverVersion",
      current_setting('shared_buffers') AS "sharedBuffers",
      current_setting('work_mem') AS "workMem",
      current_setting('effective_cache_size') AS "effectiveCacheSize",
      current_setting('max_connections') AS "maxConnections"
  `;
  const countRows = await sqlClient<DatasetCountRow[]>`
    SELECT 'users' AS name, count(*)::text AS count FROM users
    UNION ALL SELECT 'regions', count(*)::text FROM regions
    UNION ALL SELECT 'article_categories', count(*)::text FROM article_categories
    UNION ALL SELECT 'attraction_categories', count(*)::text FROM attraction_categories
    UNION ALL SELECT 'business_types', count(*)::text FROM business_types
    UNION ALL SELECT 'amenities', count(*)::text FROM amenities
    UNION ALL SELECT 'articles', count(*)::text FROM articles
    UNION ALL SELECT 'tourist_places', count(*)::text FROM tourist_places
    UNION ALL SELECT 'businesses', count(*)::text FROM businesses
    UNION ALL SELECT 'attractions', count(*)::text FROM attractions
    UNION ALL SELECT 'reviews', count(*)::text FROM reviews
    UNION ALL SELECT 'business_amenities', count(*)::text FROM business_amenities
    ORDER BY name
  `;
  const indexes = await sqlClient<IndexCatalogRow[]>`
    SELECT
      index_class.relname AS name,
      index_catalog.indisvalid AS "isValid",
      index_catalog.indisready AS "isReady",
      pg_relation_size(index_catalog.indexrelid)::text AS "sizeBytes"
    FROM pg_index index_catalog
    JOIN pg_class index_class ON index_class.oid = index_catalog.indexrelid
    WHERE index_class.relname = ANY(${sqlClient.array([...expectedFtsIndexes])}::text[])
    ORDER BY index_class.relname
  `;
  const relations = await sqlClient<RelationSizeRow[]>`
    SELECT
      relation_name AS name,
      pg_relation_size(relation_name::regclass)::text AS "tableBytes",
      pg_indexes_size(relation_name::regclass)::text AS "indexesBytes"
    FROM unnest(${sqlClient.array([...SEARCH_BENCHMARK_TABLES])}::text[]) AS relation_name
    ORDER BY relation_name
  `;

  const environment = environmentRows[0];
  if (!environment) throw new Error('Unable to inspect PostgreSQL benchmark environment');
  const counts = Object.fromEntries(countRows.map((row) => [row.name, Number(row.count)]));
  const expectedCounts: Readonly<Record<string, number>> = {
    users: SEARCH_BENCHMARK_DATASET.users,
    regions: SEARCH_BENCHMARK_DATASET.regions,
    article_categories: SEARCH_BENCHMARK_DATASET.articleCategories,
    attraction_categories: SEARCH_BENCHMARK_DATASET.attractionCategories,
    business_types: SEARCH_BENCHMARK_DATASET.businessTypes,
    amenities: SEARCH_BENCHMARK_DATASET.amenities,
    articles: SEARCH_BENCHMARK_DATASET.articles,
    tourist_places: SEARCH_BENCHMARK_DATASET.places,
    businesses: SEARCH_BENCHMARK_DATASET.businesses,
    attractions: SEARCH_BENCHMARK_DATASET.attractions,
    reviews: SEARCH_BENCHMARK_DATASET.reviews,
    business_amenities: SEARCH_BENCHMARK_DATASET.businessAmenities,
  };
  for (const [name, expected] of Object.entries(expectedCounts)) {
    if (counts[name] !== expected) {
      throw new Error(
        `Benchmark dataset ${name} count is ${counts[name] ?? 'missing'}; expected ${expected}`
      );
    }
  }
  if (
    indexes.length !== expectedFtsIndexes.length ||
    indexes.some((index) => !index.isValid || !index.isReady)
  ) {
    throw new Error('Benchmark database does not contain four valid and ready Search FTS indexes');
  }

  return {
    environment,
    counts,
    indexes,
    relations,
    checksum: checksumBenchmarkSnapshot({ counts, indexes }),
  };
}

async function explainScenario(
  sqlClient: postgres.Sql,
  scenario: BenchmarkScenario,
  buildSearchSql: SearchSqlBuilder
): Promise<SearchExplainPlanSummary> {
  const statement = buildSearchSql(scenario.query);
  if (statement === null) throw new Error(`Scenario ${scenario.name} produced no unified query`);
  const compiled = new PgDialect().sqlToQuery(statement);
  const rows = await sqlClient.unsafe<ExplainRow[]>(
    `EXPLAIN (ANALYZE, VERBOSE, BUFFERS, FORMAT JSON) ${compiled.sql}`,
    compiled.params as never[]
  );
  const payload = rows[0]?.['QUERY PLAN'];
  if (payload === undefined) throw new Error(`EXPLAIN returned no plan for ${scenario.name}`);
  return summarizeExplainPlan(payload);
}

function evaluateGate(
  smoke: boolean,
  api: readonly FamilyMeasurement[],
  plans: Readonly<Record<string, SearchExplainPlanSummary>>,
  expectedFtsIndexes: readonly string[],
  quality: BoundedRankingQualityReport | null,
  exactEquivalence: ExactPerEntityEquivalenceReport | null
): {
  readonly status: 'diagnostic_only' | 'passed' | 'failed';
  readonly p95Under100Ms: boolean;
  readonly p99TargetUnder150Ms: boolean;
  readonly ftsIndexesObserved: boolean;
  readonly noTempSpill: boolean;
  readonly relevanceQualityPassed: boolean | null;
  readonly keysetAuditPassed: boolean | null;
  readonly exactEquivalencePassed: boolean | null;
  readonly failures: readonly string[];
  readonly warnings: readonly string[];
} {
  const failures: string[] = [];
  const warnings: string[] = [];
  const apiScenarios = api.flatMap((family) => Object.values(family.scenarios));
  const p95Under100Ms = apiScenarios.every((scenario) => scenario.p95Ms < 100);
  const p99TargetUnder150Ms = apiScenarios.every((scenario) => scenario.p99Ms <= 150);
  const observedIndexes = new Set(Object.values(plans).flatMap((plan) => plan.indexNames));
  const ftsIndexesObserved = expectedFtsIndexes.every((index) => observedIndexes.has(index));
  const noTempSpill = Object.values(plans).every(
    (plan) => plan.tempReadBlocks === 0 && plan.tempWrittenBlocks === 0
  );

  if (!p95Under100Ms) failures.push('At least one warm API scenario has p95 >= 100 ms');
  if (!ftsIndexesObserved)
    failures.push('The rare FTS plan did not demonstrate all four FTS indexes');
  if (!noTempSpill) failures.push('At least one critical query plan spilled temporary blocks');
  if (!p99TargetUnder150Ms)
    warnings.push('At least one warm API scenario missed the p99 <= 150 ms target');
  if (quality && !quality.allScenariosPassed) {
    failures.push('At least one bounded-ranking scenario missed the relevance-quality gate');
  }
  if (quality && !quality.allKeysetAuditsPassed) {
    failures.push('At least one bounded-ranking scenario failed the keyset stability audit');
  }
  if (exactEquivalence && !exactEquivalence.allScenariosPassed) {
    failures.push('Exact per-entity top-K did not match the exact baseline across ten pages');
  }
  warnings.push(
    'True cold-cache testing was not executed because the Docker PostgreSQL instance hosts other databases'
  );

  return {
    status: smoke ? 'diagnostic_only' : failures.length === 0 ? 'passed' : 'failed',
    p95Under100Ms,
    p99TargetUnder150Ms,
    ftsIndexesObserved,
    noTempSpill,
    relevanceQualityPassed: quality?.allScenariosPassed ?? null,
    keysetAuditPassed:
      quality?.allKeysetAuditsPassed ?? exactEquivalence?.allScenariosPassed ?? null,
    exactEquivalencePassed: exactEquivalence?.allScenariosPassed ?? null,
    failures,
    warnings,
  };
}

export async function runSearchBenchmark(
  databaseUrl: string,
  options: SearchBenchmarkOptions
): Promise<Record<string, unknown>> {
  const sqlClient = postgres(databaseUrl, {
    max: Math.max(options.concurrency, 2),
    prepare: false,
  });
  try {
    if (
      options.rankingMode === 'bounded' &&
      (options.candidateLimit === null || options.candidateStrategy === null)
    ) {
      throw new Error('Bounded benchmark requires a server-owned candidate strategy and limit');
    }
    const expectedFtsIndexes = options.ftsStorage === 'stored' ? STORED_FTS_INDEXES : FTS_INDEXES;
    const dataset = await inspectDataset(sqlClient, expectedFtsIndexes);
    const scenarios = buildScenarios();
    const exactSearchSql: SearchSqlBuilder = (query) =>
      buildUnifiedSearchSql(query, options.ftsStorage);
    const selectedSearchSql: SearchSqlBuilder =
      options.rankingMode === 'bounded'
        ? (query) =>
            buildBoundedSearchSql(query, {
              candidateLimit: options.candidateLimit as number,
              candidateStrategy: options.candidateStrategy ?? undefined,
            })
        : options.rankingMode === 'per_entity_exact'
          ? buildExactPerEntityTopKSearchSql
          : exactSearchSql;
    const repository = new DrizzleSearchRepository(db, selectedSearchSql);
    const exactRepository = new DrizzleSearchRepository(db, (query) =>
      buildUnifiedSearchSql(query, 'stored')
    );
    const rankingQuality =
      options.rankingMode === 'bounded'
        ? await measureBoundedRankingQuality(scenarios, exactRepository, repository)
        : null;
    const exactEquivalence =
      options.rankingMode === 'per_entity_exact'
        ? await measureExactPerEntityEquivalence(scenarios, exactRepository, repository, sqlClient)
        : null;
    const cursorCodec = new SearchCursorCodec(SearchConfig.cursorKeyring);
    container.register(
      'SearchController',
      new SearchController(new SearchService(repository, cursorCodec))
    );
    const app = createApp();

    const repositoryMetrics = await measureBoundary(scenarios, options, async (scenario) => {
      await repository.search(scenario.query);
    });
    const apiUrls = new Map(
      scenarios.map((scenario) => [scenario.name, queryToUrl(scenario.query, cursorCodec)])
    );
    const apiMetrics = await measureBoundary(scenarios, options, async (scenario) => {
      const url = apiUrls.get(scenario.name);
      if (url === undefined) throw new Error(`Missing API URL for ${scenario.name}`);
      const response = await app.request(url);
      const body = await response.text();
      if (response.status !== 200) {
        throw new Error(`API scenario ${scenario.name} returned HTTP ${response.status}: ${body}`);
      }
    });

    const planEntries: Array<[string, SearchExplainPlanSummary]> = [];
    for (const scenario of scenarios.filter((candidate) => candidate.explain)) {
      planEntries.push([
        scenario.name,
        await explainScenario(sqlClient, scenario, selectedSearchSql),
      ]);
    }
    const plans = Object.fromEntries(planEntries);
    const exactBaselinePlanEntries: Array<[string, SearchExplainPlanSummary]> = [];
    if (options.rankingMode === 'per_entity_exact') {
      for (const scenario of scenarios.filter(
        (candidate) =>
          candidate.explain && candidate.query.q !== null && candidate.query.sort === 'relevance'
      )) {
        exactBaselinePlanEntries.push([
          scenario.name,
          await explainScenario(sqlClient, scenario, exactSearchSql),
        ]);
      }
    }
    const exactBaselinePlans = Object.fromEntries(exactBaselinePlanEntries);
    const planComparison = Object.fromEntries(
      exactBaselinePlanEntries.map(([name, baseline]) => {
        const prototype = plans[name];
        return [
          name,
          {
            exactExecutionTimeMs: baseline.executionTimeMs,
            prototypeExecutionTimeMs: prototype?.executionTimeMs ?? null,
            speedup:
              prototype && prototype.executionTimeMs > 0
                ? Math.round((baseline.executionTimeMs / prototype.executionTimeMs) * 1_000) / 1_000
                : null,
          },
        ];
      })
    );
    const gate = evaluateGate(
      options.smoke,
      apiMetrics,
      plans,
      expectedFtsIndexes,
      rankingQuality,
      exactEquivalence
    );

    return {
      generatedAt: new Date().toISOString(),
      mode: options.smoke ? 'smoke' : 'full',
      ftsStorage: options.ftsStorage,
      rankingMode: options.rankingMode,
      candidateLimit: options.candidateLimit,
      candidateStrategy: options.candidateStrategy,
      methodology: {
        samplesPerFamily: options.samplesPerFamily,
        warmupsPerFamily: options.warmupsPerFamily,
        concurrency: options.concurrency,
        scenarioFamilies: 4,
        scenarioCount: scenarios.length,
        repositoryBoundary: 'Drizzle repository call including row mapping',
        apiBoundary:
          'In-process Hono request including middleware, validation, service and repository',
        boundedRanking:
          options.rankingMode === 'bounded'
            ? options.candidateStrategy === 'global_ts_rank'
              ? 'Global ts_rank proxy bound followed by exact ts_rank_cd re-ranking'
              : 'Stable per-entity canonical quota followed by exact ts_rank_cd re-ranking'
            : null,
        exactPerEntityTopK:
          options.rankingMode === 'per_entity_exact'
            ? 'Exact ts_rank_cd per eligible entity, local K=limit+1, UNION ALL global merge, late hydration'
            : null,
        exactEquivalencePagesPerScenario: options.rankingMode === 'per_entity_exact' ? 10 : null,
        cacheMode: 'warm',
      },
      host: {
        platform: `${os.platform()} ${os.release()} ${os.arch()}`,
        cpuModel: os.cpus()[0]?.model ?? 'unknown',
        logicalCpuCount: os.cpus().length,
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytesAtStart: os.freemem(),
        bunVersion: process.versions.bun ?? 'unknown',
      },
      database: dataset,
      metrics: { repository: repositoryMetrics, api: apiMetrics },
      rankingQuality,
      exactEquivalence,
      plans,
      exactBaselinePlans,
      planComparison,
      gate,
      pendingDecisions: [
        'PD-FTS-001 Price',
        'PD-FTS-003 Thumbnail URL',
        'PD-FTS-004-PROD bounded ranking production semantics',
        'Exact per-entity top-K production query-shape approval',
      ],
      limitations: [
        'The in-process API metric excludes network, reverse proxy and TLS latency.',
        'The dedicated benchmark database uses the local Docker host, not production hardware.',
        'Cold-cache restart/drop-cache measurements require an isolated PostgreSQL instance.',
        'Exact ts_rank_cd is a technical reference, not a substitute for human Vietnamese relevance judgments.',
      ],
    };
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}
