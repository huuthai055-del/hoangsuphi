import { beforeEach, describe, expect, test } from 'bun:test';
import { container } from '@/common/di/container';
import type { Hono } from 'hono';
import { createApp } from '../../../app';
import { NearbyCursorCodec } from '../application/nearby-cursor.codec';
import { NearbySearchService } from '../application/nearby-search.service';
import { NearbyController } from '../http/nearby.controller';
import type { NearbyResultProjection } from '../repository/nearby-projection';
import type {
  INearbyRepository,
  NearbyReferenceFilter,
  NearbyReferenceValidation,
  NearbyRepositoryPage,
  NearbySearchCriteria,
} from '../repository/nearby-repository.interface';

const TOURIST_PLACE_ID = '01908d1a-7000-7c2c-80a5-f09dfd7a8da0';
const REGION_ID = '01908d1a-2000-7c2c-80a5-f09dfd7a8d50';
const CATEGORY_ID = '01908d1a-3000-7c2c-80a5-f09dfd7a8d60';

const projection: NearbyResultProjection = {
  entityType: 'TOURIST_PLACE',
  entityTypeRank: 1,
  entityId: TOURIST_PLACE_ID,
  name: 'Ruộng bậc thang Bản Phùng',
  slug: 'ruong-bac-thang-ban-phung',
  latitude: 22.74321,
  longitude: 104.68123,
  rawDistanceMeters: '426.354321',
  displayDistanceMeters: 426.35,
  regionId: REGION_ID,
  regionName: 'Bản Phùng',
  regionSlug: 'ban-phung',
  thumbnailUrl: 'https://hoangsuphi.vn/thumb.jpg',
  averageRating: '4.75',
  reviewCount: 28,
};

const validReferences: NearbyReferenceValidation = {
  region: 'valid',
  category: 'valid',
  businessType: 'valid',
};

class NearbyRepositoryStub implements INearbyRepository {
  readonly searchCriteria: NearbySearchCriteria[] = [];
  readonly referenceFilters: NearbyReferenceFilter[] = [];

  references: NearbyReferenceValidation = validReferences;
  page: NearbyRepositoryPage = {
    items: [projection],
  };
  searchError: Error | null = null;

  async validateReferences(filters: NearbyReferenceFilter): Promise<NearbyReferenceValidation> {
    this.referenceFilters.push(filters);
    return this.references;
  }

  async searchNearby(criteria: NearbySearchCriteria): Promise<NearbyRepositoryPage> {
    this.searchCriteria.push(criteria);
    if (this.searchError) throw this.searchError;
    return this.page;
  }
}

function installNearbyController(repository: NearbyRepositoryStub): Hono {
  const cursorCodec = new NearbyCursorCodec({
    activeKeyId: 'test-v1',
    keys: { 'test-v1': 'nearby-route-test-secret-with-more-than-thirty-two-bytes' },
  });
  const controller = new NearbyController(new NearbySearchService(repository, cursorCodec));
  container.reset();
  container.register('NearbyController', controller);
  return createApp();
}

function getParamError(invalidParams: any, name: string): string | undefined {
  if (!Array.isArray(invalidParams)) return undefined;
  const param = invalidParams.find((p: any) => p.name === name);
  return param ? param.reason : undefined;
}

