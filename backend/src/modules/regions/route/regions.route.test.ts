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
import { Region } from '../domain/region.aggregate';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';

describe('Regions API Routing & Controller', () => {
  let app: Hono;

  const mockFindById = mock((_id: string) => Promise.resolve<Region | null>(null));
  const mockFindBySlug = mock((_slug: string) => Promise.resolve<Region | null>(null));
  const mockList = mock((_options: any) => Promise.resolve<Region[]>([]));
  const mockSave = mock((_region: Region) => Promise.resolve());
  const mockUpdate = mock((_region: Region) => Promise.resolve());
  const mockSoftDelete = mock((_id: string) => Promise.resolve());

  beforeEach(async () => {
    const { createApp } = await import('../../../app');
    app = createApp();

    mockFindById.mockClear();
    mockFindBySlug.mockClear();
    mockList.mockClear();
    mockSave.mockClear();
    mockUpdate.mockClear();
    mockSoftDelete.mockClear();

    (globalThis as any).mockRegionsFindById = mockFindById;
    (globalThis as any).mockRegionsFindBySlug = mockFindBySlug;
    (globalThis as any).mockRegionsList = mockList;
    (globalThis as any).mockRegionsSave = mockSave;
    (globalThis as any).mockRegionsUpdate = mockUpdate;
    (globalThis as any).mockRegionsSoftDelete = mockSoftDelete;
  });

  test('GET /api/v1/regions - should return empty list with 200', async () => {
    mockList.mockImplementation(() => Promise.resolve([]));

    const res = await app.request('/api/v1/regions');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  test('GET /api/v1/regions/:id - should return 404 if not found', async () => {
    mockFindById.mockImplementation(() => Promise.resolve(null));

    const res = await app.request('/api/v1/regions/3a552ef3-40e1-7ca7-8000-000000000001');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.type).toBe('https://hoangsuphi.vn/errors/not-found');
  });

  test('GET /api/v1/regions/:id - should return region detail with 200', async () => {
    const mockRegion = new Region(
      '3a552ef3-40e1-7ca7-8000-000000000001',
      null,
      'Ha Giang',
      'ha-giang',
      1,
      new LtreePath('ha_giang'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    mockFindById.mockImplementation(() => Promise.resolve(mockRegion));

    const res = await app.request('/api/v1/regions/3a552ef3-40e1-7ca7-8000-000000000001');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('3a552ef3-40e1-7ca7-8000-000000000001');
    expect(body.name).toBe('Ha Giang');
  });

  test('POST /api/v1/regions - should return validation error 400 for bad slug or level', async () => {
    const res = await app.request('/api/v1/regions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        slug: 'invalid_slug',
        level: 6,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.type).toBe('https://hoangsuphi.vn/errors/validation-failed');
    expect(body.invalidParams).toBeDefined();
  });
});
