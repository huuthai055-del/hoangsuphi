import { beforeEach, describe, expect, mock, test } from 'bun:test';

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
import { Faq } from '../domain/faq.entity';
import { TopList } from '../domain/top-list.entity';
import { DrizzleFaqRepository } from './faq.repository';
import { DrizzleTopListRepository } from './top-list.repository';

describe('FAQ Repository Layer', () => {
  let faqRepo: DrizzleFaqRepository;

  const sampleRawFaq = {
    id: 'faq-01',
    question: 'What is HoangSuPhi?',
    answer: 'A tourism platform.',
    category: 'general',
    displayOrder: 1,
    status: 'DRAFT' as const,
    createdBy: 'user-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    faqRepo = new DrizzleFaqRepository();
    mockResolveValue = undefined;
    selectSpy.mockClear();
    insertSpy.mockClear();
    updateSpy.mockClear();
    deleteSpy.mockClear();
    returningSpy.mockClear();
  });

  describe('findById()', () => {
    test('should return rehydrated Faq if found', async () => {
      mockResolveValue = [sampleRawFaq];
      const result = await faqRepo.findById('faq-01');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('faq-01');
    });

    test('should return null if not found', async () => {
      mockResolveValue = [];
      const result = await faqRepo.findById('missing');
      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    test('should insert faq successfully', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockResolveValue = [sampleRawFaq];
      await faqRepo.create(faq);
      expect(insertSpy).toHaveBeenCalled();
    });

    test('should throw DuplicateKeyRepositoryError on PG 23505', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      const pgErr = new Error('Unique');
      (pgErr as any).code = '23505';
      mockResolveValue = pgErr;
      await expect(faqRepo.create(faq)).rejects.toThrow(DuplicateKeyRepositoryError);
    });
  });

  describe('update()', () => {
    test('should update FAQ successfully', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockResolveValue = [sampleRawFaq];
      await faqRepo.update(faq);
      expect(updateSpy).toHaveBeenCalled();
    });

    test('should throw EntityNotFoundRepositoryError if not found', async () => {
      const faq = Faq.rehydrate(sampleRawFaq);
      mockResolveValue = [];
      await expect(faqRepo.update(faq)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });

  describe('delete()', () => {
    test('should soft delete FAQ', async () => {
      mockResolveValue = [sampleRawFaq];
      await faqRepo.delete('faq-01');
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('exists()', () => {
    test('should return true when count > 0', async () => {
      mockResolveValue = [{ count: 1 }];
      expect(await faqRepo.exists('faq-01')).toBe(true);
    });

    test('should return false when count === 0', async () => {
      mockResolveValue = [{ count: 0 }];
      expect(await faqRepo.exists('faq-01')).toBe(false);
    });
  });

  describe('findMany()', () => {
    test('should return paginated FAQ list', async () => {
      mockResolveValue = [{ count: '1' }];
      const res = await faqRepo.findMany({
        filters: { status: 'DRAFT' },
        pagination: { limit: 5, offset: 0 },
      });
      expect(res.total).toBe(1);
    });
  });

  describe('Constraint Mapping', () => {
    test('PG 23503 → ConstraintViolationRepositoryError', async () => {
      const pgErr = new Error('FK');
      (pgErr as any).code = '23503';
      mockResolveValue = pgErr;
      await expect(faqRepo.exists('id')).rejects.toThrow(ConstraintViolationRepositoryError);
    });

    test('PG 23514 → CheckConstraintViolationRepositoryError', async () => {
      const pgErr = new Error('Check');
      (pgErr as any).code = '23514';
      mockResolveValue = pgErr;
      await expect(faqRepo.exists('id')).rejects.toThrow(CheckConstraintViolationRepositoryError);
    });

    test('PG 40001 → TransactionConflictRepositoryError', async () => {
      const pgErr = new Error('Deadlock');
      (pgErr as any).code = '40001';
      mockResolveValue = pgErr;
      await expect(faqRepo.exists('id')).rejects.toThrow(TransactionConflictRepositoryError);
    });

    test('Unclassified → DatabaseOperationRepositoryError', async () => {
      mockResolveValue = new Error('Unknown');
      await expect(faqRepo.exists('id')).rejects.toThrow(DatabaseOperationRepositoryError);
    });
  });
});

describe('TopList Repository Layer', () => {
  let topListRepo: DrizzleTopListRepository;

  const sampleRawTopList = {
    id: 'list-01',
    title: 'Best Places',
    description: null,
    slug: 'best-places',
    category: 'tourism',
    featured: false,
    status: 'DRAFT' as const,
    createdBy: 'user-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleRawItem = {
    id: 'item-01',
    topListId: 'list-01',
    ownerType: 'PLACE' as const,
    ownerId: 'place-01',
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    topListRepo = new DrizzleTopListRepository();
    mockResolveValue = undefined;
    selectSpy.mockClear();
    insertSpy.mockClear();
    updateSpy.mockClear();
    deleteSpy.mockClear();
    returningSpy.mockClear();
  });

  describe('findById()', () => {
    test('should return rehydrated TopList aggregate', async () => {
      mockResolveValue = [sampleRawTopList];
      const result = await topListRepo.findById('list-01');
      expect(result?.id).toBe('list-01');
    });

    test('should return null if not found', async () => {
      mockResolveValue = [];
      expect(await topListRepo.findById('missing')).toBeNull();
    });
  });

  describe('create()', () => {
    test('should insert top list and items', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [sampleRawItem] });
      mockResolveValue = [sampleRawTopList];
      await topListRepo.create(topList);
      expect(insertSpy).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    test('should update list and sync items', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [sampleRawItem] });
      mockResolveValue = [sampleRawTopList];
      await topListRepo.update(topList);
      expect(updateSpy).toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalled();
    });

    test('should throw EntityNotFoundRepositoryError if list not found', async () => {
      const topList = TopList.rehydrate({ ...sampleRawTopList, items: [] });
      mockResolveValue = [];
      await expect(topListRepo.update(topList)).rejects.toThrow(EntityNotFoundRepositoryError);
    });
  });

  describe('delete()', () => {
    test('should soft delete top list', async () => {
      mockResolveValue = [sampleRawTopList];
      await topListRepo.delete('list-01');
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('exists()', () => {
    test('should return true when found', async () => {
      mockResolveValue = [{ count: 1 }];
      expect(await topListRepo.exists('list-01')).toBe(true);
    });
  });

  describe('findMany()', () => {
    test('should return paginated top lists with batch-loaded items', async () => {
      mockResolveValue = [{ count: '1' }];
      const res = await topListRepo.findMany({
        filters: { featured: true },
        pagination: { limit: 5, offset: 0 },
      });
      expect(res.total).toBe(1);
    });
  });
});
