import { describe, expect, test } from 'bun:test';
import {
  assertDedicatedBenchmarkDatabase,
  benchmarkUuid,
  calculateLatencyStatistics,
  checksumBenchmarkSnapshot,
  readBenchmarkOptions,
} from './search-benchmark.model';

describe('Search benchmark safety and statistics', () => {
  test('accepts only an explicit dedicated benchmark database', () => {
    expect(
      assertDedicatedBenchmarkDatabase(
        'postgresql://postgres:postgres@localhost:5432/hoangsuphi_search_benchmark'
      )
    ).toBe('hoangsuphi_search_benchmark');

    expect(() =>
      assertDedicatedBenchmarkDatabase('postgresql://postgres:postgres@localhost:5432/hoangsuphi')
    ).toThrow('must end with _benchmark');
    expect(() =>
      assertDedicatedBenchmarkDatabase(
        'postgresql://postgres:postgres@localhost:5432/hoangsuphi_production_benchmark'
      )
    ).toThrow('production databases are forbidden');
  });

  test('creates deterministic UUID-shaped benchmark identifiers', () => {
    expect(benchmarkUuid('article', 1)).toBe(benchmarkUuid('article', 1));
    expect(benchmarkUuid('article', 1)).not.toBe(benchmarkUuid('article', 2));
    expect(benchmarkUuid('article', 1)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
    );
  });

  test('calculates nearest-rank latency percentiles without hiding outliers', () => {
    const statistics = calculateLatencyStatistics([1, 2, 3, 4, 100]);
    expect(statistics).toEqual({
      count: 5,
      minimumMs: 1,
      meanMs: 22,
      p50Ms: 3,
      p95Ms: 100,
      p99Ms: 100,
      maximumMs: 100,
    });
  });

  test('snapshot checksum is deterministic and sensitive to counts', () => {
    expect(checksumBenchmarkSnapshot({ articles: 20_000 })).toBe(
      checksumBenchmarkSnapshot({ articles: 20_000 })
    );
    expect(checksumBenchmarkSnapshot({ articles: 20_000 })).not.toBe(
      checksumBenchmarkSnapshot({ articles: 19_999 })
    );
  });

  test('bounded options use a benchmark-only candidate limit with a strict safety range', () => {
    const previous = process.env.SEARCH_BENCHMARK_CANDIDATE_LIMIT;
    const previousStrategy = process.env.SEARCH_BENCHMARK_CANDIDATE_STRATEGY;
    try {
      process.env.SEARCH_BENCHMARK_CANDIDATE_LIMIT = '750';
      process.env.SEARCH_BENCHMARK_CANDIDATE_STRATEGY = 'per_entity_canonical';
      expect(readBenchmarkOptions(true, 'stored', 'bounded')).toMatchObject({
        smoke: true,
        ftsStorage: 'stored',
        rankingMode: 'bounded',
        candidateLimit: 750,
        candidateStrategy: 'per_entity_canonical',
      });

      process.env.SEARCH_BENCHMARK_CANDIDATE_LIMIT = '50';
      expect(() => readBenchmarkOptions(true, 'stored', 'bounded')).toThrow(
        'must be between 51 and 5000'
      );
    } finally {
      if (previous === undefined) {
        process.env.SEARCH_BENCHMARK_CANDIDATE_LIMIT = undefined;
      } else {
        process.env.SEARCH_BENCHMARK_CANDIDATE_LIMIT = previous;
      }
      process.env.SEARCH_BENCHMARK_CANDIDATE_STRATEGY = previousStrategy;
    }
  });

  test('exact per-entity mode has no bounded candidate configuration', () => {
    expect(readBenchmarkOptions(true, 'stored', 'per_entity_exact')).toMatchObject({
      smoke: true,
      ftsStorage: 'stored',
      rankingMode: 'per_entity_exact',
      candidateLimit: null,
      candidateStrategy: null,
    });
  });
});
