import { mock } from 'bun:test';

// Mock database client
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    dbHealthCheck: async () => Promise.resolve({ status: 'healthy', durationMs: 5 }),
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

mock.module('@/modules/regions/repository/regions.repository', () => {
  return {
    DrizzleRegionsRepository: class {
      findById(id: string) {
        return (globalThis as any).mockRegionsFindById
          ? (globalThis as any).mockRegionsFindById(id)
          : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockRegionsFindBySlug
          ? (globalThis as any).mockRegionsFindBySlug(slug)
          : Promise.resolve(null);
      }
      list(options: any) {
        return (globalThis as any).mockRegionsList
          ? (globalThis as any).mockRegionsList(options)
          : Promise.resolve([]);
      }
      count(options: any) {
        return (globalThis as any).mockRegionsCount
          ? (globalThis as any).mockRegionsCount(options)
          : Promise.resolve(0);
      }
      save(region: any) {
        return (globalThis as any).mockRegionsSave
          ? (globalThis as any).mockRegionsSave(region)
          : Promise.resolve();
      }
      update(region: any) {
        return (globalThis as any).mockRegionsUpdate
          ? (globalThis as any).mockRegionsUpdate(region)
          : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockRegionsSoftDelete
          ? (globalThis as any).mockRegionsSoftDelete(id)
          : Promise.resolve();
      }
      findChildren() {
        return Promise.resolve([]);
      }
      findSubtree() {
        return Promise.resolve([]);
      }
    },
  };
});

mock.module('@/modules/attractions/repository/attractions.repository', () => {
  return {
    DrizzleAttractionsRepository: class {
      findById(id: string) {
        return (globalThis as any).mockAttractionsFindById
          ? (globalThis as any).mockAttractionsFindById(id)
          : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockAttractionsFindBySlug
          ? (globalThis as any).mockAttractionsFindBySlug(slug)
          : Promise.resolve(null);
      }
      findByRegionId(regionId: string, options?: any) {
        return (globalThis as any).mockAttractionsFindByRegionId
          ? (globalThis as any).mockAttractionsFindByRegionId(regionId, options)
          : Promise.resolve([]);
      }
      list(options: any) {
        return (globalThis as any).mockAttractionsList
          ? (globalThis as any).mockAttractionsList(options)
          : Promise.resolve([]);
      }
      count(options: any) {
        return (globalThis as any).mockAttractionsCount
          ? (globalThis as any).mockAttractionsCount(options)
          : Promise.resolve(0);
      }
      findNearby(lng: number, lat: number, radiusMeters: number, limit?: number) {
        return (globalThis as any).mockAttractionsFindNearby
          ? (globalThis as any).mockAttractionsFindNearby(lng, lat, radiusMeters, limit)
          : Promise.resolve([]);
      }
      save(attraction: any) {
        return (globalThis as any).mockAttractionsSave
          ? (globalThis as any).mockAttractionsSave(attraction)
          : Promise.resolve();
      }
      update(attraction: any) {
        return (globalThis as any).mockAttractionsUpdate
          ? (globalThis as any).mockAttractionsUpdate(attraction)
          : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockAttractionsSoftDelete
          ? (globalThis as any).mockAttractionsSoftDelete(id)
          : Promise.resolve();
      }
      findCategoryById(id: string) {
        return (globalThis as any).mockAttractionsFindCategoryById
          ? (globalThis as any).mockAttractionsFindCategoryById(id)
          : Promise.resolve(null);
      }
    },
  };
});

import { beforeEach, describe, expect, test } from 'bun:test';
import { Region } from '@/modules/regions/domain/region.aggregate';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { LtreePath } from '@/modules/regions/domain/value-objects/ltree-path.vo';
import type { Hono } from 'hono';
import { Attraction } from '../domain/attraction.entity';

