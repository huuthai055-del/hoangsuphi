import { describe, expect, test } from 'bun:test';
import { requireDedicatedBenchmarkDatabase } from './nearby-benchmark-safety';

describe('Nearby benchmark database safety', () => {
  test('accepts an explicit dedicated benchmark database', () => {
    expect(
      requireDedicatedBenchmarkDatabase(
        'postgresql://postgres:postgres@localhost:5432/hoangsuphi_benchmark'
      )
    ).toBe('hoangsuphi_benchmark');
  });

  test('rejects normal development or production database names', () => {
    expect(() =>
      requireDedicatedBenchmarkDatabase('postgresql://postgres:postgres@localhost:5432/hoangsuphi')
    ).toThrow('must end with "_benchmark"');
  });

  test('rejects malformed database URLs', () => {
    expect(() => requireDedicatedBenchmarkDatabase('not-a-postgresql-url')).toThrow(
      'must be a valid PostgreSQL URL'
    );
  });
});