describe('Nearby Search HTTP / API Integration', () => {
  let repository: NearbyRepositoryStub;
  let app: Hono;

  beforeEach(() => {
    repository = new NearbyRepositoryStub();
    app = installNearbyController(repository);
  });

  test('GET /api/v1/nearby responds 200 with success envelope & normalized defaults', async () => {
    const response = await app.request('/api/v1/nearby?lat=22.741234&lng=104.679876');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      data: [
        {
          entityType: 'TOURIST_PLACE',
          id: TOURIST_PLACE_ID,
          name: 'Ruộng bậc thang Bản Phùng',
          slug: 'ruong-bac-thang-ban-phung',
          latitude: 22.74321,
          longitude: 104.68123,
          distanceMeters: 426.35,
          region: {
            id: REGION_ID,
            name: 'Bản Phùng',
            slug: 'ban-phung',
          },
          thumbnailUrl: 'https://hoangsuphi.vn/thumb.jpg',
          rating: {
            average: 4.75,
            count: 28,
          },
        },
      ],
      meta: {
        cursor: null,
        nextCursor: null,
        hasMore: false,
        totalReturned: 1,
        origin: {
          latitude: 22.741234,
          longitude: 104.679876,
        },
        radiusMeters: 5000,
      },
      error: null,
    });

    expect(repository.searchCriteria[0]).toMatchObject({
      latitude: '22.741234',
      longitude: '104.679876',
      radiusMeters: 5000,
      entityTypes: ['TOURIST_PLACE', 'ATTRACTION', 'BUSINESS', 'UTILITY'],
      limit: 20,
    });
  });

  test('GET /api/v1/nearby respects all valid filters and paging parameters', async () => {
    repository.page = {
      items: [
        projection,
        {
          ...projection,
          entityId: '01908d1a-7000-7c2c-80a5-f09dfd7a8db0',
          entityTypeRank: 2,
          rawDistanceMeters: '450.00',
        },
      ],
    };

    const url = `/api/v1/nearby?lat=22.741234&lng=104.679876&radius=10000&types=attraction&regionId=${REGION_ID}&categoryId=${CATEGORY_ID}&minRating=4.5&limit=1`;
    const response = await app.request(url);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.meta.hasMore).toBe(true);
    expect(body.meta.nextCursor).not.toBeNull();
    expect(body.data).toHaveLength(1);
    expect(body.error).toBeNull();

    expect(repository.searchCriteria[0]).toMatchObject({
      latitude: '22.741234',
      longitude: '104.679876',
      radiusMeters: 10000,
      entityTypes: ['ATTRACTION'],
      regionId: REGION_ID,
      categoryId: CATEGORY_ID,
      minRating: '4.5',
      limit: 1,
    });
  });

  test('GET /api/v1/nearby supports keyset pagination using signed cursor', async () => {
    repository.page = {
      items: [
        projection,
        {
          ...projection,
          entityId: '01908d1a-7000-7c2c-80a5-f09dfd7a8db0',
          entityTypeRank: 2,
          rawDistanceMeters: '450.00',
        },
      ],
    };

    const firstResponse = await app.request('/api/v1/nearby?lat=22.741234&lng=104.679876&limit=1');
    const firstBody = await firstResponse.json();
    const cursor = firstBody.meta.nextCursor as string;

    expect(cursor).toBeString();

    repository.page = { items: [] };
    const nextResponse = await app.request(
      `/api/v1/nearby?lat=22.741234&lng=104.679876&limit=1&cursor=${encodeURIComponent(cursor)}`
    );
    expect(nextResponse.status).toBe(200);

    const nextBody = await nextResponse.json();
    expect(nextBody.data).toHaveLength(0);
    expect(nextBody.meta.nextCursor).toBeNull();
    expect(nextBody.meta.hasMore).toBe(false);
    expect(nextBody.meta.cursor).toBe(cursor);
    expect(nextBody.error).toBeNull();

    expect(repository.searchCriteria[1]?.after).toEqual({
      rawDistanceMeters: '426.354321',
      entityType: 'TOURIST_PLACE',
      entityTypeRank: 1,
      entityId: TOURIST_PLACE_ID,
    });
  });

  test('GET /api/v1/nearby rejects query with duplicate parameters', async () => {
    const response = await app.request('/api/v1/nearby?lat=22.741234&lat=23.000000&lng=104.679876');
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'lat')).toBeString();
  });

  test('GET /api/v1/nearby rejects query with unknown parameters', async () => {
    const response = await app.request(
      '/api/v1/nearby?lat=22.741234&lng=104.679876&unexpected=true'
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'unexpected')).toBe('Unknown query parameter');
  });

  test('GET /api/v1/nearby coordinates validations', async () => {
    const cases = [
      ['/api/v1/nearby?lng=104.6', 'lat'],
      ['/api/v1/nearby?lat=22.6', 'lng'],
      ['/api/v1/nearby?lat=90.1&lng=104.6', 'lat'],
      ['/api/v1/nearby?lat=22.6&lng=180.1', 'lng'],
      ['/api/v1/nearby?lat=22.7000001&lng=104.6', 'lat'],
      ['/api/v1/nearby?lat=22.7e1&lng=104.6', 'lat'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&radius=99', 'radius'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&radius=50001', 'radius'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&limit=0', 'limit'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&limit=51', 'limit'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&minRating=5.1', 'minRating'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&minRating=-0.1', 'minRating'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&types=place,place', 'types'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&types=invalid', 'types'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&types=place,', 'types'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&types=,place', 'types'],
      ['/api/v1/nearby?lat=22.7&lng=104.6&types=place,,business', 'types'],
    ] as const;

    for (const [url, field] of cases) {
      const response = await app.request(url);
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe('VAL_001');
      expect(getParamError(body.invalidParams, field)).toBeString();
    }
  });

  test('GET /api/v1/nearby enforces category cross-field validation rules', async () => {
    const cases = [
      `/api/v1/nearby?lat=22.7&lng=104.6&categoryId=${CATEGORY_ID}`, // missing types
      `/api/v1/nearby?lat=22.7&lng=104.6&categoryId=${CATEGORY_ID}&types=place,business`, // multiple types
      `/api/v1/nearby?lat=22.7&lng=104.6&categoryId=${CATEGORY_ID}&types=place`, // invalid type (TOURIST_PLACE)
    ];

    for (const url of cases) {
      const response = await app.request(url);
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe('VAL_001');
      expect(getParamError(body.invalidParams, 'types')).toBeString();
    }
  });

  test('GET /api/v1/nearby database reference validation failures', async () => {
    // 1. Missing regionId
    repository.references = { ...validReferences, region: 'missing' };
    let response = await app.request(`/api/v1/nearby?lat=22.7&lng=104.6&regionId=${REGION_ID}`);
    let body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'regionId')).toBe('Region does not exist');

    // 2. Deleted regionId
    repository.references = { ...validReferences, region: 'deleted' };
    response = await app.request(`/api/v1/nearby?lat=22.7&lng=104.6&regionId=${REGION_ID}`);
    body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'regionId')).toBe('Region is not publicly available');

    // 3. Missing categoryId (attraction)
    repository.references = { ...validReferences, category: 'missing' };
    response = await app.request(
      `/api/v1/nearby?lat=22.7&lng=104.6&categoryId=${CATEGORY_ID}&types=attraction`
    );
    body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'categoryId')).toBe('Category does not exist');

    // 4. Missing business categoryId (business type)
    repository.references = { ...validReferences, businessType: 'missing' };
    response = await app.request(
      `/api/v1/nearby?lat=22.7&lng=104.6&categoryId=${CATEGORY_ID}&types=business`
    );
    body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'categoryId')).toBe('Business Type does not exist');
  });

  test('GET /api/v1/nearby responses does not leak internal projection parameters', async () => {
    const response = await app.request('/api/v1/nearby?lat=22.741234&lng=104.679876');
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    const item = body.data[0];

    expect(item).not.toHaveProperty('rawDistanceMeters');
    expect(item).not.toHaveProperty('entityTypeRank');
  });

  test('GET /api/v1/nearby handles server-side error mapping cleanly', async () => {
    repository.searchError = new Error('Database connection failed');
    const response = await app.request('/api/v1/nearby?lat=22.741234&lng=104.679876');

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('DB_001');
    expect(body.detail).toBe('Nearby search service failed to execute');
    expect(body.detail).not.toContain('Database connection failed');
    expect(body).not.toHaveProperty('stack');
  });

  test('GET /api/v1/nearby rejects invalid/tampered/mismatched cursor with 400 VAL_001', async () => {
    // 1. Malformed base64 cursor
    let response = await app.request(
      '/api/v1/nearby?lat=22.741234&lng=104.679876&cursor=not-a-valid-base64'
    );
    expect(response.status).toBe(400);
    let body = await response.json();
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'cursor')).toBeString();

    // 2. Tampered cursor signature
    const malformedPayload = Buffer.from(
      JSON.stringify({
        body: {
          v: 1,
          fp: 'wrong-fp',
          key: {
            distance: '426.35',
            entityType: 'TOURIST_PLACE',
            id: TOURIST_PLACE_ID,
          },
        },
        mac: 'invalid-mac-signature',
      })
    ).toString('base64url');
    response = await app.request(
      `/api/v1/nearby?lat=22.741234&lng=104.679876&cursor=${malformedPayload}`
    );
    expect(response.status).toBe(400);
    body = await response.json();
    expect(body.code).toBe('VAL_001');
    expect(getParamError(body.invalidParams, 'cursor')).toBeString();
  });

  test('redacts lat, lng, and cursor parameters from request logs', async () => {
    const { logger } = await import('@/lib/logger');
    const { spyOn } = await import('bun:test');
    const infoSpy = spyOn(logger, 'info');

    try {
      await app.request('/api/v1/nearby?lat=22.741234&lng=104.679876&cursor=some-signed-cursor');

      expect(infoSpy.mock.calls.length).toBeGreaterThan(0);
      for (const call of infoSpy.mock.calls) {
        const payloadString = JSON.stringify(call);
        expect(payloadString).not.toContain('22.741234');
        expect(payloadString).not.toContain('104.679876');
        expect(payloadString).not.toContain('some-signed-cursor');
      }
    } finally {
      infoSpy.mockRestore();
    }
  });
});
