import { describe, test, expect, mock, beforeEach } from 'bun:test';

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

// 'then' resolves mockResolveValue or rejects if it is an Error instance
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

// Mock database module
mock.module('@/lib/database/client', () => {
  return {
    db: {
      ...mockDbChain,
    },
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDbChain),
  };
});

import { DrizzleReviewsRepository, DrizzleFavoritesRepository } from './reviews.repository';
import { Review } from '../domain/reviews.entity';
import { Favorite } from '../domain/favorites.entity';
import {
  DuplicateKeyRepositoryError,
  ConstraintViolationRepositoryError,
  NotNullViolationRepositoryError,
  CheckConstraintViolationRepositoryError,
  TransactionConflictRepositoryError,
  DatabaseOperationRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';

describe('Reviews & Favorites Repositories', () => {
  let reviewsRepo: DrizzleReviewsRepository;
  let favoritesRepo: DrizzleFavoritesRepository;

  const sampleRawReview = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    userId: '019f4bc4-f550-7d52-bba4-3b6258b55702',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    rating: 5,
    title: 'Superb',
    content: 'Very good views.',
    status: 'PENDING' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleRawFavorite = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55710',
    userId: '019f4bc4-f550-7d52-bba4-3b6258b55702',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    createdAt: new Date(),
  };

  beforeEach(() => {
    reviewsRepo = new DrizzleReviewsRepository();
    favoritesRepo = new DrizzleFavoritesRepository();
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

  describe('DrizzleReviewsRepository', () => {
    test('should successfully save/create a review', async () => {
      const review = Review.rehydrate(sampleRawReview);
      mockResolveValue = [];
      await reviewsRepo.create(review);
      expect(insertSpy).toHaveBeenCalled();
    });

    test('should successfully update review', async () => {
      const review = Review.rehydrate(sampleRawReview);
      mockResolveValue = [{ id: review.id }];
      await reviewsRepo.update(review);
      expect(updateSpy).toHaveBeenCalled();
    });

    test('should throw EntityNotFoundRepositoryError on update if row not exists', async () => {
      const review = Review.rehydrate(sampleRawReview);
      mockResolveValue = [];
      await expect(reviewsRepo.update(review)).rejects.toThrow(EntityNotFoundRepositoryError);
    });

    test('should successfully find review by ID', async () => {
      mockResolveValue = [sampleRawReview];
      const result = await reviewsRepo.findById(sampleRawReview.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleRawReview.id);
    });

    test('should return null on findById if row not exists', async () => {
      mockResolveValue = [];
      const result = await reviewsRepo.findById('missing');
      expect(result).toBeNull();
    });

    test('should successfully delete review', async () => {
      mockResolveValue = [{ id: sampleRawReview.id }];
      await reviewsRepo.delete(sampleRawReview.id);
      expect(deleteSpy).toHaveBeenCalled();
    });

    test('should throw error on delete if row not exists', async () => {
      mockResolveValue = [];
      await expect(reviewsRepo.delete('missing')).rejects.toThrow(EntityNotFoundRepositoryError);
    });

    test('should check review existence correctly', async () => {
      mockResolveValue = [{ exists: 1 }];
      const exists = await reviewsRepo.exists(
        sampleRawReview.userId,
        sampleRawReview.ownerType,
        sampleRawReview.ownerId
      );
      expect(exists).toBe(true);
    });

    test('should count reviews correctly', async () => {
      mockResolveValue = [{ count: '12' }];
      const total = await reviewsRepo.count({ status: 'PENDING' });
      expect(total).toBe(12);
    });

    test('should calculate average rating correctly', async () => {
      mockResolveValue = [{ avg: '4.25' }];
      const avg = await reviewsRepo.averageRating(sampleRawReview.ownerType, sampleRawReview.ownerId);
      expect(avg).toBe(4.25);
    });

    test('should find reviews by user, owner and status shortcuts', async () => {
      mockResolveValue = [sampleRawReview];
      
      const userRes = await reviewsRepo.findByUser(sampleRawReview.userId, { limit: 5, offset: 0 });
      expect(userRes.length).toBe(1);

      const ownerRes = await reviewsRepo.findByOwner(sampleRawReview.ownerType, sampleRawReview.ownerId);
      expect(ownerRes.length).toBe(1);

      const approvedRes = await reviewsRepo.findApproved();
      expect(approvedRes.length).toBe(1);

      const pendingRes = await reviewsRepo.findPending();
      expect(pendingRes.length).toBe(1);
    });

    test('should findMany reviews with filters, sort (asc/desc) and search options', async () => {
      mockResolveValue = [sampleRawReview];
      
      const resAsc = await reviewsRepo.findMany({
        filters: {
          ownerType: 'PLACE',
          ownerId: 'owner-123',
          userId: 'user-123',
          status: 'APPROVED',
          rating: 5,
          createdAfter: new Date(),
          createdBefore: new Date(),
        },
        sort: { field: 'rating', order: 'asc' },
        search: 'cool % _ search',
      });
      expect(resAsc.length).toBe(1);

      const resDesc = await reviewsRepo.findMany({
        sort: { field: 'createdAt', order: 'desc' },
      });
      expect(resDesc.length).toBe(1);
    });

    test('should map CheckConstraintViolationRepositoryError on check violation code 23514', async () => {
      const dbError = new Error('check check');
      (dbError as any).code = '23514';
      (dbError as any).constraint = 'reviews_rating_check';
      mockResolveValue = dbError;

      const review = Review.rehydrate(sampleRawReview);
      await expect(reviewsRepo.create(review)).rejects.toThrow(CheckConstraintViolationRepositoryError);
    });

    test('should map other postgres errors appropriately', async () => {
      const errUnique = new Error(); (errUnique as any).code = '23505';
      const errFK = new Error(); (errFK as any).code = '23503';
      const errNotNull = new Error(); (errNotNull as any).code = '23502';
      const errTx = new Error(); (errTx as any).code = '40001';
      const errGeneral = new Error(); (errGeneral as any).code = '99999';

      mockResolveValue = errUnique;
      await expect(reviewsRepo.create(Review.rehydrate(sampleRawReview))).rejects.toThrow(DuplicateKeyRepositoryError);

      mockResolveValue = errFK;
      await expect(reviewsRepo.create(Review.rehydrate(sampleRawReview))).rejects.toThrow(ConstraintViolationRepositoryError);

      mockResolveValue = errNotNull;
      await expect(reviewsRepo.create(Review.rehydrate(sampleRawReview))).rejects.toThrow(NotNullViolationRepositoryError);

      mockResolveValue = errTx;
      await expect(reviewsRepo.create(Review.rehydrate(sampleRawReview))).rejects.toThrow(TransactionConflictRepositoryError);

      mockResolveValue = errGeneral;
      await expect(reviewsRepo.create(Review.rehydrate(sampleRawReview))).rejects.toThrow(DatabaseOperationRepositoryError);
    });

    test('should cover database catch blocks for reviews', async () => {
      mockResolveValue = new Error('DB Crash');

      await expect(reviewsRepo.exists('u', 'PLACE', 'o')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(reviewsRepo.findByUser('u')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(reviewsRepo.findByOwner('PLACE', 'o')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(reviewsRepo.averageRating('PLACE', 'o')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(reviewsRepo.findMany({})).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(reviewsRepo.count()).rejects.toThrow(DatabaseOperationRepositoryError);
    });
  });

  describe('DrizzleFavoritesRepository', () => {
    test('should successfully save/create a favorite', async () => {
      const fav = Favorite.rehydrate(sampleRawFavorite);
      mockResolveValue = [];
      await favoritesRepo.create(fav);
      expect(insertSpy).toHaveBeenCalled();
    });

    test('should successfully delete favorite', async () => {
      mockResolveValue = [{ id: sampleRawFavorite.id }];
      await favoritesRepo.delete(sampleRawFavorite.id);
      expect(deleteSpy).toHaveBeenCalled();
    });

    test('should throw error on delete if favorite does not exist', async () => {
      mockResolveValue = [];
      await expect(favoritesRepo.delete('missing')).rejects.toThrow(EntityNotFoundRepositoryError);
    });

    test('should check favorite existence correctly', async () => {
      mockResolveValue = [{ exists: 1 }];
      const exists = await favoritesRepo.exists(
        sampleRawFavorite.userId,
        sampleRawFavorite.ownerType,
        sampleRawFavorite.ownerId
      );
      expect(exists).toBe(true);
    });

    test('should find favorites by user, owner and filtering options', async () => {
      mockResolveValue = [sampleRawFavorite];
      
      const userRes = await favoritesRepo.findByUser(sampleRawFavorite.userId);
      expect(userRes.length).toBe(1);

      const ownerRes = await favoritesRepo.findByOwner(sampleRawFavorite.ownerType, sampleRawFavorite.ownerId);
      expect(ownerRes.length).toBe(1);

      const searchRes = await favoritesRepo.findMany({
        filters: {
          userId: sampleRawFavorite.userId,
          ownerType: sampleRawFavorite.ownerType,
          ownerId: sampleRawFavorite.ownerId,
        },
      });
      expect(searchRes.length).toBe(1);
    });

    test('should count favorites correctly', async () => {
      mockResolveValue = [{ count: '5' }];
      const total = await favoritesRepo.countByOwner(sampleRawFavorite.ownerType, sampleRawFavorite.ownerId);
      expect(total).toBe(5);
    });

    test('should cover database catch blocks for favorites', async () => {
      mockResolveValue = new Error('DB Crash');

      await expect(favoritesRepo.create(Favorite.rehydrate(sampleRawFavorite))).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(favoritesRepo.delete('id')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(favoritesRepo.exists('u', 'PLACE', 'o')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(favoritesRepo.findByUser('u')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(favoritesRepo.findByOwner('PLACE', 'o')).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(favoritesRepo.findMany({})).rejects.toThrow(DatabaseOperationRepositoryError);
      await expect(favoritesRepo.count()).rejects.toThrow(DatabaseOperationRepositoryError);
    });
  });
});
