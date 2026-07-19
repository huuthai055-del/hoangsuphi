import { beforeEach, describe, expect, mock, test } from 'bun:test';

// 1. Setup global resolve value for the thenable DB chain
let mockResolveValue: any = undefined;

const selectSpy = mock(() => mockDbChain);
const insertSpy = mock(() => mockDbChain);
const updateSpy = mock(() => mockDbChain);
const deleteSpy = mock(() => mockDbChain);
const valuesSpy = mock(() => mockDbChain);
const whereSpy = mock(() => mockDbChain);
const limitSpy = mock(() => mockDbChain);
const offsetSpy = mock(() => mockDbChain);
const orderBySpy = mock(() => mockDbChain);
const returningSpy = mock(() => mockDbChain);

const mockDbChain = {
  select: selectSpy,
  from: () => mockDbChain,
  where: whereSpy,
  limit: limitSpy,
  offset: offsetSpy,
  orderBy: orderBySpy,
  insert: insertSpy,
  values: valuesSpy,
  update: updateSpy,
  set: () => mockDbChain,
  delete: deleteSpy,
  returning: returningSpy,
  $dynamic: () => mockDbChain,
};

Object.defineProperty(mockDbChain, 'then', {
  value: (onFulfilled: any, onRejected: any) => {
    if (mockResolveValue instanceof Error) {
      return Promise.reject(mockResolveValue).catch(onRejected);
    }
    return Promise.resolve(mockResolveValue).then(onFulfilled, onRejected);
  },
  configurable: true,
  writable: true,
});

mock.module('@/lib/database/client', () => {
  return {
    db: {
      ...mockDbChain,
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDbChain),
  };
});

import {
  CheckConstraintViolationRepositoryError,
  ConstraintViolationRepositoryError,
  DatabaseOperationRepositoryError,
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  NotNullViolationRepositoryError,
  TransactionConflictRepositoryError,
} from '@/common/errors/repository.errors';
import { Itinerary } from '../domain/itinerary.entity';
import { DrizzleItineraryRepository } from './itinerary.repository';

describe('Itineraries Repository Layer', () => {
  let repo: DrizzleItineraryRepository;

  const sampleRawItinerary = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    title: 'Autumn Hanoi to Ha Giang Loop',
    description: 'Scenic fields loop trip',
    visibility: 'PRIVATE' as const,
    status: 'DRAFT' as const,
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleRawItem = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55705',
    itineraryId: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55709',
    dayNumber: 1,
    displayOrder: 1,
    note: 'Start loop trek here',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repo = new DrizzleItineraryRepository();
    mockResolveValue = undefined;

    selectSpy.mockClear();
    insertSpy.mockClear();
    updateSpy.mockClear();
    deleteSpy.mockClear();
    valuesSpy.mockClear();
    whereSpy.mockClear();
    limitSpy.mockClear();
    offsetSpy.mockClear();
    orderBySpy.mockClear();
    returningSpy.mockClear();
  });

  describe('findById()', () => {
    test('should query itineraries and items, returning rehydrated aggregate', async () => {
      // 1. Mock select itineraries row
      mockResolveValue = [sampleRawItinerary];
      const result = await repo.findById(sampleRawItinerary.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleRawItinerary.id);
      expect(result?.title).toBe(sampleRawItinerary.title);
    });

    test('should return null if itinerary not found', async () => {
      mockResolveValue = [];
      const result = await repo.findById('missing-id');
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    test('should insert rawItinerary and rawItems successfully', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [sampleRawItem],
      });

      mockResolveValue = [sampleRawItinerary];
      await repo.create(aggregate);

      expect(insertSpy).toHaveBeenCalled();
    });

    test('should map DuplicateKeyRepositoryError if database throws PG 23505', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [],
      });

      const pgErr = new Error('Unique violation error');
      (pgErr as any).code = '23505';
      (pgErr as any).constraint = 'itinerary_items_day_order_uniq_idx';
      mockResolveValue = pgErr;

      await expect(repo.create(aggregate)).rejects.toThrow(DuplicateKeyRepositoryError);
    });
  });

  describe('update()', () => {
    test('should update itinerary, delete old items and insert updated items list', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [sampleRawItem],
      });

      // return updated row
      mockResolveValue = [sampleRawItinerary];
      await repo.update(aggregate);

      expect(updateSpy).toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalled(); // deletes old items
    });

    test('should throw EntityNotFoundRepositoryError if updating non-existent itinerary', async () => {
      const aggregate = Itinerary.rehydrate({
        ...sampleRawItinerary,
        items: [],
      });

      mockResolveValue = []; // returns empty array, indicating zero rows updated
      await expect(repo.update(aggregate)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });

  describe('delete()', () => {
    test('should perform soft delete by setting deletedAt', async () => {
      mockResolveValue = [sampleRawItinerary];
      await repo.delete(sampleRawItinerary.id);
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('exists()', () => {
    test('should return true if row count > 0', async () => {
      mockResolveValue = [{ count: 1 }];
      const exists = await repo.exists(sampleRawItinerary.id);
      expect(exists).toBe(true);
    });

    test('should return false if row count === 0', async () => {
      mockResolveValue = [{ count: 0 }];
      const exists = await repo.exists(sampleRawItinerary.id);
      expect(exists).toBe(false);
    });
  });

  describe('findMany() & findByUser()', () => {
    test('should return paginated itineraries results list', async () => {
      mockResolveValue = [{ count: '1' }]; // count query resolves first

      const res = await repo.findMany({
        filters: { status: 'DRAFT' },
        pagination: { limit: 5, offset: 0 },
      });

      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1); // since it subsequently queries lists
      expect(res.hasNext).toBe(false);
      expect(res.hasPrevious).toBe(false);
    });
  });

  describe('Constraint Mapping tests', () => {
    test('PG 23503 should map to ConstraintViolationRepositoryError', async () => {
      const pgErr = new Error('Foreign key violation');
      (pgErr as any).code = '23503';
      mockResolveValue = pgErr;

      await expect(repo.exists('some-id')).rejects.toThrow(ConstraintViolationRepositoryError);
    });

    test('PG 23502 should map to NotNullViolationRepositoryError', async () => {
      const pgErr = new Error('Not null violation');
      (pgErr as any).code = '23502';
      mockResolveValue = pgErr;

      await expect(repo.exists('some-id')).rejects.toThrow(NotNullViolationRepositoryError);
    });

    test('PG 23514 should map to CheckConstraintViolationRepositoryError', async () => {
      const pgErr = new Error('Check constraint violation');
      (pgErr as any).code = '23514';
      mockResolveValue = pgErr;

      await expect(repo.exists('some-id')).rejects.toThrow(CheckConstraintViolationRepositoryError);
    });

    test('PG 40001 should map to TransactionConflictRepositoryError', async () => {
      const pgErr = new Error('deadlock');
      (pgErr as any).code = '40001';
      mockResolveValue = pgErr;

      await expect(repo.exists('some-id')).rejects.toThrow(TransactionConflictRepositoryError);
    });

    test('Unclassified PG errors should map to DatabaseOperationRepositoryError', async () => {
      const pgErr = new Error('unclassified');
      mockResolveValue = pgErr;

      await expect(repo.exists('some-id')).rejects.toThrow(DatabaseOperationRepositoryError);
    });
  });
});
