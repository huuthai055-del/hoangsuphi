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

mock.module('@/modules/regions/repository/places.repository', () => {
  return {
    DrizzleTouristPlacesRepository: class {
      findById(id: string) {
        return (globalThis as any).mockPlacesFindById
          ? (globalThis as any).mockPlacesFindById(id)
          : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockPlacesFindBySlug
          ? (globalThis as any).mockPlacesFindBySlug(slug)
          : Promise.resolve(null);
      }
      findByRegionId(regionId: string, options?: any) {
        return (globalThis as any).mockPlacesFindByRegionId
          ? (globalThis as any).mockPlacesFindByRegionId(regionId, options)
          : Promise.resolve([]);
      }
      list(options: any) {
        return (globalThis as any).mockPlacesList
          ? (globalThis as any).mockPlacesList(options)
          : Promise.resolve([]);
      }
      findNearby(lng: number, lat: number, radiusMeters: number, limit?: number) {
        return (globalThis as any).mockPlacesFindNearby
          ? (globalThis as any).mockPlacesFindNearby(lng, lat, radiusMeters, limit)
          : Promise.resolve([]);
      }
      save(place: any) {
        return (globalThis as any).mockPlacesSave
          ? (globalThis as any).mockPlacesSave(place)
          : Promise.resolve();
      }
      update(place: any) {
        return (globalThis as any).mockPlacesUpdate
          ? (globalThis as any).mockPlacesUpdate(place)
          : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockPlacesSoftDelete
          ? (globalThis as any).mockPlacesSoftDelete(id)
          : Promise.resolve();
      }
    },
  };
});

mock.module('@/modules/businesses/repository/businesses.repository', () => {
  return {
    DrizzleBusinessesRepository: class {
      findById(id: string) {
        return (globalThis as any).mockBusinessesFindById
          ? (globalThis as any).mockBusinessesFindById(id)
          : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockBusinessesFindBySlug
          ? (globalThis as any).mockBusinessesFindBySlug(slug)
          : Promise.resolve(null);
      }
      findByRegionId(regionId: string, options?: any) {
        return (globalThis as any).mockBusinessesFindByRegionId
          ? (globalThis as any).mockBusinessesFindByRegionId(regionId, options)
          : Promise.resolve([]);
      }
      list(options: any) {
        return (globalThis as any).mockBusinessesList
          ? (globalThis as any).mockBusinessesList(options)
          : Promise.resolve([]);
      }
      findNearby(lng: number, lat: number, radiusMeters: number, limit?: number) {
        return (globalThis as any).mockBusinessesFindNearby
          ? (globalThis as any).mockBusinessesFindNearby(lng, lat, radiusMeters, limit)
          : Promise.resolve([]);
      }
      save(business: any) {
        return (globalThis as any).mockBusinessesSave
          ? (globalThis as any).mockBusinessesSave(business)
          : Promise.resolve();
      }
      update(business: any) {
        return (globalThis as any).mockBusinessesUpdate
          ? (globalThis as any).mockBusinessesUpdate(business)
          : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockBusinessesSoftDelete
          ? (globalThis as any).mockBusinessesSoftDelete(id)
          : Promise.resolve();
      }
      findBusinessTypeById(id: string) {
        return (globalThis as any).mockBusinessesFindBusinessTypeById
          ? (globalThis as any).mockBusinessesFindBusinessTypeById(id)
          : Promise.resolve(null);
      }
      findAmenitiesByIds(ids: string[]) {
        return Promise.resolve(ids);
      }
    },
  };
});

mock.module('@/modules/attractions/repository/attractions.repository', () => {
  return {
    DrizzleAttractionsRepository: class {
      findById() {
        return Promise.resolve(null);
      }
      findBySlug() {
        return Promise.resolve(null);
      }
      findByRegionId() {
        return Promise.resolve([]);
      }
      list() {
        return Promise.resolve([]);
      }
      findNearby() {
        return Promise.resolve([]);
      }
      save() {
        return Promise.resolve();
      }
      update() {
        return Promise.resolve();
      }
      softDelete() {
        return Promise.resolve();
      }
      findCategoryById() {
        return Promise.resolve(null);
      }
    },
  };
});

import { expect, test, describe, beforeEach } from 'bun:test';
import type { Hono } from 'hono';
import { Business } from '../domain/business.entity';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { Region } from '@/modules/regions/domain/region.aggregate';
import { LtreePath } from '@/modules/regions/domain/value-objects/ltree-path.vo';

