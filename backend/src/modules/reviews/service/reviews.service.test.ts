import { expect, test, describe, beforeEach, mock } from 'bun:test';
import { ReviewsService } from './reviews.service';
import { FavoritesService } from './favorites.service';
import type { IReviewsRepository, IFavoritesRepository } from '../repository/reviews-repository.interface';
import { Review } from '../domain/reviews.entity';
import { Favorite } from '../domain/favorites.entity';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} from '@/common/errors/http.errors';
import {
  DuplicateKeyRepositoryError,
  EntityNotFoundRepositoryError,
} from '@/common/errors/repository.errors';

describe('Reviews & Favorites Services', () => {
  // Reviews mock properties
  let reviewsRepo: IReviewsRepository;
  let reviewsService: ReviewsService;
  
  let mockReviewCreate: ReturnType<typeof mock>;
  let mockReviewUpdate: ReturnType<typeof mock>;
  let mockReviewDelete: ReturnType<typeof mock>;
  let mockReviewFindById: ReturnType<typeof mock>;
  let mockReviewExists: ReturnType<typeof mock>;
  let mockReviewFindByUser: ReturnType<typeof mock>;
  let mockReviewFindByOwner: ReturnType<typeof mock>;
  let mockReviewAverageRating: ReturnType<typeof mock>;
  let mockReviewFindMany: ReturnType<typeof mock>;
  let mockReviewCount: ReturnType<typeof mock>;

  // Favorites mock properties
  let favoritesRepo: IFavoritesRepository;
  let favoritesService: FavoritesService;

  let mockFavoriteCreate: ReturnType<typeof mock>;
  let mockFavoriteDelete: ReturnType<typeof mock>;
  let mockFavoriteExists: ReturnType<typeof mock>;
  let mockFavoriteFindByUser: ReturnType<typeof mock>;
  let mockFavoriteFindByOwner: ReturnType<typeof mock>;
  let mockFavoriteFindMany: ReturnType<typeof mock>;
  let mockFavoriteCount: ReturnType<typeof mock>;

  const sampleReviewProps = {
    userId: 'user-01',
    ownerType: 'PLACE' as const,
    ownerId: 'place-01',
    rating: 5,
    title: 'Very Cool Place',
    content: 'Had a wonderful time there. Highly recommend.',
  };

  const sampleFavoriteProps = {
    userId: 'user-01',
    ownerType: 'ARTICLE' as const,
    ownerId: 'article-01',
  };

  const generateTestReview = (status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') => {
    return Review.rehydrate({
      id: 'rev-01',
      userId: 'user-01',
      ownerType: 'PLACE',
      ownerId: 'place-01',
      rating: 4,
      title: 'Original Title',
      content: 'Original Content details',
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  };

  beforeEach(() => {
    // 1. Setup Reviews Repository mocks
    mockReviewCreate = mock(() => Promise.resolve());
    mockReviewUpdate = mock(() => Promise.resolve());
    mockReviewDelete = mock(() => Promise.resolve());
    mockReviewFindById = mock(() => Promise.resolve(null));
    mockReviewExists = mock(() => Promise.resolve(false));
    mockReviewFindByUser = mock(() => Promise.resolve([]));
    mockReviewFindByOwner = mock(() => Promise.resolve([]));
    mockReviewAverageRating = mock(() => Promise.resolve(4.5));
    mockReviewFindMany = mock(() => Promise.resolve([]));
    mockReviewCount = mock(() => Promise.resolve(0));

    reviewsRepo = {
      create: mockReviewCreate,
      update: mockReviewUpdate,
      delete: mockReviewDelete,
      findById: mockReviewFindById,
      exists: mockReviewExists,
      findByUser: mockReviewFindByUser,
      findByOwner: mockReviewFindByOwner,
      findApproved: mock(() => Promise.resolve([])),
      findPending: mock(() => Promise.resolve([])),
      countByOwner: mock(() => Promise.resolve(0)),
      averageRating: mockReviewAverageRating,
      findMany: mockReviewFindMany,
      count: mockReviewCount,
    };

    reviewsService = new ReviewsService(reviewsRepo);

    // 2. Setup Favorites Repository mocks
    mockFavoriteCreate = mock(() => Promise.resolve());
    mockFavoriteDelete = mock(() => Promise.resolve());
    mockFavoriteExists = mock(() => Promise.resolve(false));
    mockFavoriteFindByUser = mock(() => Promise.resolve([]));
    mockFavoriteFindByOwner = mock(() => Promise.resolve([]));
    mockFavoriteFindMany = mock(() => Promise.resolve([]));
    mockFavoriteCount = mock(() => Promise.resolve(0));

    favoritesRepo = {
      create: mockFavoriteCreate,
      delete: mockFavoriteDelete,
      exists: mockFavoriteExists,
      findByUser: mockFavoriteFindByUser,
      findByOwner: mockFavoriteFindByOwner,
      countByOwner: mock(() => Promise.resolve(0)),
      findMany: mockFavoriteFindMany,
      count: mockFavoriteCount,
    };

    favoritesService = new FavoritesService(favoritesRepo);
  });

  describe('ReviewsService', () => {
    describe('createReview', () => {
      test('should successfully create review and persist to repository', async () => {
        const review = await reviewsService.createReview(sampleReviewProps);
        expect(review).toBeDefined();
        expect(review.rating).toBe(5);
        expect(mockReviewCreate).toHaveBeenCalled();
      });

      test('should throw ValidationError if ownerType is invalid', async () => {
        await expect(
          reviewsService.createReview({ ...sampleReviewProps, ownerType: 'INVALID' as any })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError if ownerId is empty', async () => {
        await expect(
          reviewsService.createReview({ ...sampleReviewProps, ownerId: '   ' })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError if rating is out of bounds', async () => {
        await expect(
          reviewsService.createReview({ ...sampleReviewProps, rating: 6 })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw ConflictError if duplicate review already exists', async () => {
        mockReviewExists.mockImplementation(() => Promise.resolve(true));
        await expect(
          reviewsService.createReview(sampleReviewProps)
        ).rejects.toThrow(ConflictError);
      });

      test('should map DuplicateKeyRepositoryError to ConflictError', async () => {
        mockReviewCreate.mockImplementation(() => Promise.reject(new DuplicateKeyRepositoryError('Duplicate key')));
        await expect(
          reviewsService.createReview(sampleReviewProps)
        ).rejects.toThrow(ConflictError);
      });
    });

    describe('updateReview', () => {
      test('should update review when status is PENDING', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        
        const updated = await reviewsService.updateReview('rev-01', { id: 'user-01', roles: [] }, {
          title: 'New Title',
          content: 'New content is long enough.',
          rating: 2,
        });

        expect(updated.title).toBe('New Title');
        expect(updated.rating).toBe(2);
        expect(mockReviewUpdate).toHaveBeenCalled();
      });

      test('should throw ValidationError if review status is not PENDING', async () => {
        const approvedReview = generateTestReview('APPROVED');
        mockReviewFindById.mockImplementation(() => Promise.resolve(approvedReview));

        await expect(
          reviewsService.updateReview('rev-01', { id: 'user-01', roles: [] }, {
            title: 'New Title',
            content: 'New content.',
            rating: 3,
          })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw NotFoundError if review does not exist', async () => {
        await expect(
          reviewsService.updateReview('rev-missing', { id: 'user-01', roles: [] }, {
            title: 'New',
            content: 'New',
            rating: 3,
          })
        ).rejects.toThrow(NotFoundError);
      });

      test('should map EntityNotFoundRepositoryError on update failure', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        mockReviewUpdate.mockImplementation(() => Promise.reject(new EntityNotFoundRepositoryError('Not found')));

        await expect(
          reviewsService.updateReview('rev-01', { id: 'user-01', roles: [] }, {
            title: 'New',
            content: 'New',
            rating: 3,
          })
        ).rejects.toThrow(NotFoundError);
      });

      test('should wrap ReviewDomainError into ValidationError', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        
        await expect(
          reviewsService.updateReview('rev-01', { id: 'user-01', roles: [] }, {
            title: 'New',
            content: 'New',
            rating: 99,
          })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw AuthorizationError if caller is not the owner or admin', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));

        await expect(
          reviewsService.updateReview('rev-01', { id: 'user-hacker', roles: [] }, {
            title: 'Hacked Title',
            content: 'Attempted hack content here.',
            rating: 1,
          })
        ).rejects.toThrow(AuthorizationError);
      });
    });

    describe('State Transition (Approve & Reject & Delete)', () => {
      test('should approve review successfully', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        
        const approved = await reviewsService.approveReview('rev-01');
        expect(approved.status).toBe('APPROVED');
        expect(mockReviewUpdate).toHaveBeenCalled();
      });

      test('should reject review successfully', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        
        const rejected = await reviewsService.rejectReview('rev-01');
        expect(rejected.status).toBe('REJECTED');
        expect(mockReviewUpdate).toHaveBeenCalled();
      });

      test('should throw ValidationError if transition is invalid', async () => {
        const rejectedReview = generateTestReview('REJECTED');
        mockReviewFindById.mockImplementation(() => Promise.resolve(rejectedReview));

        await expect(
          reviewsService.approveReview('rev-01')
        ).rejects.toThrow(ValidationError);
      });

      test('should soft delete review successfully', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        
        await reviewsService.deleteReview('rev-01', { id: 'user-01', roles: [] });
        expect(activeReview.deletedAt).toBeDefined();
        expect(mockReviewUpdate).toHaveBeenCalled();
      });

      test('should throw AuthorizationError on delete if caller is not the owner or admin', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));

        await expect(
          reviewsService.deleteReview('rev-01', { id: 'user-hacker', roles: [] })
        ).rejects.toThrow(AuthorizationError);
      });

      test('should throw NotFoundError if state transition target not found', async () => {
        await expect(reviewsService.approveReview('missing')).rejects.toThrow(NotFoundError);
        await expect(reviewsService.rejectReview('missing')).rejects.toThrow(NotFoundError);
        await expect(reviewsService.deleteReview('missing', { id: 'user-01', roles: [] })).rejects.toThrow(NotFoundError);
      });
    });

    describe('Retrievals & Calculations', () => {
      test('should get review by ID', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindById.mockImplementation(() => Promise.resolve(activeReview));
        
        const review = await reviewsService.getReview('rev-01');
        expect(review.id).toBe('rev-01');
      });

      test('should throw NotFoundError if getting missing review', async () => {
        await expect(reviewsService.getReview('missing')).rejects.toThrow(NotFoundError);
      });

      test('should list reviews via findMany', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindMany.mockImplementation(() => Promise.resolve([activeReview]));
        mockReviewCount.mockImplementation(() => Promise.resolve(1));
        
        const result = await reviewsService.listReviews({ filters: { status: 'PENDING' } });
        expect(result.items.length).toBe(1);
        expect(result.total).toBe(1);
      });

      test('should list reviews by owner', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindByOwner.mockImplementation(() => Promise.resolve([activeReview]));
        const ownerList = await reviewsService.listReviewsByOwner('PLACE', 'place-01');
        expect(ownerList.length).toBe(1);
      });

      test('should allow listing reviews by user for the owner themselves', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindByUser.mockImplementation(() => Promise.resolve([activeReview]));
        const userList = await reviewsService.listReviewsByUser('user-01', { id: 'user-01', roles: [] });
        expect(userList.length).toBe(1);
      });

      test('should allow listing reviews by user for an admin', async () => {
        const activeReview = generateTestReview('PENDING');
        mockReviewFindByUser.mockImplementation(() => Promise.resolve([activeReview]));
        const userList = await reviewsService.listReviewsByUser('user-01', { id: 'admin-01', roles: ['admin'] });
        expect(userList.length).toBe(1);
      });

      test('should throw AuthorizationError when listing reviews by user for a non-owner non-admin caller', async () => {
        await expect(
          reviewsService.listReviewsByUser('user-01', { id: 'user-hacker', roles: [] })
        ).rejects.toThrow(AuthorizationError);
      });

      test('should calculate average rating correctly', async () => {
        const avg = await reviewsService.calculateAverageRating('PLACE', 'place-01');
        expect(avg).toBe(4.5);
      });
    });
  });

  describe('FavoritesService', () => {
    const activeFav = Favorite.rehydrate({
      id: 'fav-01',
      userId: 'user-01',
      ownerType: 'ARTICLE',
      ownerId: 'article-01',
      createdAt: new Date(),
    });

    describe('addFavorite', () => {
      test('should successfully add new favorite', async () => {
        mockFavoriteFindMany.mockImplementation(() => Promise.resolve([]));
        const fav = await favoritesService.addFavorite(sampleFavoriteProps);
        expect(fav).toBeDefined();
        expect(mockFavoriteCreate).toHaveBeenCalled();
      });

      test('should throw ValidationError for invalid ownerType or empty ownerId', async () => {
        await expect(
          favoritesService.addFavorite({ ...sampleFavoriteProps, ownerType: 'INVALID' as any })
        ).rejects.toThrow(ValidationError);

        await expect(
          favoritesService.addFavorite({ ...sampleFavoriteProps, ownerId: '   ' })
        ).rejects.toThrow(ValidationError);
      });

      test('should return existing favorite (idempotent bypass) if already exists', async () => {
        mockFavoriteFindMany.mockImplementation(() => Promise.resolve([activeFav]));
        const result = await favoritesService.addFavorite(sampleFavoriteProps);
        expect(result).toBe(activeFav);
        expect(mockFavoriteCreate).not.toHaveBeenCalled();
      });
    });

    describe('removeFavorite', () => {
      test('should successfully delete favorite if exists', async () => {
        mockFavoriteFindMany.mockImplementation(() => Promise.resolve([activeFav]));
        await favoritesService.removeFavorite('user-01', 'ARTICLE', 'article-01');
        expect(mockFavoriteDelete.mock.calls[0][0]).toBe('fav-01');
      });

      test('should do nothing and bypass (idempotent) if not exists', async () => {
        mockFavoriteFindMany.mockImplementation(() => Promise.resolve([]));
        await favoritesService.removeFavorite('user-01', 'ARTICLE', 'article-01');
        expect(mockFavoriteDelete).not.toHaveBeenCalled();
      });
    });

    describe('Check, List and Count', () => {
      test('should check favorite existence correctly', async () => {
        mockFavoriteExists.mockImplementation(() => Promise.resolve(true));
        const res = await favoritesService.checkFavorite('user-01', 'ARTICLE', 'article-01');
        expect(res).toBe(true);
      });

      test('should list favorites', async () => {
        mockFavoriteFindMany.mockImplementation(() => Promise.resolve([activeFav]));
        const list = await favoritesService.listFavorites({ filters: { userId: 'user-01' } });
        expect(list.length).toBe(1);
      });

      test('should count favorites correctly', async () => {
        mockFavoriteCount.mockImplementation(() => Promise.resolve(3));
        const count = await favoritesService.countFavorites({ ownerType: 'ARTICLE', ownerId: 'article-01' });
        expect(count).toBe(3);
      });
    });
  });
});
