import { describe, expect, test } from 'bun:test';
import { ValidationError } from '@/common/errors/http.errors';
import { SearchResponseSchema, parseSearchQuery } from '../dto/search.dto';
import type {
  SearchKeyset,
  SearchQueryInspection,
  SearchReadProjection,
  SearchReferenceFilter,
  SearchReferenceValidation,
  SearchRepositoryPage,
  SearchRepositoryQuery,
} from '../repository/search-read-model';
import type { ISearchRepository } from '../repository/search-repository.interface';
import type { ISearchCursorCodec } from './search-cursor';
import {
  SearchProjectionInvariantError,
  mapSearchProjection,
  toPlainTextSummary,
} from './search-result.mapper';
import { SearchService } from './search.service';

const RESULT_ID = '019f5ff3-3000-7000-8000-000000000001';
const REGION_ID = '019f5ff3-3000-7000-8000-000000000002';
const CATEGORY_ID = '019f5ff3-3000-7000-8000-000000000003';
const AMENITY_ID = '019f5ff3-3000-7000-8000-000000000004';

function validReferences(
  overrides: Partial<SearchReferenceValidation> = {}
): SearchReferenceValidation {
  return {
    region: 'not_requested',
    articleCategoryExists: null,
    attractionCategoryExists: null,
    businessType: 'not_requested',
    requestedAmenityIds: [],
    foundAmenityIds: [],
    missingAmenityIds: [],
    allAmenitiesExist: true,
    ...overrides,
  };
}

function makeProjection(overrides: Partial<SearchReadProjection> = {}): SearchReadProjection {
  return {
    entityType: 'business',
    entityOrder: 3,
    id: RESULT_ID,
    name: 'Hoàng Su Phì Lodge',
    slug: 'hoang-su-phi-lodge',
    summarySource:
      '<p>Homestay&nbsp;<strong>nhìn ra ruộng bậc thang</strong>.</p><script>secret()</script>',
    thumbnailCandidate: null,
    region: { id: REGION_ID, name: 'Thông Nguyên', slug: 'thong-nguyen' },
    category: { id: CATEGORY_ID, code: 'homestay', name: 'Homestay' },
    rating: '4.50',
    priceMin: null,
    priceMax: null,
    relevance: 0.3125,
    sortValue: 0.3125,
    ...overrides,
  };
}

class FakeSearchRepository implements ISearchRepository {
  inspection: SearchQueryInspection = { hasLexemes: true, lexemeCount: 2 };
  references: SearchReferenceValidation = validReferences();
  page: SearchRepositoryPage = { items: [], hasMore: false, lastKeyset: null };
  readonly inspectedQueries: string[] = [];
  readonly referenceFilters: SearchReferenceFilter[] = [];
  readonly searchQueries: SearchRepositoryQuery[] = [];

  async inspectQuery(q: string): Promise<SearchQueryInspection> {
    this.inspectedQueries.push(q);
    return this.inspection;
  }

  async validateReferences(filters: SearchReferenceFilter): Promise<SearchReferenceValidation> {
    this.referenceFilters.push(filters);
    return this.references;
  }

  async search(query: SearchRepositoryQuery): Promise<SearchRepositoryPage> {
    this.searchQueries.push(query);
    return this.page;
  }
}

class FakeCursorCodec implements ISearchCursorCodec {
  decodeResult: SearchKeyset | null = null;
  readonly encoded: Array<{ keyset: SearchKeyset; fingerprint: string }> = [];
  readonly decoded: Array<{ cursor: string; fingerprint: string }> = [];

  fingerprint(): string {
    return 'f'.repeat(64);
  }

  encode(keyset: SearchKeyset, fingerprint: string): string {
    this.encoded.push({ keyset, fingerprint });
    return 'next_cursor';
  }

  decode(cursor: string, fingerprint: string): SearchKeyset | null {
    this.decoded.push({ cursor, fingerprint });
    return this.decodeResult;
  }
}

