import { mock } from 'bun:test';

// Mock the database client to prevent actual connections during unit tests
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {};
        return cb(mockTx);
      },
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

import { expect, test, describe, beforeEach } from 'bun:test';
import { PlacesService, type CreatePlaceCommand, type UpdatePlaceCommand } from './places.service';
import type { IRegionsRepository } from '../repository/regions-repository.interface';
import type { ITouristPlacesRepository } from '../repository/places-repository.interface';
import { Region } from '../domain/region.aggregate';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';
import { TouristPlace } from '../domain/place.entity';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';

describe('PlacesService', () => {
  let findRegionByIdMock: ReturnType<typeof mock>;
  let findRegionBySlugMock: ReturnType<typeof mock>;

  let findPlaceByIdMock: ReturnType<typeof mock>;
  let findPlaceBySlugMock: ReturnType<typeof mock>;
  let findPlaceByRegionIdMock: ReturnType<typeof mock>;
  let listPlacesMock: ReturnType<typeof mock>;
  let findPlacesNearbyMock: ReturnType<typeof mock>;
  let savePlaceMock: ReturnType<typeof mock>;
  let updatePlaceMock: ReturnType<typeof mock>;
  let softDeletePlaceMock: ReturnType<typeof mock>;

  let regionsRepo: IRegionsRepository;
  let placesRepo: ITouristPlacesRepository;
  let service: PlacesService;

  beforeEach(() => {
    findRegionByIdMock = mock(() => Promise.resolve(null));
    findRegionBySlugMock = mock(() => Promise.resolve(null));

    findPlaceByIdMock = mock(() => Promise.resolve(null));
    findPlaceBySlugMock = mock(() => Promise.resolve(null));
    findPlaceByRegionIdMock = mock(() => Promise.resolve([]));
    listPlacesMock = mock(() => Promise.resolve([]));
    findPlacesNearbyMock = mock(() => Promise.resolve([]));
    savePlaceMock = mock(() => Promise.resolve());
    updatePlaceMock = mock(() => Promise.resolve());
    softDeletePlaceMock = mock(() => Promise.resolve());

    regionsRepo = {
      findById: findRegionByIdMock,
      findBySlug: findRegionBySlugMock,
      findChildren: mock(() => Promise.resolve([])),
      findSubtree: mock(() => Promise.resolve([])),
      list: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      save: mock(() => Promise.resolve()),
      update: mock(() => Promise.resolve()),
      softDelete: mock(() => Promise.resolve()),
    };

    placesRepo = {
      findById: findPlaceByIdMock,
      findBySlug: findPlaceBySlugMock,
      findByRegionId: findPlaceByRegionIdMock,
      list: listPlacesMock,
      count: mock(() => Promise.resolve(0)),
      findNearby: findPlacesNearbyMock,
      save: savePlaceMock,
      update: updatePlaceMock,
      softDelete: softDeletePlaceMock,
    };

    service = new PlacesService(regionsRepo, placesRepo);
  });

  test('should fail to create a place if region does not exist', async () => {
    findRegionByIdMock.mockImplementation(() => Promise.resolve(null));

    const cmd: CreatePlaceCommand = {
      regionId: 'non-existent-region-id',
      name: 'Test Place',
      slug: 'test-place',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createPlace(cmd)).rejects.toThrow(
      'Region not found: non-existent-region-id'
    );
  });

  test('should fail to create a place if region has been soft-deleted', async () => {
    const mockRegion = new Region(
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
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));

    const cmd: CreatePlaceCommand = {
      regionId: 'deleted-region-id',
      name: 'Test Place',
      slug: 'test-place',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createPlace(cmd)).rejects.toThrow(
      'Region has been soft-deleted: deleted-region-id'
    );
  });

  test('should fail to create a place with invalid slug format', async () => {
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
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));

    const cmd: CreatePlaceCommand = {
      regionId: 'region-id',
      name: 'Test Place',
      slug: '!!!', // unslugifiable
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createPlace(cmd)).rejects.toThrow(
      'Could not generate a valid slug from the provided name or slug'
    );
  });

  test('should fail to create a place if slug already exists', async () => {
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
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));

    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Existing Place',
      'existing-place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findPlaceBySlugMock.mockImplementation(() => Promise.resolve(mockPlace));

    const cmd: CreatePlaceCommand = {
      regionId: 'region-id',
      name: 'Existing Place',
      slug: 'existing-place',
      location: { lng: 104.5, lat: 22.6 },
    };

    await expect(service.createPlace(cmd)).rejects.toThrow('Slug already exists: existing-place');
  });

  test('should fail to create a place with invalid GPS coordinates', async () => {
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
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));

    const cmd: CreatePlaceCommand = {
      regionId: 'region-id',
      name: 'Test Place',
      slug: 'test-place',
      location: { lng: 200, lat: 22.6 }, // Out of range longitude
    };

    await expect(service.createPlace(cmd)).rejects.toThrow(
      'Invalid longitude: 200. Must be between -180 and 180.'
    );
  });

  test('should successfully create a valid place with an explicit slug', async () => {
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
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));

    const cmd: CreatePlaceCommand = {
      regionId: 'region-id',
      name: 'Beautiful Terrace',
      slug: 'BEAUTIFUL-terrace- ', // needs normalization
      location: { lng: 104.5, lat: 22.6 },
      description: 'Stunning view',
      coverUrl: 'http://example.com/image.jpg',
    };

    const place = await service.createPlace(cmd);

    expect(place).toBeInstanceOf(TouristPlace);
    expect(place.name).toBe('Beautiful Terrace');
    expect(place.slug).toBe('beautiful-terrace');
    expect(place.location.lng).toBe(104.5);
    expect(place.location.lat).toBe(22.6);
    expect(place.description).toBe('Stunning view');
    expect(place.coverUrl).toBe('http://example.com/image.jpg');
    expect(savePlaceMock).toHaveBeenCalled();
  });

  test('should successfully create a valid place with an auto-generated slug from Vietnamese name', async () => {
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
    findRegionByIdMock.mockImplementation(() => Promise.resolve(mockRegion));

    const cmd: CreatePlaceCommand = {
      regionId: 'region-id',
      name: 'Ruộng bậc thang Bản Phùng!',
      location: { lng: 104.5, lat: 22.6 },
    };

    const place = await service.createPlace(cmd);

    expect(place).toBeInstanceOf(TouristPlace);
    expect(place.name).toBe('Ruộng bậc thang Bản Phùng!');
    expect(place.slug).toBe('ruong-bac-thang-ban-phung');
    expect(savePlaceMock).toHaveBeenCalled();
  });

  test('should successfully update a place', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Old Name',
      'old-slug',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    const cmd: UpdatePlaceCommand = {
      name: 'New Name',
      slug: 'new-slug',
      location: { lng: 105.0, lat: 23.0 },
      description: 'Updated desc',
      status: 'inactive',
    };

    const updated = await service.updatePlace('place-id', cmd);

    expect(updated.name).toBe('New Name');
    expect(updated.slug).toBe('new-slug');
    expect(updated.location.lng).toBe(105.0);
    expect(updated.location.lat).toBe(23.0);
    expect(updated.description).toBe('Updated desc');
    expect(updated.status).toBe('inactive');
    expect(updatePlaceMock).toHaveBeenCalled();
  });

  test('should fail to update a soft-deleted place', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      new Date()
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    const cmd: UpdatePlaceCommand = { name: 'New Name' };

    await expect(service.updatePlace('place-id', cmd)).rejects.toThrow(
      'Cannot update a soft-deleted tourist place'
    );
  });

  test('should successfully soft-delete a place', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    await service.deletePlace('place-id');
    expect(softDeletePlaceMock).toHaveBeenCalledWith('place-id');
  });

  test('should fail to soft-delete if place is already deleted', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      new Date()
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    await expect(service.deletePlace('place-id')).rejects.toThrow(
      'Tourist place is already deleted'
    );
  });

  test('should successfully activate a place', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'inactive',
      new Date(),
      new Date(),
      null
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    const activated = await service.activatePlace('place-id');
    expect(activated.status).toBe('active');
    expect(updatePlaceMock).toHaveBeenCalled();
  });

  test('should fail to activate if place is soft-deleted', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'inactive',
      new Date(),
      new Date(),
      new Date()
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    await expect(service.activatePlace('place-id')).rejects.toThrow(
      'Cannot activate a soft-deleted tourist place'
    );
  });

  test('should successfully deactivate a place', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    const deactivated = await service.deactivatePlace('place-id');
    expect(deactivated.status).toBe('inactive');
    expect(updatePlaceMock).toHaveBeenCalled();
  });

  test('should fail to deactivate if place is soft-deleted', async () => {
    const mockPlace = new TouristPlace(
      'place-id',
      'region-id',
      'Place',
      'place',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      new Date()
    );
    findPlaceByIdMock.mockImplementation(() => Promise.resolve(mockPlace));

    await expect(service.deactivatePlace('place-id')).rejects.toThrow(
      'Cannot deactivate a soft-deleted tourist place'
    );
  });

  test('should retrieve place by ID or Slug', async () => {
    const mockPlace = new TouristPlace(
      '3a552ef3-40e1-7ca7-8000-000000000001',
      'region-id',
      'Place',
      'place-slug',
      new GPSLocation(104.5, 22.6),
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findPlaceByIdMock.mockImplementation((id) => {
      if (id === '3a552ef3-40e1-7ca7-8000-000000000001') return Promise.resolve(mockPlace);
      return Promise.resolve(null);
    });
    findPlaceBySlugMock.mockImplementation((slug) => {
      if (slug === 'place-slug') return Promise.resolve(mockPlace);
      return Promise.resolve(null);
    });

    const byId = await service.getPlaceById('3a552ef3-40e1-7ca7-8000-000000000001');
    expect(byId.name).toBe('Place');

    const bySlug = await service.getPlaceBySlug('place-slug');
    expect(bySlug.id).toBe('3a552ef3-40e1-7ca7-8000-000000000001');
  });

  test('should query nearby places', async () => {
    const mockPlaces = [
      new TouristPlace(
        'place-1',
        'region-id',
        'Place 1',
        'place-1',
        new GPSLocation(104.5, 22.6),
        null,
        null,
        'active',
        new Date(),
        new Date(),
        null
      ),
    ];
    findPlacesNearbyMock.mockImplementation(() => Promise.resolve(mockPlaces));

    const results = await service.searchNearby(104.5, 22.6, 5000, 10);
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Place 1');
    expect(findPlacesNearbyMock).toHaveBeenCalledWith(104.5, 22.6, 5000, 10);
  });

  test('should list places by region', async () => {
    const mockPlaces = [
      new TouristPlace(
        'place-1',
        'region-id',
        'Place 1',
        'place-1',
        new GPSLocation(104.5, 22.6),
        null,
        null,
        'active',
        new Date(),
        new Date(),
        null
      ),
    ];
    findPlaceByRegionIdMock.mockImplementation(() => Promise.resolve(mockPlaces));

    const results = await service.listPlacesByRegion('region-id', { page: 1, limit: 10 });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Place 1');
    expect(findPlaceByRegionIdMock).toHaveBeenCalledWith('region-id', { page: 1, limit: 10 });
  });
});
