import { mock } from 'bun:test';

// Mock database client globally
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    dbHealthCheck: async () => Promise.resolve({ status: 'healthy', durationMs: 5 }),
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});


// Mock Regions repository globally
mock.module('@/modules/regions/repository/regions.repository', () => {
  return {
    DrizzleRegionsRepository: class {
      findById(id: string) {
        return (globalThis as any).mockRegionsFindById ? (globalThis as any).mockRegionsFindById(id) : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockRegionsFindBySlug ? (globalThis as any).mockRegionsFindBySlug(slug) : Promise.resolve(null);
      }
      list(options: any) {
        return (globalThis as any).mockRegionsList ? (globalThis as any).mockRegionsList(options) : Promise.resolve([]);
      }
      save(region: any) {
        return (globalThis as any).mockRegionsSave ? (globalThis as any).mockRegionsSave(region) : Promise.resolve();
      }
      update(region: any) {
        return (globalThis as any).mockRegionsUpdate ? (globalThis as any).mockRegionsUpdate(region) : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockRegionsSoftDelete ? (globalThis as any).mockRegionsSoftDelete(id) : Promise.resolve();
      }
      findChildren() { return Promise.resolve([]); }
      findSubtree() { return Promise.resolve([]); }
    },
  };
});

// Mock Tourist Places repository globally
mock.module('@/modules/regions/repository/places.repository', () => {
  return {
    DrizzleTouristPlacesRepository: class {
      findById(id: string) {
        return (globalThis as any).mockPlacesFindById ? (globalThis as any).mockPlacesFindById(id) : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockPlacesFindBySlug ? (globalThis as any).mockPlacesFindBySlug(slug) : Promise.resolve(null);
      }
      findByRegionId(regionId: string, options?: any) {
        return (globalThis as any).mockPlacesFindByRegionId ? (globalThis as any).mockPlacesFindByRegionId(regionId, options) : Promise.resolve([]);
      }
      list(options: any) {
        return (globalThis as any).mockPlacesList ? (globalThis as any).mockPlacesList(options) : Promise.resolve([]);
      }
      findNearby(lng: number, lat: number, radiusMeters: number, limit?: number) {
        return (globalThis as any).mockPlacesFindNearby ? (globalThis as any).mockPlacesFindNearby(lng, lat, radiusMeters, limit) : Promise.resolve([]);
      }
      save(place: any) {
        return (globalThis as any).mockPlacesSave ? (globalThis as any).mockPlacesSave(place) : Promise.resolve();
      }
      update(place: any) {
        return (globalThis as any).mockPlacesUpdate ? (globalThis as any).mockPlacesUpdate(place) : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockPlacesSoftDelete ? (globalThis as any).mockPlacesSoftDelete(id) : Promise.resolve();
      }
      activate(id: string) {
        return (globalThis as any).mockPlacesActivate ? (globalThis as any).mockPlacesActivate(id) : Promise.resolve();
      }
      deactivate(id: string) {
        return (globalThis as any).mockPlacesDeactivate ? (globalThis as any).mockPlacesDeactivate(id) : Promise.resolve();
      }
    },
  };
});

// Mock Businesses repository globally
mock.module('@/modules/businesses/repository/businesses.repository', () => {
  return {
    DrizzleBusinessesRepository: class {
      findById(id: string) {
        return (globalThis as any).mockBusinessesFindById ? (globalThis as any).mockBusinessesFindById(id) : Promise.resolve(null);
      }
      findBySlug(slug: string) {
        return (globalThis as any).mockBusinessesFindBySlug ? (globalThis as any).mockBusinessesFindBySlug(slug) : Promise.resolve(null);
      }
      findByRegionId(regionId: string, options?: any) {
        return (globalThis as any).mockBusinessesFindByRegionId ? (globalThis as any).mockBusinessesFindByRegionId(regionId, options) : Promise.resolve([]);
      }
      list(options: any) {
        return (globalThis as any).mockBusinessesList ? (globalThis as any).mockBusinessesList(options) : Promise.resolve([]);
      }
      findNearby(lng: number, lat: number, radiusMeters: number, limit?: number) {
        return (globalThis as any).mockBusinessesFindNearby ? (globalThis as any).mockBusinessesFindNearby(lng, lat, radiusMeters, limit) : Promise.resolve([]);
      }
      save(business: any) {
        return (globalThis as any).mockBusinessesSave ? (globalThis as any).mockBusinessesSave(business) : Promise.resolve();
      }
      update(business: any) {
        return (globalThis as any).mockBusinessesUpdate ? (globalThis as any).mockBusinessesUpdate(business) : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockBusinessesSoftDelete ? (globalThis as any).mockBusinessesSoftDelete(id) : Promise.resolve();
      }
      findBusinessTypeById(id: string) {
        return (globalThis as any).mockBusinessesFindBusinessTypeById ? (globalThis as any).mockBusinessesFindBusinessTypeById(id) : Promise.resolve({ id, status: 'active' });
      }
      findAmenitiesByIds(ids: string[]) {
        return (globalThis as any).mockBusinessesFindAmenitiesByIds ? (globalThis as any).mockBusinessesFindAmenitiesByIds(ids) : Promise.resolve(ids.map(id => ({ id })));
      }
    },
  };
});

// Mock Attractions repository globally
mock.module('@/modules/attractions/repository/attractions.repository', () => {
  return {
    DrizzleAttractionsRepository: class {
      findById(id: string) {
        return (globalThis as any).mockAttractionsFindById ? (globalThis as any).mockAttractionsFindById(id) : Promise.resolve(null);
      }
      findBySlug(slug: string, includeDeleted?: boolean) {
        return (globalThis as any).mockAttractionsFindBySlug ? (globalThis as any).mockAttractionsFindBySlug(slug, includeDeleted) : Promise.resolve(null);
      }
      findByRegionId(regionId: string, options?: any) {
        return (globalThis as any).mockAttractionsFindByRegionId ? (globalThis as any).mockAttractionsFindByRegionId(regionId, options) : Promise.resolve([]);
      }
      list(options: any) {
        return (globalThis as any).mockAttractionsList ? (globalThis as any).mockAttractionsList(options) : Promise.resolve([]);
      }
      findNearby(lng: number, lat: number, radiusMeters: number, limit?: number) {
        return (globalThis as any).mockAttractionsFindNearby ? (globalThis as any).mockAttractionsFindNearby(lng, lat, radiusMeters, limit) : Promise.resolve([]);
      }
      save(attraction: any) {
        return (globalThis as any).mockAttractionsSave ? (globalThis as any).mockAttractionsSave(attraction) : Promise.resolve();
      }
      update(attraction: any) {
        return (globalThis as any).mockAttractionsUpdate ? (globalThis as any).mockAttractionsUpdate(attraction) : Promise.resolve();
      }
      softDelete(id: string) {
        return (globalThis as any).mockAttractionsSoftDelete ? (globalThis as any).mockAttractionsSoftDelete(id) : Promise.resolve();
      }
      findCategoryById(id: string) {
        return (globalThis as any).mockAttractionsFindCategoryById ? (globalThis as any).mockAttractionsFindCategoryById(id) : Promise.resolve(null);
      }
    },
  };
});
