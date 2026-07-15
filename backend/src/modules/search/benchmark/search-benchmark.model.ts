import { createHash } from 'node:crypto';

export const SEARCH_BENCHMARK_DATASET = {
  users: 1_000,
  regions: 103,
  articleCategories: 10,
  attractionCategories: 10,
  businessTypes: 10,
  amenities: 25,
  articles: 20_000,
  places: 5_000,
  businesses: 10_000,
  attractions: 10_000,
  reviews: 200_000,
  businessAmenities: 100_000,
} as const;

export const SEARCH_BENCHMARK_TABLES = [
  'articles',
  'tourist_places',
  'businesses',
  'attractions',
  'reviews',
  'business_amenities',
] as const;

export interface LatencyStatistics {
  readonly count: number;
  readonly minimumMs: number;
  readonly meanMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly maximumMs: number;
}

export interface SearchBenchmarkOptions {
  readonly smoke: boolean;
  readonly ftsStorage: 'expression' | 'stored';
  readonly rankingMode: 'exact' | 'bounded' | 'per_entity_exact';
  readonly candidateLimit: number | null;
  readonly candidateStrategy: 'global_ts_rank' | 'per_entity_canonical' | null;
  readonly samplesPerFamily: number;
  readonly warmupsPerFamily: number;
  readonly concurrency: number;
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/u.test(value)) {
    throw new Error(`${name} must be a positive base-10 integer`);
  }
  return Number.parseInt(value, 10);
}

export function readBenchmarkOptions(
  smoke: boolean,
  ftsStorage: SearchBenchmarkOptions['ftsStorage'] = 'expression',
  rankingMode: SearchBenchmarkOptions['rankingMode'] = 'exact'
): SearchBenchmarkOptions {
  const candidateLimit =
    rankingMode === 'bounded'
      ? parsePositiveInteger(
          process.env.SEARCH_BENCHMARK_CANDIDATE_LIMIT,
          500,
          'SEARCH_BENCHMARK_CANDIDATE_LIMIT'
        )
      : null;
  const candidateStrategy =
    rankingMode === 'bounded'
      ? process.env.SEARCH_BENCHMARK_CANDIDATE_STRATEGY ?? 'per_entity_canonical'
      : null;
  if (candidateLimit !== null && (candidateLimit < 51 || candidateLimit > 5_000)) {
    throw new Error('SEARCH_BENCHMARK_CANDIDATE_LIMIT must be between 51 and 5000');
  }
  if (
    candidateStrategy !== null &&
    candidateStrategy !== 'global_ts_rank' &&
    candidateStrategy !== 'per_entity_canonical'
  ) {
    throw new Error(
      'SEARCH_BENCHMARK_CANDIDATE_STRATEGY must be global_ts_rank or per_entity_canonical'
    );
  }

  if (smoke) {
    return {
      smoke: true,
      ftsStorage,
      rankingMode,
      candidateLimit,
      candidateStrategy,
      samplesPerFamily: 20,
      warmupsPerFamily: 2,
      concurrency: 2,
    };
  }

  return {
    smoke: false,
    ftsStorage,
    rankingMode,
    candidateLimit,
    candidateStrategy,
    samplesPerFamily: parsePositiveInteger(
      process.env.SEARCH_BENCHMARK_SAMPLES_PER_FAMILY,
      1_000,
      'SEARCH_BENCHMARK_SAMPLES_PER_FAMILY'
    ),
    warmupsPerFamily: parsePositiveInteger(
      process.env.SEARCH_BENCHMARK_WARMUPS_PER_FAMILY,
      100,
      'SEARCH_BENCHMARK_WARMUPS_PER_FAMILY'
    ),
    concurrency: parsePositiveInteger(
      process.env.SEARCH_BENCHMARK_CONCURRENCY,
      10,
      'SEARCH_BENCHMARK_CONCURRENCY'
    ),
  };
}

export function assertDedicatedBenchmarkDatabase(databaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('SEARCH_BENCHMARK_DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('SEARCH_BENCHMARK_DATABASE_URL must use postgres:// or postgresql://');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//u, ''));
  if (!databaseName.endsWith('_benchmark')) {
    throw new Error('Benchmark database name must end with _benchmark');
  }
  if (databaseName === 'hoangsuphi' || /(?:prod|production)/iu.test(databaseName)) {
    throw new Error('Development or production databases are forbidden for Search benchmark');
  }
  return databaseName;
}

export function benchmarkUuid(namespace: string, ordinal: number): string {
  const hex = createHash('md5')
    .update(`hsp-search-benchmark:${namespace}:${ordinal}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function percentile(sortedValues: readonly number[], quantile: number): number {
  const index = Math.max(0, Math.ceil(sortedValues.length * quantile) - 1);
  return sortedValues[index] ?? 0;
}

export function calculateLatencyStatistics(values: readonly number[]): LatencyStatistics {
  if (values.length === 0) throw new Error('Latency statistics require at least one sample');
  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    count: sorted.length,
    minimumMs: roundMilliseconds(sorted[0] ?? 0),
    meanMs: roundMilliseconds(total / sorted.length),
    p50Ms: roundMilliseconds(percentile(sorted, 0.5)),
    p95Ms: roundMilliseconds(percentile(sorted, 0.95)),
    p99Ms: roundMilliseconds(percentile(sorted, 0.99)),
    maximumMs: roundMilliseconds(sorted.at(-1) ?? 0),
  };
}

export function checksumBenchmarkSnapshot(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
