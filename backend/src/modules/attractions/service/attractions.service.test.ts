import { mock } from 'bun:test';

mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

import { expect, test, describe, beforeEach } from 'bun:test';
import {
  AttractionsService,
  type CreateAttractionCommand,
  type UpdateAttractionCommand,
} from './attractions.service';
import type { IRegionsRepository } from '@/modules/regions/repository/regions-repository.interface';
import type { IAttractionsRepository } from '../repository/attractions-repository.interface';
import { Region } from '@/modules/regions/domain/region.aggregate';
import { LtreePath } from '@/modules/regions/domain/value-objects/ltree-path.vo';
import { Attraction } from '../domain/attraction.entity';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';

describe('AttractionsService', () => {
  let findRegionByIdMock: ReturnType<typeof mock>;
  let findRegionBySlugMock: ReturnType<typeof mock>;

  let findAttractionByIdMock: ReturnType<typeof mock>;
  let findAttractionBySlugMock: ReturnType<typeof mock>;
  let findAttractionByRegionIdMock: ReturnType<typeof mock>;
  let listAttractionsMock: ReturnType<typeof mock>;
  let findAttractionsNearbyMock: ReturnType<typeof mock>;
  let saveAttractionMock: ReturnType<typeof mock>;
  let updateAttractionMock: ReturnType<typeof mock>;
  let softDeleteAttractionMock: ReturnType<typeof mock>;
  let findCategoryByIdMock: ReturnType<typeof mock>;

  let regionsRepo: IRegionsRepository;
  let attractionsRepo: IAttractionsRepository;
  let service: AttractionsService;

  beforeEach(() => {
    findRegionByIdMock = mock(() => Promise.resolve(null));
    findRegionBySlugMock = mock(() => Promise.resolve(null));

    findAttractionByIdMock = mock(() => Promise.resolve(null));
    findAttractionBySlugMock = mock(() => Promise.resolve(null));
    findAttractionByRegionIdMock = mock(() => Promise.resolve([]));
    listAttractionsMock = mock(() => Promise.resolve([]));
    findAttractionsNearbyMock = mock(() => Promise.resolve([]));
    saveAttractionMock = mock(() => Promise.resolve());
    updateAttractionMock = mock(() => Promise.resolve());
    softDeleteAttractionMock = mock(() => Promise.resolve());
    findCategoryByIdMock = mock(() => Promise.resolve(null));

    regionsRepo = {
      findById: findRegionByIdMock,
      findBySlug: findRegionBySlugMock,
      findChildren: mock(() => Promise.resolve([])),
      findSubtree: mock(() => Promise.resolve([])),
      list: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
      softDelete: mock(() => Promise.resolve()),
    };

    attractionsRepo = {
      findById: findAttractionByIdMock,
      findBySlug: findAttractionBySlugMock,
      findByRegionId: findAttractionByRegionIdMock,
      list: listAttractionsMock,
      findNearby: findAttractionsNearbyMock,
      save: saveAttractionMock,
      update: updateAttractionMock,
      softDelete: softDeleteAttractionMock,
      findCategoryById: findCategoryByIdMock,
    };

    service = new AttractionsService(regionsRepo, attractionsRepo);
  });

  const mockRegion = new Region(
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
    'active',
    new Date(),
    new Date(),
    null
  );

  const mockCategory = { id: 'category-id', isUtility: false };

  test('should fail to create an attraction if region does not exist', async () => {
    findRegionByIdMock.mockImplementation(() => Promise.resolve(null));

    const cmd: CreateAttractionCommand = {
      regionId: 'non-existent-region-id',
      categoryId: 'category-id',
      name: 'Test Attraction',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createAttraction(cmd)).rejects.toThrow(
      'Region not found: non-existent-region-id'
    );
  });

  test('should fail to create an attraction if region is soft-deleted', async () => {
    const deletedRegion = new Region(
      'deleted-region-id',
      null,
      'Deleted',
      'deleted',
      1,
      new LtreePath('deleted'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      new Date()
    );
    findRegionByIdMock.mockImplementation(() => Promise.resolve(deletedRegion));

    const cmd: CreateAttractionCommand = {
      regionId: 'deleted-region-id',
      categoryId: 'category-id',
      name: 'Test Attraction',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createAttraction(cmd)).rejects.toThrow(
      'Region has been soft-deleted: deleted-region-id'
    );
  });

  test('should fail to create if category does not exist', async () => {
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));
    findCategoryByIdMock.mockImplementation(() => Promise.resolve(null));

    const cmd: CreateAttractionCommand = {
      regionId: 'region-id',
      categoryId: 'non-existent-category-id',
      name: 'Test Attraction',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createAttraction(cmd)).rejects.toThrow(
      'Attraction category not found: non-existent-category-id'
    );
  });

  test('should fail if slug already exists (even if soft-deleted)', async () => {
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));
    findCategoryByIdMock.mockImplementation(() => Promise.resolve(mockCategory));

    const mockAttraction = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Existing',
      'existing',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findAttractionBySlugMock.mockImplementation((_slug, includeDeleted) => {
      expect(includeDeleted).toBe(true);
      return Promise.resolve(mockAttraction);
    });

    const cmd: CreateAttractionCommand = {
      regionId: 'region-id',
      categoryId: 'category-id',
      name: 'Existing',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createAttraction(cmd)).rejects.toThrow('Slug already exists: existing');
  });

  test('should successfully create an attraction', async () => {
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));
    findCategoryByIdMock.mockImplementation(() => Promise.resolve(mockCategory));
    findAttractionBySlugMock.mockImplementation(() => Promise.resolve(null));

    const cmd: CreateAttractionCommand = {
      regionId: 'region-id',
      categoryId: 'category-id',
      name: 'Chiêu Lầu Thi',
      location: { lng: 104.5, lat: 22.6 },
      description: 'Mountain peak',
      coverUrl: 'https://example.com/chieu-lau-thi.jpg',
    };

    const result = await service.createAttraction(cmd);
    expect(result.name).toBe('Chiêu Lầu Thi');
    expect(result.slug).toBe('chieu-lau-thi');
    expect(result.location.lng).toBe(104.5);
    expect(result.location.lat).toBe(22.6);
    expect(result.description).toBe('Mountain peak');
    expect(result.coverUrl).toBe('https://example.com/chieu-lau-thi.jpg');
    expect(saveAttractionMock).toHaveBeenCalled();
  });

  test('should successfully update an attraction', async () => {
    const existing = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Old Name',
      'old-name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(existing));

    const cmd: UpdateAttractionCommand = {
      name: 'New Name',
      description: 'New Description',
      status: 'inactive',
    };

    const result = await service.updateAttraction('id', cmd);
    expect(result.name).toBe('New Name');
    expect(result.description).toBe('New Description');
    expect(result.status).toBe('inactive');
    expect(updateAttractionMock).toHaveBeenCalled();
  });

  test('should successfully soft-delete an attraction', async () => {
    const existing = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Name',
      'name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(existing));

    await service.deleteAttraction('id');
    expect(softDeleteAttractionMock).toHaveBeenCalledWith('id');
  });

  test('should fail to soft-delete if attraction is already deleted', async () => {
    const deleted = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Name',
      'name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      new Date()
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(deleted));

    await expect(service.deleteAttraction('id')).rejects.toThrow('Attraction is already deleted');
  });

  test('should successfully activate an attraction', async () => {
    const existing = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Name',
      'name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'inactive',
      new Date(),
      new Date(),
      null
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(existing));

    const result = await service.activateAttraction('id');
    expect(result.status).toBe('active');
    expect(updateAttractionMock).toHaveBeenCalled();
  });

  test('should fail to activate a soft-deleted attraction', async () => {
    const deleted = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Name',
      'name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'inactive',
      new Date(),
      new Date(),
      new Date()
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(deleted));

    await expect(service.activateAttraction('id')).rejects.toThrow(
      'Cannot activate a soft-deleted attraction'
    );
  });

  test('should successfully deactivate an attraction', async () => {
    const existing = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Name',
      'name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(existing));

    const result = await service.deactivateAttraction('id');
    expect(result.status).toBe('inactive');
    expect(updateAttractionMock).toHaveBeenCalled();
  });

  test('should fail to deactivate a soft-deleted attraction', async () => {
    const deleted = new Attraction(
      'id',
      'region-id',
      'category-id',
      'Name',
      'name',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      new Date()
    );
    findAttractionByIdMock.mockImplementation(() => Promise.resolve(deleted));

    await expect(service.deactivateAttraction('id')).rejects.toThrow(
      'Cannot deactivate a soft-deleted attraction'
    );
  });

  test('should successfully list attractions by region', async () => {
    const mockAttractionsList = [
      new Attraction(
        'id1',
        'region-id',
        'cat-id',
        'Peak 1',
        'peak-1',
        new GPSLocation(104.5, 22.6),
        null,
        null,
        'active',
        new Date(),
        new Date(),
        null
      ),
    ];
    findAttractionByRegionIdMock.mockImplementation(() => Promise.resolve(mockAttractionsList));

    const result = await service.listAttractionsByRegion('region-id', { page: 1, limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Peak 1');
    expect(findAttractionByRegionIdMock).toHaveBeenCalledWith('region-id', { page: 1, limit: 10 });
  });

  describe('Attraction Entity Methods', () => {
    test('should manage active and deleted state correctly', () => {
      const attraction = new Attraction(
        'id',
        'region-id',
        'category-id',
        'Name',
        'name',
        new GPSLocation(104.5, 22.6),
        null,
        null,
        'inactive',
        new Date(),
        new Date(),
        null
      );

      expect(attraction.isActive).toBe(false);
      expect(attraction.isDeleted).toBe(false);

      attraction.activate();
      expect(attraction.status).toBe('active');
      expect(attraction.isActive).toBe(true);

      attraction.deactivate();
      expect(attraction.status).toBe('inactive');
      expect(attraction.isActive).toBe(false);

      attraction.softDelete();
      expect(attraction.isDeleted).toBe(true);
      expect(attraction.isActive).toBe(false);
    });
  });
});