describe('Businesses API Routing & Controller', () => {
  let app: Hono;

  const mockFindBusinessById = mock((_id: string) => Promise.resolve<Business | null>(null));
  const mockFindBusinessBySlug = mock((_slug: string) => Promise.resolve<Business | null>(null));
  const mockFindBusinessByRegionId = mock((_regionId: string, _options?: any) =>
    Promise.resolve<Business[]>([])
  );
  const mockListBusinesses = mock((_options: any) => Promise.resolve<Business[]>([]));
  const mockFindBusinessesNearby = mock(
    (_lng: number, _lat: number, _radius: number, _limit?: number) =>
      Promise.resolve<Business[]>([])
  );
  const mockSaveBusiness = mock((_business: Business) => Promise.resolve());
  const mockUpdateBusiness = mock((_business: Business) => Promise.resolve());
  const mockSoftDeleteBusiness = mock((_id: string) => Promise.resolve());
  const mockFindBusinessTypeById = mock((_id: string) =>
    Promise.resolve<{ id: string; isActive: boolean } | null>(null)
  );

  const mockFindRegionById = mock((_id: string) => Promise.resolve<Region | null>(null));

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindBusinessById.mockClear();
    mockFindBusinessBySlug.mockClear();
    mockFindBusinessByRegionId.mockClear();
    mockListBusinesses.mockClear();
    mockFindBusinessesNearby.mockClear();
    mockSaveBusiness.mockClear();
    mockUpdateBusiness.mockClear();
    mockSoftDeleteBusiness.mockClear();
    mockFindBusinessTypeById.mockClear();
    mockFindRegionById.mockClear();

    (globalThis as any).mockBusinessesFindById = mockFindBusinessById;
    (globalThis as any).mockBusinessesFindBySlug = mockFindBusinessBySlug;
    (globalThis as any).mockBusinessesFindByRegionId = mockFindBusinessByRegionId;
    (globalThis as any).mockBusinessesList = mockListBusinesses;
    (globalThis as any).mockBusinessesFindNearby = mockFindBusinessesNearby;
    (globalThis as any).mockBusinessesSave = mockSaveBusiness;
    (globalThis as any).mockBusinessesUpdate = mockUpdateBusiness;
    (globalThis as any).mockBusinessesSoftDelete = mockSoftDeleteBusiness;
    (globalThis as any).mockBusinessesFindBusinessTypeById = mockFindBusinessTypeById;

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

  const mockBusiness = new Business(
    '3a552ef3-40e1-7ca7-8000-000000000002',
    '3a552ef3-40e1-7ca7-8000-000000000001',
    '3a552ef3-40e1-7ca7-8000-000000000003',
    'Homestay',
    'homestay',
    new GPSLocation(104.5, 22.5),
    'Nice homestay',
    'https://example.com/cover.jpg',
    'active',
    [],
    new Date(),
    new Date(),
    null
  );

  test('GET /api/v1/businesses - should return empty list with 200', async () => {
    mockListBusinesses.mockImplementation(() => Promise.resolve([]));

    const res = await app.request('/api/v1/businesses');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  test('GET /api/v1/businesses/:id - should return 404 if not found', async () => {
    mockFindBusinessById.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/businesses/3a552ef3-40e1-7ca7-8000-000000000002');
    expect(res.status).toBe(404);
  });

  test('GET /api/v1/businesses/:id - should return business detail with 200', async () => {
    mockFindBusinessById.mockImplementation(() => Promise.resolve(mockBusiness));

    const res = await app.request('/api/v1/businesses/3a552ef3-40e1-7ca7-8000-000000000002');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(mockBusiness.id);
    expect(body.name).toBe(mockBusiness.name);
  });

  test('GET /api/v1/businesses/slug/:slug - should return business detail with 200', async () => {
    mockFindBusinessBySlug.mockImplementation(() => Promise.resolve(mockBusiness));

    const res = await app.request('/api/v1/businesses/slug/homestay');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe('homestay');
  });

  test('GET /api/v1/businesses/nearby - should return nearby businesses', async () => {
    mockFindBusinessesNearby.mockImplementation(() => Promise.resolve([mockBusiness]));

    const res = await app.request('/api/v1/businesses/nearby?lng=104.5&lat=22.5&radius=5000');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  test('POST /api/v1/businesses - should create business and return 201', async () => {
    mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
    mockFindBusinessTypeById.mockImplementation(() =>
      Promise.resolve({ id: 'type-id', isActive: true })
    );
    mockFindBusinessBySlug.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/businesses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        businessTypeId: '3a552ef3-40e1-7ca7-8000-000000000003',
        name: 'New Homestay',
        location: { lng: 104.5, lat: 22.5 },
        description: 'New view',
        coverUrl: 'https://example.com/cover.jpg',
        amenityIds: [],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('New Homestay');
    expect(mockSaveBusiness).toHaveBeenCalled();
  });

  test('PATCH /api/v1/businesses/:id - should update business and return 200', async () => {
    mockFindBusinessById.mockImplementation(() => Promise.resolve(mockBusiness));

    const res = await app.request('/api/v1/businesses/3a552ef3-40e1-7ca7-8000-000000000002', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        name: 'Updated Name',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Updated Name');
    expect(mockUpdateBusiness).toHaveBeenCalled();
  });

  test('DELETE /api/v1/businesses/:id - should soft delete business and return 204', async () => {
    mockFindBusinessById.mockImplementation(() => Promise.resolve(mockBusiness));

    const res = await app.request('/api/v1/businesses/3a552ef3-40e1-7ca7-8000-000000000002', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    });

    expect(res.status).toBe(204);
    expect(mockSoftDeleteBusiness).toHaveBeenCalled();
  });
});
