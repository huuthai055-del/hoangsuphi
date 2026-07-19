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

import { beforeEach, describe, expect, test } from 'bun:test';
import { Region } from '../domain/region.aggregate';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';
import type { ITouristPlacesRepository } from '../repository/places-repository.interface';
import type { IRegionsRepository } from '../repository/regions-repository.interface';
import {
  type CreateRegionCommand,
  RegionsService,
  type UpdateRegionCommand,
} from './regions.service';

describe('RegionsService', () => {
  let findByIdMock: ReturnType<typeof mock>;
  let findBySlugMock: ReturnType<typeof mock>;
  let findChildrenMock: ReturnType<typeof mock>;
  let findSubtreeMock: ReturnType<typeof mock>;
  let listMock: ReturnType<typeof mock>;
  let saveMock: ReturnType<typeof mock>;
  let updateMock: ReturnType<typeof mock>;
  let softDeleteMock: ReturnType<typeof mock>;

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
  let service: RegionsService;

  beforeEach(() => {
    findByIdMock = mock(() => Promise.resolve(null));
    findBySlugMock = mock(() => Promise.resolve(null));
    findChildrenMock = mock(() => Promise.resolve([]));
    findSubtreeMock = mock(() => Promise.resolve([]));
    listMock = mock(() => Promise.resolve([]));
    saveMock = mock(() => Promise.resolve());
    updateMock = mock(() => Promise.resolve());
    softDeleteMock = mock(() => Promise.resolve());

    findPlaceByIdMock = mock(() => Promise.resolve(null));
    findPlaceBySlugMock = mock(() => Promise.resolve(null));
    findPlaceByRegionIdMock = mock(() => Promise.resolve([]));
    listPlacesMock = mock(() => Promise.resolve([]));
    findPlacesNearbyMock = mock(() => Promise.resolve([]));
    savePlaceMock = mock(() => Promise.resolve());
    updatePlaceMock = mock(() => Promise.resolve());
    softDeletePlaceMock = mock(() => Promise.resolve());

    regionsRepo = {
      findById: findByIdMock,
      findBySlug: findBySlugMock,
      findChildren: findChildrenMock,
      findSubtree: findSubtreeMock,
      list: listMock,
      count: mock(() => Promise.resolve(0)),
      save: saveMock,
      update: updateMock,
      softDelete: softDeleteMock,
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

    service = new RegionsService(regionsRepo, placesRepo);
  });

  test('should fail to create a region with invalid level', async () => {
    const cmd: CreateRegionCommand = {
      name: 'Test',
      slug: 'test',
      level: 6,
    };
    await expect(service.createRegion(cmd)).rejects.toThrow('Level must be between 1 and 5');
  });

  test('should fail to create a region with invalid slug format', async () => {
    const cmd: CreateRegionCommand = {
      name: 'Test',
      slug: 'test_invalid',
      level: 1,
    };
    await expect(service.createRegion(cmd)).rejects.toThrow('Invalid slug format');
  });

  test('should fail to create a region if slug already exists', async () => {
    const mockRegion = new Region(
      '123',
      null,
      'Exist',
      'exist',
      1,
      new LtreePath('exist'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findBySlugMock.mockImplementation(() => Promise.resolve(mockRegion));

    const cmd: CreateRegionCommand = {
      name: 'Exist',
      slug: 'exist',
      level: 1,
    };
    await expect(service.createRegion(cmd)).rejects.toThrow('Slug already exists: exist');
  });

  test('should fail if parentId is provided but parent does not exist', async () => {
    findByIdMock.mockImplementation(() => Promise.resolve(null));

    const cmd: CreateRegionCommand = {
      name: 'Child',
      slug: 'child',
      level: 2,
      parentId: 'parent-123',
    };
    await expect(service.createRegion(cmd)).rejects.toThrow('Parent region not found: parent-123');
  });

  test('should fail to update region parent to itself', async () => {
    const mockRegion = new Region(
      'A-id',
      null,
      'Region A',
      'region_a',
      1,
      new LtreePath('region_a'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    findByIdMock.mockImplementation((id) => {
      if (id === 'A-id') return Promise.resolve(mockRegion);
      return Promise.resolve(null);
    });

    const cmd: UpdateRegionCommand = { parentId: 'A-id' };
    await expect(service.updateRegion('A-id', cmd)).rejects.toThrow(
      'Region cannot be its own parent'
    );
  });

  test('should fail to move region under its own subtree', async () => {
    const mockRegionA = new Region(
      'A-id',
      null,
      'Region A',
      'region_a',
      1,
      new LtreePath('region_a'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    const mockRegionB = new Region(
      'B-id',
      'A-id',
      'Region B',
      'region_b',
      2,
      new LtreePath('region_a.region_b'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );

    findByIdMock.mockImplementation((id) => {
      if (id === 'A-id') return Promise.resolve(mockRegionA);
      if (id === 'B-id') return Promise.resolve(mockRegionB);
      return Promise.resolve(null);
    });

    const cmd: UpdateRegionCommand = { parentId: 'B-id' };
    await expect(service.updateRegion('A-id', cmd)).rejects.toThrow(
      'Cannot move region under its own subtree'
    );
  });

  test('should successfully update paths and levels recursively when moving region to a new parent', async () => {
    const mockHaGiang = new Region(
      'HG-id',
      null,
      'Ha Giang',
      'ha_giang',
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
    const mockHoangSuPhi = new Region(
      'HSP-id',
      'HG-id',
      'Hoang Su Phi',
      'hoang_su_phi',
      2,
      new LtreePath('ha_giang.hoang_su_phi'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );
    const mockBanPhung = new Region(
      'BP-id',
      'HSP-id',
      'Ban Phung',
      'ban_phung',
      3,
      new LtreePath('ha_giang.hoang_su_phi.ban_phung'),
      null,
      null,
      null,
      null,
      'active',
      new Date(),
      new Date(),
      null
    );

    findByIdMock.mockImplementation((id) => {
      if (id === 'HG-id') return Promise.resolve(mockHaGiang);
      if (id === 'HSP-id') return Promise.resolve(mockHoangSuPhi);
      if (id === 'BP-id') return Promise.resolve(mockBanPhung);
      return Promise.resolve(null);
    });

    findSubtreeMock.mockImplementation((path) => {
      if (path === 'ha_giang.hoang_su_phi') {
        return Promise.resolve([mockHoangSuPhi, mockBanPhung]);
      }
      return Promise.resolve([]);
    });

    const cmd: UpdateRegionCommand = { parentId: null };
    const updated = await service.updateRegion('HSP-id', cmd);

    expect(updated.parentId).toBeNull();
    expect(updated.level).toBe(1);
    expect(updated.path.getValue()).toBe('hoang_su_phi');

    expect(mockBanPhung.level).toBe(2);
    expect(mockBanPhung.path.getValue()).toBe('hoang_su_phi.ban_phung');
  });
});
