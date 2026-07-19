import { expect, test, describe } from 'bun:test';
import { parseRecommendationsQuery } from './recommendations.dto';
import { ValidationError } from '@/common/errors/http.errors';

describe('Recommendations DTO', () => {
  test('parses valid nearby strategy', () => {
    const input = {
      strategy: 'nearby',
      sourceType: 'place',
      sourceId: '018f0a0e-a5a4-7f1a-b33a-123456789abc',
    };
    const result = parseRecommendationsQuery(input);
    expect(result.strategy).toBe('nearby');
    expect(result.sourceType).toBe('place');
    expect(result.sourceId).toBe('018f0a0e-a5a4-7f1a-b33a-123456789abc');
    expect(result.limit).toBe(6);
  });

  test('parses valid same_region strategy', () => {
    const input = {
      strategy: 'same_region',
      sourceType: 'business',
      sourceId: '018f0a0e-a5a4-7f1a-b33a-123456789abc',
      limit: '12',
    };
    const result = parseRecommendationsQuery(input);
    expect(result.strategy).toBe('same_region');
    expect(result.limit).toBe(12);
  });

  test('parses valid top_rated strategy without source fields', () => {
    const input = { strategy: 'top_rated' };
    const result = parseRecommendationsQuery(input);
    expect(result.strategy).toBe('top_rated');
    expect(result.limit).toBe(6);
  });

  test('parses valid newest strategy with limit', () => {
    const input = { strategy: 'newest', limit: '10' };
    const result = parseRecommendationsQuery(input);
    expect(result.strategy).toBe('newest');
    expect(result.limit).toBe(10);
  });

  test('rejects missing strategy', () => {
    expect(() => parseRecommendationsQuery({ limit: '6' })).toThrow(ValidationError);
  });

  test('rejects invalid strategy', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'random' })).toThrow(ValidationError);
  });

  test('rejects nearby missing source fields', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'nearby' })).toThrow(ValidationError);
  });

  test('rejects same_region missing source fields', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'same_region' })).toThrow(ValidationError);
  });

  test('rejects article as sourceType', () => {
    expect(() =>
      parseRecommendationsQuery({
        strategy: 'nearby',
        sourceType: 'article',
        sourceId: '018f0a0e-a5a4-7f1a-b33a-123456789abc',
      })
    ).toThrow(ValidationError);
  });

  test('rejects top_rated with source fields', () => {
    expect(() =>
      parseRecommendationsQuery({
        strategy: 'top_rated',
        sourceType: 'place',
        sourceId: '018f0a0e-a5a4-7f1a-b33a-123456789abc',
      })
    ).toThrow(ValidationError);
  });

  test('rejects newest with source fields', () => {
    expect(() =>
      parseRecommendationsQuery({
        strategy: 'newest',
        sourceType: 'place',
        sourceId: '018f0a0e-a5a4-7f1a-b33a-123456789abc',
      })
    ).toThrow(ValidationError);
  });

  test('rejects limit less than 1', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'top_rated', limit: '0' })).toThrow(
      ValidationError
    );
  });

  test('rejects limit greater than 12', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'top_rated', limit: '13' })).toThrow(
      ValidationError
    );
  });

  test('rejects non-integer limit', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'top_rated', limit: '6.5' })).toThrow(
      ValidationError
    );
  });

  test('rejects unknown query fields', () => {
    expect(() => parseRecommendationsQuery({ strategy: 'top_rated', offset: '1' })).toThrow(
      ValidationError
    );
  });

  test('rejects repeated query keys instead of accepting a polluted first value', () => {
    expect(() =>
      parseRecommendationsQuery(
        new URLSearchParams('strategy=top_rated&strategy=newest')
      )
    ).toThrow(ValidationError);
  });

  test('rejects invalid UUID', () => {
    expect(() =>
      parseRecommendationsQuery({
        strategy: 'nearby',
        sourceType: 'place',
        sourceId: 'invalid-uuid',
      })
    ).toThrow(ValidationError);
  });
});
