import { describe, expect, test } from 'bun:test';
import type { SearchReadProjection } from '../repository/search-read-model';
import { calculateRankingQuality } from './search-benchmark.quality';

function item(id: string, relevance: number): SearchReadProjection {
  return {
    entityType: 'article',
    entityOrder: 1,
    id,
    name: id,
    slug: id,
    summarySource: null,
    thumbnailCandidate: null,
    region: null,
    category: null,
    rating: null,
    priceMin: null,
    priceMax: null,
    relevance,
    sortValue: relevance,
  };
}

describe('bounded ranking quality metrics', () => {
  test('passes an exact top-k match', () => {
    const exact = Array.from({ length: 20 }, (_, index) => item(String(index), 1 - index / 100));
    const quality = calculateRankingQuality(exact, exact);

    expect(quality).toMatchObject({
      top1Match: true,
      top10Overlap: 1,
      top20Overlap: 1,
      referenceNdcgAt10: 1,
      referenceNdcgAt20: 1,
      passed: true,
    });
  });

  test('fails when proxy pruning loses high-ranked exact results', () => {
    const exact = Array.from({ length: 20 }, (_, index) => item(`exact-${index}`, 1 - index / 100));
    const bounded = [item('outside', 0.01), ...exact.slice(10), ...exact.slice(1, 10)];
    const quality = calculateRankingQuality(exact, bounded);

    expect(quality.top1Match).toBe(false);
    expect(quality.top10Overlap).toBeLessThan(0.9);
    expect(quality.referenceNdcgAt10).toBeLessThan(0.95);
    expect(quality.passed).toBe(false);
  });

  test('treats two empty result sets as equivalent', () => {
    expect(calculateRankingQuality([], [])).toMatchObject({
      top1Match: true,
      top10Overlap: 1,
      referenceNdcgAt10: 1,
      passed: true,
    });
  });
});