describe('Attractions API Routing & Controller', () => {
  let app: Hono;

  const mockFindAttractionById = mock((_id: string) => Promise.resolve<Attraction | null>(null));
  const mockFindAttractionBySlug = mock((_slug: string, _includeDeleted?: boolean) =>
    Promise.resolve<Attraction | null>(null)
  );
  const mockFindAttractionByRegionId = mock((_regionId: string, _options?: any) =>
    Promise.resolve<Attraction[]>([])
  );
  const mockListAttractions = mock((_options: any) => Promise.resolve<Attraction[]>([]));
  const mockFindAttractionsNearby = mock(
    (_lng: number, _lat: number, _radius: number, _limit?: number) =>
      Promise.resolve<Attraction[]>([])
  );
  const mockSaveAttraction = mock((_attraction: Attraction) => Promise.resolve());
  const mockUpdateAttraction = mock((_attraction: Attraction) => Promise.resolve());
  const mockSoftDeleteAttraction = mock((_id: string) => Promise.resolve());
  const mockFindCategoryById = mock((_id: string) =>
    Promise.resolve<{ id: string; isUtility: boolean } | null>(null)
  );

  const mockFindRegionById = mock((_id: string) => Promise.resolve<Region | null>(null));

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindAttractionById.mockClear();
    mockFindAttractionBySlug.mockClear();
    mockFindAttractionByRegionId.mockClear();
    mockListAttractions.mockClear();
    mockFindAttractionsNearby.mockClear();
    mockSaveAttraction.mockClear();
    mockUpdateAttraction.mockClear();
    mockSoftDeleteAttraction.mockClear();
    mockFindCategoryById.mockClear();
    mockFindRegionById.mockClear();

    (globalThis as any).mockAttractionsFindById = mockFindAttractionById;
    (globalThis as any).mockAttractionsFindBySlug = mockFindAttractionBySlug;
    (globalThis as any).mockAttractionsFindByRegionId = mockFindAttractionByRegionId;
    (globalThis as any).mockAttractionsList = mockListAttractions;
    (globalThis as any).mockAttractionsFindNearby = mockFindAttractionsNearby;
    (globalThis as any).mockAttractionsSave = mockSaveAttraction;
    (globalThis as any).mockAttractionsUpdate = mockUpdateAttraction;
    (globalThis as any).mockAttractionsSoftDelete = mockSoftDeleteAttraction;
    (globalThis as any).mockAttractionsFindCategoryById = mockFindCategoryById;

    (globalThis as any).mockRegionsFindById = mockFindRegionById;
  });

  const validRegion = new Region(
    '3a552ef3-40e1-7ca7-8000-000000000001',
    null,
    'Region',
    'region',
    1,
    new LtreePath('region'),
    null,
    null,
    null,
    null,
    'active',
    new Date(),
    new Date(),
    null
  );

  const mockAttraction = Attraction.rehydrate({
    id: '3a552ef3-40e1-7ca7-8000-000000000002',
    regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
    categoryId: '3a552ef3-40e1-7ca7-8000-000000000003',
    name: 'Chiêu Lầu Thi',
    slug: 'chieu-lau-thi',
    location: new GPSLocation(104.5, 22.5),
    description: 'Mountain peak',
    coverUrl: 'https://example.com/chieu-lau-thi.jpg',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  test('GET /api/v1/attractions - should return empty list with 200', async () => {
    mockListAttractions.mockImplementation(() => Promise.resolve([]));

    const res = await app.request('/api/v1/attractions');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  test('GET /api/v1/attractions/:id - should return 404 if not found', async () => {
    mockFindAttractionById.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/attractions/3a552ef3-40e1-7ca7-8000-000000000002');
    expect(res.status).toBe(404);
  });

  test('GET /api/v1/attractions/:id - should return attraction details with 200', async () => {
    mockFindAttractionById.mockImplementation(() => Promise.resolve(mockAttraction));

    const res = await app.request('/api/v1/attractions/3a552ef3-40e1-7ca7-8000-000000000002');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(mockAttraction.id);
    expect(body.name).toBe(mockAttraction.name);
  });

  test('GET /api/v1/attractions/slug/:slug - should return attraction detail with 200', async () => {
    mockFindAttractionBySlug.mockImplementation(() => Promise.resolve(mockAttraction));

    const res = await app.request('/api/v1/attractions/slug/chieu-lau-thi');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe('chieu-lau-thi');
  });

  test('GET /api/v1/attractions/nearby - should return nearby attractions', async () => {
    mockFindAttractionsNearby.mockImplementation(() => Promise.resolve([mockAttraction]));

    const res = await app.request('/api/v1/attractions/nearby?lng=104.5&lat=22.5&radius=5000');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  test('POST /api/v1/attractions - should create attraction and return 201', async () => {
    mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
    mockFindCategoryById.mockImplementation(() =>
      Promise.resolve({ id: 'category-id', isUtility: false })
    );
    mockFindAttractionBySlug.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/attractions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        categoryId: '3a552ef3-40e1-7ca7-8000-000000000003',
        name: 'New Peak',
        location: { lng: 104.5, lat: 22.5 },
        description: 'Spectacular view',
        coverUrl: 'https://example.com/cover.jpg',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('New Peak');
    expect(mockSaveAttraction).toHaveBeenCalled();
  });

  test('PATCH /api/v1/attractions/:id - should update attraction and return 200', async () => {
    mockFindAttractionById.mockImplementation(() => Promise.resolve(mockAttraction));

    const res = await app.request('/api/v1/attractions/3a552ef3-40e1-7ca7-8000-000000000002', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        name: 'Updated Peak Name',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Peak Name');
    expect(mockUpdateAttraction).toHaveBeenCalled();
  });

  test('DELETE /api/v1/attractions/:id - should soft delete attraction and return 204', async () => {
    mockFindAttractionById.mockImplementation(() => Promise.resolve(mockAttraction));

    const res = await app.request('/api/v1/attractions/3a552ef3-40e1-7ca7-8000-000000000002', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });

    expect(res.status).toBe(204);
    expect(mockSoftDeleteAttraction).toHaveBeenCalled();
  });

  test('GET /api/v1/attractions/region/:regionId - should return list of attractions in region with 200', async () => {
    mockFindAttractionByRegionId.mockImplementation(() => Promise.resolve([mockAttraction]));

    const res = await app.request(
      '/api/v1/attractions/region/3a552ef3-40e1-7ca7-8000-000000000001?page=1&limit=10'
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(mockAttraction.id);
  });

  test('PATCH /api/v1/attractions/:id/activate - should activate attraction and return 200', async () => {
    const inactiveAttraction = Attraction.rehydrate({
      id: '3a552ef3-40e1-7ca7-8000-000000000002',
      regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
      categoryId: '3a552ef3-40e1-7ca7-8000-000000000003',
      name: 'Chiêu Lầu Thi',
      slug: 'chieu-lau-thi',
      location: new GPSLocation(104.5, 22.5),
      description: 'Mountain peak',
      coverUrl: 'https://example.com/chieu-lau-thi.jpg',
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockFindAttractionById.mockImplementation(() => Promise.resolve(inactiveAttraction));

    const res = await app.request(
      '/api/v1/attractions/3a552ef3-40e1-7ca7-8000-000000000002/activate',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('active');
    expect(mockUpdateAttraction).toHaveBeenCalled();
  });

  test('PATCH /api/v1/attractions/:id/deactivate - should deactivate attraction and return 200', async () => {
    mockFindAttractionById.mockImplementation(() => Promise.resolve(mockAttraction));

    const res = await app.request(
      '/api/v1/attractions/3a552ef3-40e1-7ca7-8000-000000000002/deactivate',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('inactive');
    expect(mockUpdateAttraction).toHaveBeenCalled();
  });
});
