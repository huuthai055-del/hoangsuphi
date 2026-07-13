import { expect, test, describe, beforeEach, mock } from 'bun:test';
import { ItineraryService } from './itinerary.service';
import type { IItineraryRepository } from '../repository/itinerary-repository.interface';
import { Itinerary } from '../domain/itinerary.entity';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';

describe('Itinerary Service Layer Tests', () => {
  let mockItineraryRepo: IItineraryRepository;
  let service: ItineraryService;

  const sampleRawItinerary = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    title: 'Hanoi loop trip',
    description: 'Adventure loops',
    visibility: 'PRIVATE' as const,
    status: 'DRAFT' as const,
    createdBy: 'user-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleRawItem = {
    id: 'item-01',
    itineraryId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    ownerType: 'PLACE' as const,
    ownerId: 'place-01',
    dayNumber: 1,
    displayOrder: 1,
    note: 'Welcome spot',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Setup mock repository methods
  const mockFindById = mock(() => Promise.resolve(null as any));
  const mockCreate = mock(() => Promise.resolve());
  const mockUpdate = mock(() => Promise.resolve());
  const mockDelete = mock(() => Promise.resolve());
  const mockFindByUser = mock(() => Promise.resolve({ items: [], total: 0 } as any));
  const mockExists = mock(() => Promise.resolve(false));
  const mockFindMany = mock(() => Promise.resolve({ items: [], total: 0 } as any));
  const mockCount = mock(() => Promise.resolve(0));

  beforeEach(() => {
    mockItineraryRepo = {
      findById: mockFindById,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      findByUser: mockFindByUser,
      exists: mockExists,
      findMany: mockFindMany,
      count: mockCount,
    };

    service = new ItineraryService(mockItineraryRepo);

    // Reset mock implementation to clean defaults
    mockFindById.mockImplementation(() => Promise.resolve(null as any));
    mockCreate.mockImplementation(() => Promise.resolve());
    mockUpdate.mockImplementation(() => Promise.resolve());
    mockDelete.mockImplementation(() => Promise.resolve());
    mockFindByUser.mockImplementation(() => Promise.resolve({ items: [], total: 0 } as any));
    mockExists.mockImplementation(() => Promise.resolve(false));
    mockFindMany.mockImplementation(() => Promise.resolve({ items: [], total: 0 } as any));
    mockCount.mockImplementation(() => Promise.resolve(0));

    // Clear call history
    mockFindById.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockDelete.mockClear();
    mockFindByUser.mockClear();
    mockExists.mockClear();
    mockFindMany.mockClear();
    mockCount.mockClear();
  });

  describe('createItinerary', () => {
    test('should successfully create and save itinerary aggregate', async () => {
      mockCreate.mockImplementation(() => Promise.resolve());

      const res = await service.createItinerary({
        title: 'New Hanoi Tour',
        description: 'Guided tour',
        createdBy: 'user-01',
      });

      expect(res.title).toBe('New Hanoi Tour');
      expect(res.status).toBe('DRAFT');
      expect(mockCreate).toHaveBeenCalled();
    });

    test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
      mockCreate.mockImplementation(() => Promise.reject(new DuplicateKeyRepositoryError('Duplicate')));

      await expect(
        service.createItinerary({ title: 'Duplicate', createdBy: 'user-01' })
      ).rejects.toThrow(ConflictError);
    });

    test('should map empty title domain error to ValidationError', async () => {
      await expect(
        service.createItinerary({ title: '', createdBy: 'user-01' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateItineraryInfo', () => {
    test('should update basic info successfully', async () => {
      const aggregate = Itinerary.rehydrate({ ...sampleRawItinerary, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      const res = await service.updateItineraryInfo(sampleRawItinerary.id, {
        title: 'New title expedition',
      });

      expect(res.title).toBe('New title expedition');
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw NotFoundError if itinerary does not exist', async () => {
      mockFindById.mockImplementation(() => Promise.resolve(null));

      await expect(
        service.updateItineraryInfo('non-existent', { title: 'Ghost' })
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw EntityNotFoundRepositoryError on update persistence failure', async () => {
      const aggregate = Itinerary.rehydrate({ ...sampleRawItinerary, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));
      mockUpdate.mockImplementation(() => Promise.reject(new EntityNotFoundRepositoryError('Not found')));

      await expect(
        service.updateItineraryInfo(sampleRawItinerary.id, { title: 'Updated title' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('publishItinerary', () => {
    test('should transition draft itinerary with items to published status', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [sampleRawItem],
      });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      const res = await service.publishItinerary(sampleRawItinerary.id);

      expect(res.status).toBe('PUBLISHED');
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw ValidationError if publishing empty itinerary', async () => {
      const aggregate = Itinerary.rehydrate({ ...sampleRawItinerary, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      await expect(service.publishItinerary(sampleRawItinerary.id)).rejects.toThrow(ValidationError);
    });
  });

  describe('archiveItinerary', () => {
    test('should archive draft or published itineraries successfully', async () => {
      const aggregate = Itinerary.rehydrate({ ...sampleRawItinerary, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      const res = await service.archiveItinerary(sampleRawItinerary.id);
      expect(res.status).toBe('ARCHIVED');
    });
  });

  describe('deleteItinerary', () => {
    test('should soft delete aggregate and call delete persistence', async () => {
      const aggregate = Itinerary.rehydrate({ ...sampleRawItinerary, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      await service.deleteItinerary(sampleRawItinerary.id);

      expect(aggregate.deletedAt).not.toBeNull();
      expect(mockDelete).toHaveBeenCalledWith(sampleRawItinerary.id, expect.anything());
    });
  });

  describe('addItemToItinerary', () => {
    test('should successfully append new item to itinerary aggregate', async () => {
      const aggregate = Itinerary.rehydrate({ ...sampleRawItinerary, items: [] });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      const item = await service.addItemToItinerary(sampleRawItinerary.id, {
        ownerType: 'PLACE',
        ownerId: 'place-99',
        dayNumber: 1,
      });

      expect(item.ownerId).toBe('place-99');
      expect(aggregate.items.length).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    test('should throw ValidationError on duplicate items addition', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [sampleRawItem],
      });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      await expect(
        service.addItemToItinerary(sampleRawItinerary.id, {
          ownerType: 'PLACE',
          ownerId: 'place-01', // duplicate
          dayNumber: 1,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('removeItemFromItinerary', () => {
    test('should successfully remove item and save aggregate', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [sampleRawItem],
      });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      await service.removeItemFromItinerary(sampleRawItinerary.id, 'item-01');

      expect(aggregate.items.length).toBe(0);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('reorderItineraryItems', () => {
    test('should update items order successfully', async () => {
      const item2 = { ...sampleRawItem, id: 'item-02', ownerId: 'place-02', displayOrder: 2 };
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [sampleRawItem, item2],
      });
      mockFindById.mockImplementation(() => Promise.resolve(aggregate));

      await service.reorderItineraryItems(sampleRawItinerary.id, [
        { id: 'item-01', dayNumber: 1, displayOrder: 2 },
        { id: 'item-02', dayNumber: 1, displayOrder: 1 },
      ]);

      expect(aggregate.items.find((i) => i.id === 'item-01')?.displayOrder).toBe(2);
      expect(aggregate.items.find((i) => i.id === 'item-02')?.displayOrder).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
