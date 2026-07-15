import { beforeEach, describe, expect, test } from 'bun:test';
import { container } from '@/common/di/container';
import type { Hono } from 'hono';
import { createApp } from '../../../app';
import { SearchResponseSchema } from '../dto/search.dto';
import type {
  SearchQueryInspection,
  SearchReadProjection,
  SearchReferenceFilter,
  SearchReferenceValidation,
  SearchRepositoryPage,
  SearchRepositoryQuery,
} from '../repository/search-read-model';
import type { ISearchRepository } from '../repository/search-repository.interface';
import { SearchRepositoryOperationError } from '../repository/search.repository';
import { SearchCursorCodec } from '../service/search-cursor';
import { SearchService } from '../service/search.service';
import { SearchController } from './search.controller';

const ARTICLE_ID = '01908d1a-7000-7c2c-80a5-f09dfd7a8da0';
const CATEGORY_ID = '01908d1a-3000-7c2c-80a5-f09dfd7a8d60';
const REGION_ID = '01908d1a-2000-7c2c-80a5-f09dfd7a8d50';

const projection: SearchReadProjection = {
  entityType: 'article',
  entityOrder: 1,
  id: ARTICLE_ID,
  name: 'Mùa vàng Hoàng Su Phì',
  slug: 'mua-vang-hoang-su-phi',
  summarySource: '<p>Ruộng bậc thang &amp; mùa lúa chín.</p>',
  thumbnailCandidate: null,
  region: null,
  category: {
    id: CATEGORY_ID,
    code: 'travel-guide',
    name: 'Cẩm nang',
  },
  rating: '4.75',
  priceMin: null,
  priceMax: null,
  relevance: 0.42,
  sortValue: 0.42,
};

const validReferences: SearchReferenceValidation = {
  region: 'not_requested',
  articleCategoryExists: null,
  attractionCategoryExists: null,
  businessType: 'not_requested',
  requestedAmenityIds: [],
  foundAmenityIds: [],
  missingAmenityIds: [],
  allAmenitiesExist: true,
};

class SearchRepositoryStub implements ISearchRepository {
  readonly inspectedQueries: string[] = [];
  readonly referenceFilters: SearchReferenceFilter[] = [];
  readonly searchQueries: SearchRepositoryQuery[] = [];

  inspection: SearchQueryInspection = { hasLexemes: true, lexemeCount: 3 };
  references: SearchReferenceValidation = validReferences;
  page: SearchRepositoryPage = {
    items: [projection],
    hasMore: true,
    lastKeyset: {
      sort: 'relevance',
      sortValue: 0.42,
      entityType: 'article',
      id: ARTICLE_ID,
    },
  };
  searchError: Error | null = null;

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
    if (this.searchError) throw this.searchError;
    return this.page;
  }
}

function installSearchController(repository: SearchRepositoryStub): Hono {
  const cursorCodec = new SearchCursorCodec({
    activeKeyId: 'test-v1',
    keys: { 'test-v1': 'search-route-test-secret-with-more-than-thirty-two-bytes' },
  });
  const controller = new SearchController(new SearchService(repository, cursorCodec));
  container.reset();
  container.register('SearchController', controller);
  return createApp();
}

