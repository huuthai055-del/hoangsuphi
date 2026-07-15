import type { SearchReadProjection } from '../repository/search-read-model';

export const BOUNDED_RANKING_QUALITY_THRESHOLDS = {
  top10Overlap: 0.9,
  top20Overlap: 0.9,
  referenceNdcgAt10: 0.95,
  referenceNdcgAt20: 0.95,
} as const;

export interface RankingQualityMetrics {
  readonly exactCount: number;
  readonly boundedCount: number;
  readonly exactTop5: readonly string[];
  readonly boundedTop5: readonly string[];
  readonly exactTop5Scores: readonly number[];
  readonly boundedTop5Scores: readonly number[];
  readonly top1Match: boolean;
  readonly top1ScoreEquivalent: boolean;
  readonly top10Overlap: number;
  readonly top20Overlap: number;
  readonly top50Overlap: number;
  readonly referenceNdcgAt10: number;
  readonly referenceNdcgAt20: number;
  readonly referenceNdcgAt50: number;
  readonly passed: boolean;
}

function rankedKey(item: SearchReadProjection): string {
  return `${item.entityType}:${item.id}`;
}

function roundMetric(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function overlapAt(
  exact: readonly SearchReadProjection[],
  bounded: readonly SearchReadProjection[],
  cutoff: number
): number {
  const exactKeys = new Set(exact.slice(0, cutoff).map(rankedKey));
  const denominator = Math.min(cutoff, exact.length);
  if (denominator === 0) return bounded.length === 0 ? 1 : 0;
  const overlap = bounded
    .slice(0, cutoff)
    .reduce((count, item) => count + (exactKeys.has(rankedKey(item)) ? 1 : 0), 0);
  return roundMetric(overlap / denominator);
}

function relevance(item: SearchReadProjection | undefined): number {
  return item && typeof item.relevance === 'number' && Number.isFinite(item.relevance)
    ? Math.max(0, item.relevance)
    : 0;
}

function discountedCumulativeGain(values: readonly number[]): number {
  return values.reduce((total, value, index) => total + value / Math.log2(index + 2), 0);
}

function referenceNdcgAt(
  exact: readonly SearchReadProjection[],
  bounded: readonly SearchReadProjection[],
  cutoff: number
): number {
  const ideal = discountedCumulativeGain(exact.slice(0, cutoff).map(relevance));
  if (ideal === 0) return overlapAt(exact, bounded, cutoff);
  const observed = discountedCumulativeGain(bounded.slice(0, cutoff).map(relevance));
  return roundMetric(Math.min(1, observed / ideal));
}

export function calculateRankingQuality(
  exact: readonly SearchReadProjection[],
  bounded: readonly SearchReadProjection[]
): RankingQualityMetrics {
  const top1Match =
    exact.length === 0
      ? bounded.length === 0
      : bounded.length > 0 &&
        rankedKey(exact[0] as SearchReadProjection) ===
          rankedKey(bounded[0] as SearchReadProjection);
  const exactTopScore = relevance(exact[0]);
  const boundedTopScore = relevance(bounded[0]);
  const top1ScoreEquivalent =
    exact.length === 0
      ? bounded.length === 0
      : bounded.length > 0 && Math.abs(exactTopScore - boundedTopScore) <= 1e-7;
  const top10Overlap = overlapAt(exact, bounded, 10);
  const top20Overlap = overlapAt(exact, bounded, 20);
  const top50Overlap = overlapAt(exact, bounded, 50);
  const referenceNdcgAt10 = referenceNdcgAt(exact, bounded, 10);
  const referenceNdcgAt20 = referenceNdcgAt(exact, bounded, 20);
  const referenceNdcgAt50 = referenceNdcgAt(exact, bounded, 50);
  const passed =
    top1Match &&
    top10Overlap >= BOUNDED_RANKING_QUALITY_THRESHOLDS.top10Overlap &&
    top20Overlap >= BOUNDED_RANKING_QUALITY_THRESHOLDS.top20Overlap &&
    referenceNdcgAt10 >= BOUNDED_RANKING_QUALITY_THRESHOLDS.referenceNdcgAt10 &&
    referenceNdcgAt20 >= BOUNDED_RANKING_QUALITY_THRESHOLDS.referenceNdcgAt20;

  return {
    exactCount: exact.length,
    boundedCount: bounded.length,
    exactTop5: exact.slice(0, 5).map(rankedKey),
    boundedTop5: bounded.slice(0, 5).map(rankedKey),
    exactTop5Scores: exact.slice(0, 5).map(relevance),
    boundedTop5Scores: bounded.slice(0, 5).map(relevance),
    top1Match,
    top1ScoreEquivalent,
    top10Overlap,
    top20Overlap,
    top50Overlap,
    referenceNdcgAt10,
    referenceNdcgAt20,
    referenceNdcgAt50,
    passed,
  };
}
