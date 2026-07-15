import { describe, expect, test } from 'bun:test';
import { ValidationError } from '@/common/errors/http.errors';
import { SearchQuerySchema, parseSearchQuery } from './search.dto';

const REGION_ID = '019f5ff3-1000-7000-8000-000000000001';
const ARTICLE_CATEGORY_ID = '019f5ff3-1000-7000-8000-000000000002';
const BUSINESS_TYPE_ID = '019f5ff3-1000-7000-8000-000000000003';
const AMENITY_A = '019f5ff3-1000-7000-8000-000000000004';
const AMENITY_B = '019f5ff3-1000-7000-8000-000000000005';

function expectInvalid(input: unknown, field: string): ValidationError {
  try {
    parseSearchQuery(input);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    const validationError = error as ValidationError;
    expect(validationError.errorCode).toBe('VAL_001');
    expect(validationError.details).toHaveProperty(field);
    return validationError;
  }
  throw new Error('Expected search query validation to fail');
}

describe('SearchQuerySchema', () => {
  test('normalizes Unicode q and applies q-search defaults', () => {
    const query = parseSearchQuery({ q: '  Hoàng   Su Phì  ' });

    expect(query.q).toBe('Hoàng Su Phì');
    expect(query.types).toEqual(['article', 'attraction', 'business', 'place']);
    expect(query.sort).toBe('relevance');
    expect(query.limit).toBe(20);
    expect(query.includeDescendants).toBe(false);
  });

  test('supports filter-only search and canonicalizes list/decimal values', () => {
    const query = parseSearchQuery({
      types: 'business',
      minRating: '4.00',
      amenityIds: `${AMENITY_B},${AMENITY_A}`,
    });

    expect(query.q).toBeNull();
    expect(query.types).toEqual(['business']);
    expect(query.minRating).toBe('4');
    expect(query.amenityIds).toEqual([AMENITY_A, AMENITY_B]);
    expect(query.sort).toBe('newest');
  });

  test('canonicalizes entity type order for stable fingerprints', () => {
    const query = parseSearchQuery({ q: 'lúa chín', types: 'place,article,business' });
    expect(query.types).toEqual(['article', 'business', 'place']);
  });

  test('defaults includeDescendants only when Region is present', () => {
    expect(parseSearchQuery({ regionId: REGION_ID }).includeDescendants).toBe(true);
    expect(
      parseSearchQuery({ regionId: REGION_ID, includeDescendants: 'false' }).includeDescendants
    ).toBe(false);
  });

  test('rejects an empty request and relevance without q', () => {
    expectInvalid({}, 'query');
    expectInvalid({ types: 'business', sort: 'relevance' }, 'sort');
  });

  test('rejects punctuation/control/length-invalid q at the API boundary', () => {
    expectInvalid({ q: 'x' }, 'q');
    expectInvalid({ q: 'a\tb' }, 'q');
    expectInvalid({ q: 'a'.repeat(201) }, 'q');
    const result = SearchQuerySchema.safeParse({ q: 'a\tb' });
    expect(result.success ? [] : result.error.issues[0]?.path).toEqual(['q']);
  });

  test('rejects unknown and repeated query keys', () => {
    expectInvalid({ q: 'homestay', unexpected: 'value' }, 'unexpected');
    expectInvalid({ q: ['homestay', 'lodge'] }, 'q');
    expectInvalid(new URLSearchParams('q=homestay&q=lodge'), 'q');
  });

  test('accepts single-value arrays emitted by a query collection adapter', () => {
    const query = parseSearchQuery({ q: ['homestay'], limit: ['10'] });
    expect(query.q).toBe('homestay');
    expect(query.limit).toBe(10);
  });

  test('rejects invalid and duplicate CSV entity types', () => {
    expectInvalid({ types: 'business,business' }, 'types');
    expectInvalid({ types: 'Business' }, 'types');
    expectInvalid({ types: 'business,' }, 'types');
  });

  test('rejects non-canonical UUID, invalid boolean and abusive limit formats', () => {
    expectInvalid({ regionId: REGION_ID.toUpperCase() }, 'regionId');
    expectInvalid({ regionId: REGION_ID, includeDescendants: 'TRUE' }, 'includeDescendants');
    expectInvalid({ types: 'business', limit: '1e1' }, 'limit');
    expectInvalid({ types: 'business', limit: '51' }, 'limit');
  });

  test('rejects invalid rating and Amenity lists', () => {
    expectInvalid({ types: 'business', minRating: '4.125' }, 'minRating');
    expectInvalid({ types: 'business', minRating: '0' }, 'minRating');
    expectInvalid({ types: 'business', amenityIds: `${AMENITY_A},${AMENITY_A}` }, 'amenityIds');
  });

  test('rejects entity-specific filters with no eligible type intersection', () => {
    expectInvalid({ types: 'business', articleCategoryId: ARTICLE_CATEGORY_ID }, 'types');
    expectInvalid(
      { articleCategoryId: ARTICLE_CATEGORY_ID, businessTypeId: BUSINESS_TYPE_ID },
      'types'
    );
  });

  test('validates and canonicalizes active price filters and sorts', () => {
    expect(
      parseSearchQuery({
        types: 'business',
        priceMin: '100000.00',
        priceMax: '250000.50',
        sort: 'price_asc',
      })
    ).toMatchObject({
      types: ['business'],
      priceMin: '100000',
      priceMax: '250000.5',
      sort: 'price_asc',
    });
  });

  test('rejects includeDescendants without Region and invalid price inputs', () => {
    expectInvalid({ types: 'business', includeDescendants: 'true' }, 'includeDescendants');
    expectInvalid({ types: 'business', priceMin: '-1' }, 'priceMin');
    expectInvalid({ types: 'business', priceMin: '1.234' }, 'priceMin');
    expectInvalid({ types: 'business', priceMin: '200', priceMax: '100' }, 'priceMax');
    expectInvalid({ types: 'article', sort: 'price_desc' }, 'sort');
  });

  test('accepts only base64url cursor syntax and maximum public length', () => {
    expect(SearchQuerySchema.safeParse({ types: 'business', cursor: 'abc_DEF-123' }).success).toBe(
      true
    );
    expectInvalid({ types: 'business', cursor: 'abc.def' }, 'cursor');
    expectInvalid({ types: 'business', cursor: 'a'.repeat(513) }, 'cursor');
  });
});