describe('Search HTTP boundary', () => {
  let repository: SearchRepositoryStub;
  let app: Hono;

  beforeEach(() => {
    repository = new SearchRepositoryStub();
    app = installSearchController(repository);
  });

  test('exposes public GET /api/v1/search with normalized defaults and success envelope', async () => {
    const response = await app.request('/api/v1/search?q=%20Hoa%CC%80ng%20%20Su%20Phi%CC%80%20');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(SearchResponseSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      data: [
        {
          entityType: 'article',
          summary: 'Ruộng bậc thang & mùa lúa chín.',
          thumbnailUrl: null,
          priceMin: null,
          priceMax: null,
        },
      ],
      meta: { cursor: null, hasMore: true, totalReturned: 1 },
      error: null,
    });
    expect(repository.inspectedQueries).toEqual(['Hoàng Su Phì']);
    expect(repository.searchQueries[0]).toMatchObject({
      q: 'Hoàng Su Phì',
      types: ['article', 'attraction', 'business', 'place'],
      sort: 'relevance',
      limit: 20,
      keyset: null,
    });
  });

  test('accepts an issued cursor and passes only its verified keyset to Repository', async () => {
    const firstResponse = await app.request('/api/v1/search?q=homestay');
    const firstBody = await firstResponse.json();
    const cursor = firstBody.meta.nextCursor as string;

    repository.page = { items: [], hasMore: false, lastKeyset: null };
    const nextResponse = await app.request(
      `/api/v1/search?q=homestay&cursor=${encodeURIComponent(cursor)}`
    );
    const nextBody = await nextResponse.json();

    expect(nextResponse.status).toBe(200);
    expect(nextBody.meta.cursor).toBe(cursor);
    expect(repository.searchQueries[1]?.keyset).toEqual({
      sort: 'relevance',
      sortValue: 0.42,
      entityType: 'article',
      id: ARTICLE_ID,
    });
  });

  test('rejects duplicate query keys before Controller and Repository execution', async () => {
    const response = await app.request('/api/v1/search?q=rice&q=terrace');
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(body).toMatchObject({
      code: 'VAL_001',
      invalidParams: [{ name: 'q', reason: expect.any(String) }],
    });
    expect(repository.inspectedQueries).toHaveLength(0);
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('rejects unknown, empty and invalid price inputs at the HTTP boundary', async () => {
    const cases = [
      ['/api/v1/search?q=rice&unexpected=true', 'unexpected'],
      ['/api/v1/search', 'query'],
      ['/api/v1/search?types=business&priceMin=-1', 'priceMin'],
      ['/api/v1/search?types=business&priceMin=200&priceMax=100', 'priceMax'],
      ['/api/v1/search?types=article&sort=price_asc', 'sort'],
    ] as const;

    for (const [url, field] of cases) {
      const response = await app.request(url);
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe('VAL_001');
      expect(body.invalidParams).toContainEqual({ name: field, reason: expect.any(String) });
    }
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('accepts price filters and price sort at the HTTP boundary', async () => {
    repository.page = { items: [], hasMore: false, lastKeyset: null };

    const response = await app.request(
      '/api/v1/search?types=business&priceMin=100000.00&priceMax=250000.50&sort=price_desc'
    );

    expect(response.status).toBe(200);
    expect(repository.searchQueries[0]).toMatchObject({
      types: ['business'],
      priceMin: '100000',
      priceMax: '250000.5',
      sort: 'price_desc',
    });
  });

  test('maps punctuation-only q and malformed cursor to VAL_001 without unified search', async () => {
    repository.inspection = { hasLexemes: false, lexemeCount: 0 };
    const punctuationResponse = await app.request('/api/v1/search?q=!!!');
    const punctuationBody = await punctuationResponse.json();

    expect(punctuationResponse.status).toBe(400);
    expect(punctuationBody.invalidParams).toContainEqual({
      name: 'q',
      reason: expect.any(String),
    });
    expect(repository.inspectedQueries).toEqual(['!!!']);
    expect(repository.searchQueries).toHaveLength(0);

    const cursorResponse = await app.request('/api/v1/search?q=rice&cursor=abc');
    const cursorBody = await cursorResponse.json();
    expect(cursorResponse.status).toBe(400);
    expect(cursorBody.invalidParams).toContainEqual({
      name: 'cursor',
      reason: expect.any(String),
    });
    expect(repository.inspectedQueries).toEqual(['!!!']);
  });

  test('maps unknown or deleted reference filters to field-level validation errors', async () => {
    repository.references = {
      ...validReferences,
      region: 'deleted',
    };

    const response = await app.request(`/api/v1/search?regionId=${REGION_ID}`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VAL_001',
      invalidParams: [
        {
          name: 'regionId',
          reason: 'Region is not publicly available',
        },
      ],
    });
    expect(repository.searchQueries).toHaveLength(0);
  });

  test('delegates repository failures to the global error boundary without leaking the cause', async () => {
    repository.searchError = new SearchRepositoryOperationError(
      'unified search',
      new Error('SELECT secret_column FROM private_table')
    );

    const response = await app.request('/api/v1/search?q=rice');
    const bodyText = await response.text();

    expect(response.status).toBe(500);
    expect(bodyText).toContain('SYS_001');
    expect(bodyText).not.toContain('secret_column');
    expect(bodyText).not.toContain('private_table');
  });

  test('does not expose write methods and default DI can resolve the complete Search graph', async () => {
    const response = await app.request('/api/v1/search?q=rice', { method: 'POST' });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/problem+json');

    container.reset();
    expect(container.resolve<SearchController>('SearchController')).toBeInstanceOf(
      SearchController
    );
  });
});