function makeService(): {
  service: SearchService;
  repository: FakeSearchRepository;
  cursorCodec: FakeCursorCodec;
} {
  const repository = new FakeSearchRepository();
  const cursorCodec = new FakeCursorCodec();
  return {
    service: new SearchService(repository, cursorCodec),
    repository,
    cursorCodec,
  };
}

describe('SearchService', () => {
  test('orchestrates inspection, validation, repository search and safe DTO mapping', async () => {
    const { service, repository, cursorCodec } = makeService();
    const lastKeyset: SearchKeyset = {
      sort: 'relevance',
      sortValue: 0.3125,
      entityType: 'business',
      id: RESULT_ID,
    };
    repository.page = {
      items: [makeProjection()],
      hasMore: true,
      lastKeyset,
    };
    const query = parseSearchQuery({ q: 'Hoàng Su Phì', limit: '20' });

    const response = await service.search(query);

    expect(repository.inspectedQueries).toEqual(['Hoàng Su Phì']);
    expect(repository.referenceFilters).toHaveLength(1);
    expect(repository.searchQueries[0]).toMatchObject({
      q: 'Hoàng Su Phì',
      sort: 'relevance',
      keyset: null,
      limit: 20,
    });
    expect(response).toEqual({
      data: [
        {
          entityType: 'business',
          id: RESULT_ID,
          name: 'Hoàng Su Phì Lodge',
          slug: 'hoang-su-phi-lodge',
          summary: 'Homestay nhìn ra ruộng bậc thang.',
          thumbnailUrl: null,
          region: { id: REGION_ID, name: 'Thông Nguyên', slug: 'thong-nguyen' },
          category: { id: CATEGORY_ID, code: 'homestay', name: 'Homestay' },
          rating: 4.5,
          priceMin: null,
          priceMax: null,
          relevance: 0.3125,
        },
      ],
      meta: {
        cursor: null,
        nextCursor: 'next_cursor',
        hasMore: true,
        totalReturned: 1,
      },
      error: null,
    });
    expect(cursorCodec.encoded).toEqual([{ keyset: lastKeyset, fingerprint: 'f'.repeat(64) }]);
    expect(SearchResponseSchema.safeParse(response).success).toBe(true);
  });

  test('rejects punctuation-only q before reference validation or unified search', async () => {
    const { service, repository } = makeService();
    repository.inspection = { hasLexemes: false, lexemeCount: 0 };

    const promise = service.search(parseSearchQuery({ q: '???' }));
    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    await expect(promise).rejects.toMatchObject({ details: { q: expect.any(String) } });
    expect(repository.referenceFilters).toHaveLength(0);
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('maps all unknown/deleted/inactive reference states to VAL_001', async () => {
    const { service, repository } = makeService();
    repository.references = validReferences({
      region: 'deleted',
      businessType: 'inactive',
      requestedAmenityIds: [AMENITY_ID],
      missingAmenityIds: [AMENITY_ID],
      allAmenitiesExist: false,
    });
    const query = parseSearchQuery({
      types: 'business',
      regionId: REGION_ID,
      businessTypeId: CATEGORY_ID,
      amenityIds: AMENITY_ID,
    });

    const promise = service.search(query);
    await expect(promise).rejects.toMatchObject({
      errorCode: 'VAL_001',
      details: {
        regionId: expect.any(String),
        businessTypeId: expect.any(String),
        amenityIds: expect.stringContaining(AMENITY_ID),
      },
    });
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('maps missing Article and Attraction Categories to their public filter fields', async () => {
    const { service, repository } = makeService();
    repository.references = validReferences({
      articleCategoryExists: false,
      attractionCategoryExists: false,
    });
    const query = parseSearchQuery({ q: 'ruộng bậc thang' });

    await expect(service.search(query)).rejects.toMatchObject({
      errorCode: 'VAL_001',
      details: {
        articleCategoryId: expect.any(String),
        attractionCategoryId: expect.any(String),
      },
    });
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('rejects an invalid cursor before any database call', async () => {
    const { service, repository } = makeService();
    const promise = service.search(parseSearchQuery({ q: 'homestay', cursor: 'invalid_cursor' }));

    await expect(promise).rejects.toMatchObject({
      errorCode: 'VAL_001',
      details: { cursor: expect.any(String) },
    });
    expect(repository.inspectedQueries).toHaveLength(0);
    expect(repository.referenceFilters).toHaveLength(0);
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('passes a verified decoded keyset to Repository and echoes the input cursor', async () => {
    const { service, repository, cursorCodec } = makeService();
    const keyset: SearchKeyset = {
      sort: 'rating',
      sortValue: '4.6666666666666667',
      entityType: 'business',
      id: RESULT_ID,
    };
    cursorCodec.decodeResult = keyset;
    const query = parseSearchQuery({ types: 'business', sort: 'rating', cursor: 'valid_cursor' });

    const response = await service.search(query);

    expect(repository.inspectedQueries).toHaveLength(0);
    expect(repository.searchQueries[0]?.keyset).toEqual(keyset);
    expect(response.meta.cursor).toBe('valid_cursor');
    expect(response.meta.nextCursor).toBeNull();
  });

  test('rejects a decoded cursor whose sort differs from the normalized request', async () => {
    const { service, repository, cursorCodec } = makeService();
    cursorCodec.decodeResult = {
      sort: 'newest',
      sortValue: '2026-07-14 09:30:00.123456+00',
      entityType: 'business',
      id: RESULT_ID,
    };

    await expect(
      service.search(
        parseSearchQuery({ types: 'business', sort: 'rating', cursor: 'valid_cursor' })
      )
    ).rejects.toMatchObject({ errorCode: 'VAL_001' });
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('fails closed when Repository claims hasMore without a last keyset', async () => {
    const { service, repository } = makeService();
    repository.page = {
      items: [makeProjection({ relevance: null })],
      hasMore: true,
      lastKeyset: null,
    };

    await expect(service.search(parseSearchQuery({ types: 'business' }))).rejects.toThrow(
      'must have a keyset'
    );
  });
});

describe('Search result summary mapping', () => {
  test('removes markup, executable blocks, comments and decodes entities', () => {
    expect(
      toPlainTextSummary(
        '<!-- hidden --><p>Xin&nbsp;chào &amp; hẹn gặp lại</p><style>.x{}</style><script>x()</script>'
      )
    ).toBe('Xin chào & hẹn gặp lại');
  });

  test('returns null for empty markup and truncates by Unicode code point', () => {
    expect(toPlainTextSummary('<p>  </p>')).toBeNull();
    const summary = toPlainTextSummary(`${'a'.repeat(499)}😀tail`);
    expect(Array.from(summary ?? '')).toHaveLength(500);
    expect(summary?.endsWith('😀')).toBe(true);
  });

  test('fails closed when a display rating exceeds the public precision contract', () => {
    expect(() => mapSearchProjection(makeProjection({ rating: '4.567' }))).toThrow(
      'rating precision is invalid'
    );
  });

  test('publishes only absolute HTTPS thumbnail candidates', () => {
    expect(
      mapSearchProjection(
        makeProjection({ thumbnailCandidate: 'https://cdn.example.test/cover.webp' })
      ).thumbnailUrl
    ).toBe('https://cdn.example.test/cover.webp');
    expect(
      mapSearchProjection(makeProjection({ thumbnailCandidate: 'http://example.test/cover.jpg' }))
        .thumbnailUrl
    ).toBeNull();
    expect(
      mapSearchProjection(makeProjection({ thumbnailCandidate: '/private/storage/key.webp' }))
        .thumbnailUrl
    ).toBeNull();
    expect(
      mapSearchProjection(
        makeProjection({ thumbnailCandidate: 'https://user:secret@example.test/cover.jpg' })
      ).thumbnailUrl
    ).toBeNull();
  });

  test('publishes exact decimal price strings and rejects invalid projections', () => {
    expect(
      mapSearchProjection(makeProjection({ priceMin: '100000.00', priceMax: '250000.50' }))
    ).toMatchObject({ priceMin: '100000.00', priceMax: '250000.50' });
    expect(() => mapSearchProjection(makeProjection({ priceMin: '1.234' }))).toThrow(
      SearchProjectionInvariantError
    );
  });
});
