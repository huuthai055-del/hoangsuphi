import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { ConflictError, NotFoundError, ValidationError } from '@/common/errors/http.errors';
import { Region } from '@/modules/regions/domain/region.aggregate';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { LtreePath } from '@/modules/regions/domain/value-objects/ltree-path.vo';
import { Business } from '../domain/business.entity';
import { BusinessesService } from './businesses.service';

// Mock database client transactions
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

describe('BusinessesService', () => {
  let service: BusinessesService;

  // Mock Repositories
  const mockFindRegionById = mock((_id: string) => Promise.resolve<Region | null>(null));
  const mockRegionsRepo = {
    findById: mockFindRegionById,
    findBySlug: mock(() => Promise.resolve(null)),
    list: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    findChildren: mock(() => Promise.resolve([])),
    findSubtree: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
    softDelete: mock(() => Promise.resolve()),
  };

  const mockFindBusinessById = mock((_id: string) => Promise.resolve<Business | null>(null));
  const mockFindBusinessBySlug = mock((_slug: string) => Promise.resolve<Business | null>(null));
  const mockFindAmenitiesByIds = mock((_ids: string[]) => Promise.resolve<string[]>([]));
  const mockFindBusinessTypeById = mock((_id: string) =>
    Promise.resolve<{ id: string; isActive: boolean } | null>(null)
  );
  const mockSaveBusiness = mock((_business: Business) => Promise.resolve());
  const mockUpdateBusiness = mock((_business: Business) => Promise.resolve());
  const mockSoftDeleteBusiness = mock((_id: string) => Promise.resolve());

  const mockBusinessesRepo = {
    findById: mockFindBusinessById,
    findBySlug: mockFindBusinessBySlug,
    findByRegionId: mock(() => Promise.resolve([])),
    list: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    findNearby: mock(() => Promise.resolve([])),
    save: mockSaveBusiness,
    update: mockUpdateBusiness,
    softDelete: mockSoftDeleteBusiness,
    findAmenitiesByIds: mockFindAmenitiesByIds,
    findBusinessTypeById: mockFindBusinessTypeById,
  };

  beforeEach(() => {
    service = new BusinessesService(mockRegionsRepo, mockBusinessesRepo);
    mockFindRegionById.mockImplementation(() => Promise.resolve(null));
    mockFindBusinessById.mockImplementation(() => Promise.resolve(null));
    mockFindBusinessBySlug.mockImplementation(() => Promise.resolve(null));
    mockFindAmenitiesByIds.mockImplementation(() => Promise.resolve([]));
    mockFindBusinessTypeById.mockImplementation(() => Promise.resolve(null));
    mockSaveBusiness.mockImplementation(() => Promise.resolve());
    mockUpdateBusiness.mockImplementation(() => Promise.resolve());
    mockSoftDeleteBusiness.mockImplementation(() => Promise.resolve());
  });

  const validRegion = new Region(
    'region-id',
    null,
    'Hoang Su Phi',
    'hoang-su-phi',
    1,
    new LtreePath('hoang_su_phi'),
    null,
    null,
    null,
    null,
    'active',
    new Date(),
    new Date(),
    null
  );

  const mockBusiness = Business.rehydrate({
    id: 'business-id',
    regionId: 'region-id',
    businessTypeId: 'type-id',
    name: 'Nam Hong Homestay',
    slug: 'nam-hong-homestay',
    location: new GPSLocation(104.5, 22.5),
    description: 'Homestay view ruộng bậc thang',
    coverUrl: 'https://example.com/cover.jpg',
    priceMin: null,
    priceMax: null,
    status: 'active',
    amenityIds: ['wifi-id'],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  describe('createBusiness', () => {
    test('should successfully create a valid business with Normalized Slug', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
      mockFindBusinessTypeById.mockImplementation(() =>
        Promise.resolve({ id: 'type-id', isActive: true })
      );
      mockFindAmenitiesByIds.mockImplementation(() => Promise.resolve(['wifi-id']));
      mockFindBusinessBySlug.mockImplementation(() => Promise.resolve(null));

      const result = await service.createBusiness({
        regionId: 'region-id',
        businessTypeId: 'type-id',
        name: '  Nam Hồng Homestay  ',
        location: { lng: 104.5, lat: 22.5 },
        description: 'Nice view',
        coverUrl: 'https://example.com/cover.jpg',
        priceMin: '100000',
        priceMax: '250000.5',
        amenityIds: ['wifi-id'],
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Nam Hồng Homestay');
      expect(result.slug).toBe('nam-hong-homestay');
      expect(result.status).toBe('active');
      expect(result.priceMin).toBe('100000');
      expect(result.priceMax).toBe('250000.5');
      expect(mockSaveBusiness).toHaveBeenCalled();
    });

    test('should fail if region does not exist', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(null));

      expect(
        service.createBusiness({
          regionId: 'non-existent',
          businessTypeId: 'type-id',
          name: 'Homestay',
          location: { lng: 104.5, lat: 22.5 },
          amenityIds: [],
        })
      ).rejects.toThrow(NotFoundError);
    });

    test('should fail if region is soft-deleted', async () => {
      const deletedRegion = new Region(
        'region-id',
        null,
        'Region',
        'region',
        1,
        new LtreePath('region'),
        null,
        null,
        null,
        null,
        'inactive',
        new Date(),
        new Date(),
        new Date()
      );
      mockFindRegionById.mockImplementation(() => Promise.resolve(deletedRegion));

      expect(
        service.createBusiness({
          regionId: 'region-id',
          businessTypeId: 'type-id',
          name: 'Homestay',
          location: { lng: 104.5, lat: 22.5 },
          amenityIds: [],
        })
      ).rejects.toThrow(ValidationError);
    });

    test('should fail if business type does not exist', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
      mockFindBusinessTypeById.mockImplementation(() => Promise.resolve(null));

      expect(
        service.createBusiness({
          regionId: 'region-id',
          businessTypeId: 'non-existent',
          name: 'Homestay',
          location: { lng: 104.5, lat: 22.5 },
          amenityIds: [],
        })
      ).rejects.toThrow(NotFoundError);
    });

    test('should fail if business type is inactive', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
      mockFindBusinessTypeById.mockImplementation(() =>
        Promise.resolve({ id: 'type-id', isActive: false })
      );

      expect(
        service.createBusiness({
          regionId: 'region-id',
          businessTypeId: 'type-id',
          name: 'Homestay',
          location: { lng: 104.5, lat: 22.5 },
          amenityIds: [],
        })
      ).rejects.toThrow(ValidationError);
    });

    test('should fail if one of the amenity IDs is invalid', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
      mockFindBusinessTypeById.mockImplementation(() =>
        Promise.resolve({ id: 'type-id', isActive: true })
      );
      mockFindAmenitiesByIds.mockImplementation(() => Promise.resolve(['wifi-id'])); // only 1 exists, but 2 requested

      expect(
        service.createBusiness({
          regionId: 'region-id',
          businessTypeId: 'type-id',
          name: 'Homestay',
          location: { lng: 104.5, lat: 22.5 },
          amenityIds: ['wifi-id', 'invalid-id'],
        })
      ).rejects.toThrow(ValidationError);
    });

    test('should fail if slug already exists', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
      mockFindBusinessTypeById.mockImplementation(() =>
        Promise.resolve({ id: 'type-id', isActive: true })
      );
      mockFindBusinessBySlug.mockImplementation(() => Promise.resolve(mockBusiness));

      expect(
        service.createBusiness({
          regionId: 'region-id',
          businessTypeId: 'type-id',
          name: 'Nam Hong Homestay',
          location: { lng: 104.5, lat: 22.5 },
          amenityIds: [],
        })
      ).rejects.toThrow(ConflictError);
    });

    test('should fail if coordinates are invalid', async () => {
      mockFindRegionById.mockImplementation(() => Promise.resolve(validRegion));
      mockFindBusinessTypeById.mockImplementation(() =>
        Promise.resolve({ id: 'type-id', isActive: true })
      );

      expect(
        service.createBusiness({
          regionId: 'region-id',
          businessTypeId: 'type-id',
          name: 'Homestay',
          location: { lng: 200, lat: 22.5 }, // longitude out of bounds
          amenityIds: [],
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateBusiness', () => {
    test('should successfully update valid fields', async () => {
      mockFindBusinessById.mockImplementation(() => Promise.resolve(mockBusiness));
      mockFindBusinessBySlug.mockImplementation(() => Promise.resolve(null));

      const updated = await service.updateBusiness('business-id', {
        name: 'New Homestay Name',
        priceMin: '125000',
        priceMax: '275000',
      });

      expect(updated.name).toBe('New Homestay Name');
      expect(updated.priceMin).toBe('125000');
      expect(updated.priceMax).toBe('275000');
      expect(mockUpdateBusiness).toHaveBeenCalled();
    });

    test('should fail if business is soft-deleted', async () => {
      const deletedBusiness = Business.rehydrate({
        id: 'business-id',
        regionId: 'region-id',
        businessTypeId: 'type-id',
        name: 'Place',
        slug: 'place',
        location: new GPSLocation(104.5, 22.5),
        description: null,
        coverUrl: null,
        priceMin: null,
        priceMax: null,
        status: 'inactive',
        amenityIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      mockFindBusinessById.mockImplementation(() => Promise.resolve(deletedBusiness));

      expect(
        service.updateBusiness('business-id', {
          name: 'Name',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteBusiness', () => {
    test('should successfully soft delete business', async () => {
      mockFindBusinessById.mockImplementation(() => Promise.resolve(mockBusiness));

      await service.deleteBusiness('business-id');
      expect(mockSoftDeleteBusiness).toHaveBeenCalledWith('business-id', expect.any(Object));
    });

    test('should fail if already deleted', async () => {
      const deletedBusiness = Business.rehydrate({
        id: 'business-id',
        regionId: 'region-id',
        businessTypeId: 'type-id',
        name: 'Place',
        slug: 'place',
        location: new GPSLocation(104.5, 22.5),
        description: null,
        coverUrl: null,
        priceMin: null,
        priceMax: null,
        status: 'inactive',
        amenityIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      mockFindBusinessById.mockImplementation(() => Promise.resolve(deletedBusiness));

      expect(service.deleteBusiness('business-id')).rejects.toThrow(ValidationError);
    });
  });
});
