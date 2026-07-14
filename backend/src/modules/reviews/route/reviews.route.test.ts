import { expect, test, describe, beforeEach, mock } from 'bun:test';
import type { Hono } from 'hono';
import { Review } from '../domain/reviews.entity';
import { Favorite } from '../domain/favorites.entity';
import { ReviewsController } from './reviews.controller';
import { FavoritesController } from './favorites.controller';
import { AuthorizationError } from '@/common/errors/http.errors';

describe('Reviews & Favorites API Routing & Controller', () => {
  let app: Hono;

  const sampleReviewData = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    userId: '00000000-0000-0000-0000-000000000001',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    rating: 5,
    title: 'Gorgeous mountains',
    content: 'The fields are spectacular in autumn!',
    status: 'PENDING' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleFavoriteData = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55710',
    userId: '00000000-0000-0000-0000-000000000001',
    ownerType: 'PLACE' as const,
    ownerId: '019f4bc4-f550-7d52-bba4-3b6258b55703',
    createdAt: new Date(),
  };

  // Mock Spies for Reviews Service
  const mockCreateReview = mock(() => Promise.resolve({} as any));
  const mockUpdateReview = mock(async (id: string, caller: any, props: any) => {
    const review = await mockGetReview();
    if (review && review.userId !== caller.id && !caller.roles?.includes('admin')) {
      return Promise.reject(new AuthorizationError('You do not have permission to access this review'));
    }
    return Promise.resolve({
      ...sampleReviewData,
      title: props.title ?? sampleReviewData.title,
      rating: props.rating ?? sampleReviewData.rating,
    } as any);
  });
  const mockDeleteReview = mock(async (id: string, caller: any) => {
    const review = await mockGetReview();
    if (review && review.userId !== caller.id && !caller.roles?.includes('admin')) {
      return Promise.reject(new AuthorizationError('You do not have permission to access this review'));
    }
    return Promise.resolve();
  });
  const mockGetReview = mock(() => Promise.resolve(Review.rehydrate(sampleReviewData)));
  const mockApproveReview = mock(() => Promise.resolve({} as any));
  const mockRejectReview = mock(() => Promise.resolve({} as any));
  const mockListReviews = mock(() => Promise.resolve([]));
  const mockListReviewsByOwner = mock(() => Promise.resolve([]));
  const mockListReviewsByUser = mock(async (userId: string, caller: any, _pagination?: any) => {
    if (userId !== caller?.id && !caller?.roles?.includes('admin')) {
      return Promise.reject(new AuthorizationError('You do not have permission to access these reviews'));
    }
    return Promise.resolve([Review.rehydrate(sampleReviewData)]);
  });

  // Mock Spies for Favorites Service
  const mockAddFavorite = mock(() => Promise.resolve({} as any));
  const mockRemoveFavoriteById = mock(() => Promise.resolve());
  const mockListFavorites = mock(() => Promise.resolve([]));
  const mockCountFavorites = mock(() => Promise.resolve(0));

  const mockReviewsService = {
    createReview: mockCreateReview,
    updateReview: mockUpdateReview,
    deleteReview: mockDeleteReview,
    getReview: mockGetReview,
    approveReview: mockApproveReview,
    rejectReview: mockRejectReview,
    listReviews: mockListReviews,
    listReviewsByOwner: mockListReviewsByOwner,
    listReviewsByUser: mockListReviewsByUser,
  };

  const mockFavoritesService = {
    addFavorite: mockAddFavorite,
    removeFavoriteById: mockRemoveFavoriteById,
    listFavorites: mockListFavorites,
    countFavorites: mockCountFavorites,
  };

  const mockReviewsController = new ReviewsController(mockReviewsService as any);
  const mockFavoritesController = new FavoritesController(mockFavoritesService as any);

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();

    // Inject mock controllers to route
    const { injectMockControllers } = await import('./reviews.route');
    injectMockControllers(mockReviewsController, mockFavoritesController);

    const { createApp } = await import('../../../app');
    app = createApp();

    // Reset Reviews service mock implementations and clear spies
    mockCreateReview.mockClear();
    mockCreateReview.mockImplementation(() => Promise.resolve({} as any));

    mockUpdateReview.mockClear();
    mockUpdateReview.mockImplementation(async (id: string, caller: any, props: any) => {
      const review = await mockGetReview();
      if (review && review.userId !== caller.id && !caller.roles?.includes('admin')) {
        return Promise.reject(new AuthorizationError('You do not have permission to access this review'));
      }
      return Promise.resolve({
        ...sampleReviewData,
        title: props.title ?? sampleReviewData.title,
        rating: props.rating ?? sampleReviewData.rating,
      } as any);
    });

    mockDeleteReview.mockClear();
    mockDeleteReview.mockImplementation(async (id: string, caller: any) => {
      const review = await mockGetReview();
      if (review && review.userId !== caller.id && !caller.roles?.includes('admin')) {
        return Promise.reject(new AuthorizationError('You do not have permission to access this review'));
      }
      return Promise.resolve();
    });

    mockGetReview.mockClear();
    mockGetReview.mockImplementation(() => Promise.resolve(Review.rehydrate(sampleReviewData)));

    mockApproveReview.mockClear();
    mockApproveReview.mockImplementation(() => Promise.resolve({} as any));

    mockRejectReview.mockClear();
    mockRejectReview.mockImplementation(() => Promise.resolve({} as any));

    mockListReviews.mockClear();
    mockListReviews.mockImplementation(() => Promise.resolve([]));

    mockListReviewsByOwner.mockClear();
    mockListReviewsByOwner.mockImplementation(() => Promise.resolve([]));

    mockListReviewsByUser.mockClear();
    mockListReviewsByUser.mockImplementation(async (userId: string, caller: any, _pagination?: any) => {
      if (userId !== caller?.id && !caller?.roles?.includes('admin')) {
        return Promise.reject(new AuthorizationError('You do not have permission to access these reviews'));
      }
      return Promise.resolve([Review.rehydrate(sampleReviewData)]);
    });

    // Reset Favorites service spies
    mockAddFavorite.mockClear();
    mockAddFavorite.mockImplementation(() => Promise.resolve({} as any));

    mockRemoveFavoriteById.mockClear();
    mockRemoveFavoriteById.mockImplementation(() => Promise.resolve());

    mockListFavorites.mockClear();
    mockListFavorites.mockImplementation(() => Promise.resolve([]));

    mockCountFavorites.mockClear();
    mockCountFavorites.mockImplementation(() => Promise.resolve(0));
  });

  describe('Reviews Route integrations', () => {
    test('POST /api/v1/reviews - Create Success', async () => {
      const review = Review.rehydrate(sampleReviewData);
      mockCreateReview.mockImplementation(() => Promise.resolve(review));

      const res = await app.request('/api/v1/reviews', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerType: 'PLACE',
          ownerId: sampleReviewData.ownerId,
          rating: 5,
          title: 'Gorgeous mountains',
          content: 'The fields are spectacular in autumn!',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(review.id);
      expect(json.rating).toBe(5);
    });

    test('POST /api/v1/reviews - Validation schema empty fields check 400', async () => {
      const res = await app.request('/api/v1/reviews', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerType: 'PLACE',
          ownerId: 'invalid-uuid',
          rating: 99,
          title: '',
          content: '',
        }),
      });

      const body = await res.json().catch(() => null);
      expect(res.status).toBe(400);
      expect(body?.code).toBe('VAL_001');
    });

    test('PATCH /api/v1/reviews/:id - Update Pending Review success', async () => {
      const review = Review.rehydrate({ ...sampleReviewData, title: 'Updated title', rating: 3 });
      mockUpdateReview.mockImplementation(() => Promise.resolve(review));

      const res = await app.request(`/api/v1/reviews/${review.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated title',
          rating: 3,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe('Updated title');
      expect(json.rating).toBe(3);
    });

    test('PATCH /api/v1/reviews/:id - Reject update if not owner', async () => {
      // Rehydrate a review owned by a different user
      const review = Review.rehydrate({ ...sampleReviewData, userId: '00000000-0000-0000-0000-999999999999' });
      mockGetReview.mockImplementation(() => Promise.resolve(review));

      const res = await app.request(`/api/v1/reviews/${review.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Attempted hack',
          rating: 1,
        }),
      });

      expect(res.status).toBe(403);
    });

    test('POST /api/v1/reviews/:id/approve & reject - Transition flows', async () => {
      const review = Review.rehydrate(sampleReviewData);
      mockApproveReview.mockImplementation(() => Promise.resolve(review));
      mockRejectReview.mockImplementation(() => Promise.resolve(review));

      const resApprove = await app.request(`/api/v1/reviews/${review.id}/approve`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(resApprove.status).toBe(200);

      const resReject = await app.request(`/api/v1/reviews/${review.id}/reject`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(resReject.status).toBe(200);
    });

    test('DELETE /api/v1/reviews/:id - Soft delete flow', async () => {
      const res = await app.request(`/api/v1/reviews/${sampleReviewData.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(204);
      expect(mockDeleteReview.mock.calls[0][0]).toBe(sampleReviewData.id);
      expect(mockDeleteReview.mock.calls[0][1].id).toBe('00000000-0000-0000-0000-000000000001');
    });

    test('DELETE /api/v1/reviews/:id - Reject delete if not owner', async () => {
      // Rehydrate a review owned by a different user
      const review = Review.rehydrate({ ...sampleReviewData, userId: '00000000-0000-0000-0000-999999999999' });
      mockGetReview.mockImplementation(() => Promise.resolve(review));

      const res = await app.request(`/api/v1/reviews/${review.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(403);
    });

    test('GET /api/v1/owners/:ownerType/:ownerId/reviews - Public fetch success', async () => {
      mockListReviewsByOwner.mockImplementation(() => Promise.resolve([Review.rehydrate(sampleReviewData)]));

      const res = await app.request(`/api/v1/owners/PLACE/${sampleReviewData.ownerId}/reviews?limit=5&offset=0`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(1);
    });

    test('GET /api/v1/users/:userId/reviews - Authenticated list success for own history', async () => {
      const res = await app.request(`/api/v1/users/${sampleReviewData.userId}/reviews`, {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(1);
    });

    test('GET /api/v1/users/:userId/reviews - Reject list for other users history', async () => {
      const res = await app.request('/api/v1/users/00000000-0000-0000-0000-999999999999/reviews', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('Favorites Route integrations', () => {
    test('POST /api/v1/favorites - Add Favorite success', async () => {
      const fav = Favorite.rehydrate(sampleFavoriteData);
      mockAddFavorite.mockImplementation(() => Promise.resolve(fav));

      const res = await app.request('/api/v1/favorites', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerType: 'PLACE',
          ownerId: sampleFavoriteData.ownerId,
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(fav.id);
    });

    test('DELETE /api/v1/favorites/:id - Remove Favorite success', async () => {
      mockRemoveFavoriteById.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/favorites/${sampleFavoriteData.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(204);
      expect(mockRemoveFavoriteById).toHaveBeenCalled();
    });

    test('GET /api/v1/owners/:ownerType/:ownerId/favorites/count - Public fetch count', async () => {
      mockCountFavorites.mockImplementation(() => Promise.resolve(25));

      const res = await app.request(`/api/v1/owners/PLACE/${sampleFavoriteData.ownerId}/favorites/count`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.count).toBe(25);
    });

    test('GET /api/v1/users/:userId/favorites - List user favorites success', async () => {
      mockListFavorites.mockImplementation(() => Promise.resolve([Favorite.rehydrate(sampleFavoriteData)]));

      const res = await app.request(`/api/v1/users/${sampleFavoriteData.userId}/favorites`, {
        headers: { Authorization: 'Bearer valid-token' },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(1);
    });
  });
});
