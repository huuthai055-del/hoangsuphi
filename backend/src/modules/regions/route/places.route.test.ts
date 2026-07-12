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
import { TouristPlace } from '../domain/place.entity';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';
import { Region } from '../domain/region.aggregate';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';

describe('Tourist Places API Routing & Controller', () => {
  let app: Hono;

  const mockFindPlaceById = mock((_id: string) => Promise.resolve<TouristPlace | null>(null));
  const mockFindPlaceBySlug = mock((_slug: string) => Promise.resolve<TouristPlace | null>(null));
  const mockFindPlaceByRegionId = mock((_regionId: string, _options?: any) =>
    Promise.resolve<TouristPlace[]>([])
  );
  const mockListPlaces = mock((_options: any) => Promise.resolve<TouristPlace[]>([]));
  const mockFindPlacesNearby = mock(
    (_lng: number, _lat: number, _radius: number, _limit?: number) =>
      Promise.resolve<TouristPlace[]>([])
  );
  const mockSavePlace = mock((_place: TouristPlace) => Promise.resolve());
  const mockUpdatePlace = mock((_place: TouristPlace) => Promise.resolve());
  const mockSoftDeletePlace = mock((_id: string) => Promise.resolve());

  const mockFindRegionById = mock((_id: string) => Promise.resolve<Region | null>(null));

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindPlaceById.mockClear();
    mockFindPlaceBySlug.mockClear();
    mockFindPlaceByRegionId.mockClear();
    mockListPlaces.mockClear();
    mockFindPlacesNearby.mockClear();
    mockSavePlace.mockClear();
    mockUpdatePlace.mockClear();
    mockSoftDeletePlace.mockClear();
    mockFindRegionById.mockClear();

    (globalThis as any).mockPlacesFindById = mockFindPlaceById;
    (globalThis as any).mockPlacesFindBySlug = mockFindPlaceBySlug;
    (globalThis as any).mockPlacesFindByRegionId = mockFindPlaceByRegionId;
    (globalThis as any).mockPlacesList = mockListPlaces;
    (globalThis as any).mockPlacesFindNearby = mockFindPlacesNearby;
    (globalThis as any).mockPlacesSave = mockSavePlace;
    (globalThis as any).mockPlacesUpdate = mockUpdatePlace;
    (globalThis as any).mockPlacesSoftDelete = mockSoftDeletePlace;

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

  const mockPlace = new TouristPlace(
    '3a552ef3-40e1-7ca7-8000-000000000002',
    '3a552ef3-40e1-7ca7-8000-000000000001',
    'Rice Terrace',
    'rice-terrace',
    new GPSLocation(104.5, 22.5),
    'Beautiful view',
    'https://example.com/cover.jpg',
    'active',
    new Date(),
    new Date(),
    null
  );

  test('GET /api/v1/places - should return empty list with 200', async () => {
    mockListPlaces.mockImplementation(() => Promise.resolve([]));

    const res = await app.request('/api/v1/places');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  test('GET /api/v1/places/:id - should return 404 if not found', async () => {
    mockFindPlaceById.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/places/3a552ef3-40e1-7ca7-8000-000000000002');
    expect(res.status).toBe(404);
  });

  test('GET /api/v1/places/:id - should return place detail with 200', async () => {
    mockFindPlaceById.mockImplementation(() => Promise.resolve(mockPlace));

    const res = await app.request('/api/v1/places/3a552ef3-40e1-7ca7-8000-000000000002');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(mockPlace.id);
    expect(body.name).toBe(mockPlace.name);
  });

  test('GET /api/v1/places/slug/:slug - should return place detail with 200', async () => {
    mockFindPlaceBySlug.mockImplementation(() => Promise.resolve(mockPlace));

    const res = await app.request('/api/v1/places/slug/rice-terrace');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(mockPlace.id);
    expect(body.slug).toBe('rice-terrace');
  });

  test('GET /api/v1/places/region/:regionId - should return list of places in region', async () => {
    mockFindPlaceByRegionId.mockImplementation(() => Promise.resolve([mockPlace]));

    const res = await app.request('/api/v1/places/region/3a552ef3-40e1-7ca7-8000-000000000001');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(mockPlace.id);
  });

  test('GET /api/v1/places/nearby - should return nearby places', async () => {
    mockFindPlacesNearby.mockImplementation(() => Promise.resolve([mockPlace]));

    const res = await app.request('/api/v1/places/nearby?lng=104.5&lat=22.5&radius=5000');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(mockPlace.id);
  });

  test('POST /api/v1/places - should create a place successfully and return 201', async () => {
    mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
    mockFindPlaceBySlug.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/places', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        name: 'Rice Terrace',
        location: { lng: 104.5, lat: 22.5 },
        description: 'Terraces',
        coverUrl: 'https://example.com/cover.jpg',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Rice Terrace');
    expect(mockSavePlace).toHaveBeenCalled();
  });

  test('POST /api/v1/places - should fail with 400 validation error on bad coordinate input', async () => {
    const res = await app.request('/api/v1/places', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        regionId: '3a552ef3-40e1-7ca7-8000-000000000001',
        name: 'Rice Terrace',
        location: { lng: 200, lat: 22.5 }, // invalid longitude
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.type).toBe('https://hoangsuphi.vn/errors/validation-failed');
  });

  test('PATCH /api/v1/places/:id - should update a place successfully and return 200', async () => {
    mockFindPlaceById.mockImplementation(() => Promise.resolve(mockPlace));

    const res = await app.request('/api/v1/places/3a552ef3-40e1-7ca7-8000-000000000002', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        name: 'New Rice Terrace',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('New Rice Terrace');
    expect(mockUpdatePlace).toHaveBeenCalled();
  });

  test('DELETE /api/v1/places/:id - should soft delete a place and return 204', async () => {
    mockFindPlaceById.mockImplementation(() => Promise.resolve(mockPlace));

    const res = await app.request('/api/v1/places/3a552ef3-40e1-7ca7-8000-000000000002', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    });

    expect(res.status).toBe(204);
    expect(mockSoftDeletePlace).toHaveBeenCalledWith('3a552ef3-40e1-7ca7-8000-000000000002');
  });

  test('PATCH /api/v1/places/:id/activate - should activate and return 200', async () => {
    const inactivePlace = new TouristPlace(
      '3a552ef3-40e1-7ca7-8000-000000000002',
      '3a552ef3-40e1-7ca7-8000-000000000001',
      'Terrace',
      'terrace',
      new GPSLocation(104.5, 22.5),
      null,
      null,
      'inactive',
      new Date(),
      new Date(),
      null
    );
    mockFindPlaceById.mockImplementation(() => Promise.resolve(inactivePlace));

    const res = await app.request('/api/v1/places/3a552ef3-40e1-7ca7-8000-000000000002/activate', {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('active');
    expect(mockUpdatePlace).toHaveBeenCalled();
  });

  test('PATCH /api/v1/places/:id/deactivate - should deactivate and return 200', async () => {
    mockFindPlaceById.mockImplementation(() => Promise.resolve(mockPlace));

    const res = await app.request(
      '/api/v1/places/3a552ef3-40e1-7ca7-8000-000000000002/deactivate',
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('inactive');
    expect(mockUpdatePlace).toHaveBeenCalled();
  });
});
