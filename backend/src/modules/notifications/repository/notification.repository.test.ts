import { beforeEach, describe, expect, mock, test } from 'bun:test';

let mockResolveValue: any = undefined;
let mockResolveQueue: any[] = [];

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
    let resolved = mockResolveValue;
    if (mockResolveQueue.length > 0) {
      resolved = mockResolveQueue.shift();
    }
    if (resolved instanceof Error) {
      return Promise.reject(resolved).catch(onRejected);
    }
    return Promise.resolve(resolved).then(onFulfilled, onRejected);
  },
  configurable: true,
  writable: true,
});

mock.module('@/lib/database/client', () => ({
  db: { ...mockDbChain },
  runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDbChain),
}));

import {
  CheckConstraintViolationRepositoryError,
  ConstraintViolationRepositoryError,
  DatabaseOperationRepositoryError,
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
  TransactionConflictRepositoryError,
} from '@/common/errors/repository.errors';
import { Notification } from '../domain/notification.entity';
import { DrizzleNotificationRepository } from './notification.repository';

describe('Notification Repository Layer', () => {
  let repo: DrizzleNotificationRepository;

  const sampleRawNotification = {
    id: 'notif-01',
    userId: 'user-01',
    title: 'New Message',
    message: 'Hello world',
    type: 'INFO' as const,
    isRead: false,
    dismissedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    repo = new DrizzleNotificationRepository();
    mockResolveValue = undefined;
    mockResolveQueue = [];
    selectSpy.mockClear();
    insertSpy.mockClear();
    updateSpy.mockClear();
    deleteSpy.mockClear();
    returningSpy.mockClear();
  });

  describe('findById()', () => {
    test('should return rehydrated Notification if found', async () => {
      mockResolveValue = [sampleRawNotification];
      const result = await repo.findById('notif-01');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('notif-01');
    });

    test('should return null if not found', async () => {
      mockResolveValue = [];
      const result = await repo.findById('missing');
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    test('should insert notification successfully', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockResolveValue = [sampleRawNotification];
      await repo.create(notif);
      expect(insertSpy).toHaveBeenCalled();
    });

    test('should throw DuplicateKeyRepositoryError on PG 23505', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      const pgErr = new Error('Unique');
      (pgErr as any).code = '23505';
      mockResolveValue = pgErr;
      await expect(repo.create(notif)).rejects.toThrow(DuplicateKeyRepositoryError);
    });
  });

  describe('update()', () => {
    test('should update notification successfully', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockResolveValue = [sampleRawNotification];
      await repo.update(notif);
      expect(updateSpy).toHaveBeenCalled();
    });

    test('should throw EntityNotFoundRepositoryError if not found', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockResolveValue = [];
      await expect(repo.update(notif)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });

  describe('delete()', () => {
    test('should soft delete notification', async () => {
      const notif = Notification.rehydrate(sampleRawNotification);
      mockResolveValue = [sampleRawNotification];
      await repo.delete(notif);
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('exists()', () => {
    test('should return true when count > 0', async () => {
      mockResolveValue = [{ count: 1 }];
      expect(await repo.exists('notif-01')).toBe(true);
    });

    test('should return false when count === 0', async () => {
      mockResolveValue = [{ count: 0 }];
      expect(await repo.exists('notif-01')).toBe(false);
    });
  });

  describe('findMany() & findByUser()', () => {
    test('should return paginated notification list', async () => {
      mockResolveQueue = [[{ count: '1' }], [sampleRawNotification]];
      const res = await repo.findMany({
        filters: { isRead: false },
        pagination: { limit: 5, offset: 0 },
      });
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
    });

    test('should return notifications by user', async () => {
      mockResolveQueue = [[{ count: '1' }], [sampleRawNotification]];
      const res = await repo.findByUser('user-01');
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
    });
  });

  describe('Constraint Mapping tests', () => {
    test('PG 23503 → ConstraintViolationRepositoryError', async () => {
      const pgErr = new Error('FK');
      (pgErr as any).code = '23503';
      mockResolveValue = pgErr;
      await expect(repo.exists('id')).rejects.toThrow(ConstraintViolationRepositoryError);
    });

    test('PG 23514 → CheckConstraintViolationRepositoryError', async () => {
      const pgErr = new Error('Check');
      (pgErr as any).code = '23514';
      mockResolveValue = pgErr;
      await expect(repo.exists('id')).rejects.toThrow(CheckConstraintViolationRepositoryError);
    });

    test('PG 40001 → TransactionConflictRepositoryError', async () => {
      const pgErr = new Error('Deadlock');
      (pgErr as any).code = '40001';
      mockResolveValue = pgErr;
      await expect(repo.exists('id')).rejects.toThrow(TransactionConflictRepositoryError);
    });

    test('Unclassified → DatabaseOperationRepositoryError', async () => {
      mockResolveValue = new Error('Unknown');
      await expect(repo.exists('id')).rejects.toThrow(DatabaseOperationRepositoryError);
    });
  });
});
