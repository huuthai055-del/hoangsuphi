import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import {
  CreateFavoriteRequestSchema,
  CreateReviewRequestSchema,
  FavoriteFilterQuerySchema,
  FavoriteIdParamsSchema,
  OwnerParamsSchema,
  PaginationQuerySchema,
  ReviewFilterQuerySchema,
  ReviewIdParamsSchema,
  SearchQuerySchema,
  UpdateReviewRequestSchema,
  UserIdParamsSchema,
} from '../dto/reviews.dto';
import type { FavoritesController } from './favorites.controller';
import type { ReviewsController } from './reviews.controller';

const reviewsRouter = new Hono();

export function injectMockControllers(
  mockReviewsCtrl: ReviewsController,
  mockFavoritesCtrl: FavoritesController
) {
  container.register('ReviewsController', mockReviewsCtrl);
  container.register('FavoritesController', mockFavoritesCtrl);
}

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getReviewsController = (): ReviewsController =>
  container.resolve<ReviewsController>('ReviewsController');
const getFavoritesController = (): FavoritesController =>
  container.resolve<FavoritesController>('FavoritesController');

// -----------------------------------------------------------------------------
// Reviews Routes
// -----------------------------------------------------------------------------

reviewsRouter.post(
  '/reviews',
  authGuard,
  requirePermission('review:create'),
  validateBody(CreateReviewRequestSchema),
  (c) => getReviewsController().create(c)
);

reviewsRouter.get(
  '/reviews',
  authGuard,
  requirePermission('review:read'),
  validateQuery(ReviewFilterQuerySchema),
  validateQuery(PaginationQuerySchema),
  validateQuery(SearchQuerySchema),
  (c) => getReviewsController().list(c)
);

reviewsRouter.get(
  '/reviews/:id',
  authGuard,
  requirePermission('review:read'),
  validateParams(ReviewIdParamsSchema),
  (c) => getReviewsController().getById(c)
);

reviewsRouter.patch(
  '/reviews/:id',
  authGuard,
  requirePermission('review:update'),
  validateParams(ReviewIdParamsSchema),
  validateBody(UpdateReviewRequestSchema),
  (c) => getReviewsController().update(c)
);

reviewsRouter.delete(
  '/reviews/:id',
  authGuard,
  requirePermission('review:delete'),
  validateParams(ReviewIdParamsSchema),
  (c) => getReviewsController().delete(c)
);

reviewsRouter.post(
  '/reviews/:id/approve',
  authGuard,
  requirePermission('review:approve'),
  validateParams(ReviewIdParamsSchema),
  (c) => getReviewsController().approve(c)
);

reviewsRouter.post(
  '/reviews/:id/reject',
  authGuard,
  requirePermission('review:reject'),
  validateParams(ReviewIdParamsSchema),
  (c) => getReviewsController().reject(c)
);

reviewsRouter.get(
  '/owners/:ownerType/:ownerId/reviews',
  validateParams(OwnerParamsSchema),
  validateQuery(PaginationQuerySchema),
  (c) => getReviewsController().listByOwner(c)
);

reviewsRouter.get(
  '/users/:userId/reviews',
  authGuard,
  requirePermission('review:read'),
  validateParams(UserIdParamsSchema),
  validateQuery(PaginationQuerySchema),
  (c) => getReviewsController().listByUser(c)
);

// -----------------------------------------------------------------------------
// Favorites Routes
// -----------------------------------------------------------------------------

reviewsRouter.post(
  '/favorites',
  authGuard,
  requirePermission('favorite:create'),
  validateBody(CreateFavoriteRequestSchema),
  (c) => getFavoritesController().create(c)
);

reviewsRouter.delete(
  '/favorites/:id',
  authGuard,
  requirePermission('favorite:delete'),
  validateParams(FavoriteIdParamsSchema),
  (c) => getFavoritesController().delete(c)
);

reviewsRouter.get(
  '/favorites',
  authGuard,
  requirePermission('favorite:read'),
  validateQuery(FavoriteFilterQuerySchema),
  validateQuery(PaginationQuerySchema),
  (c) => getFavoritesController().list(c)
);

reviewsRouter.get(
  '/owners/:ownerType/:ownerId/favorites/count',
  validateParams(OwnerParamsSchema),
  (c) => getFavoritesController().countByOwner(c)
);

reviewsRouter.get(
  '/users/:userId/favorites',
  authGuard,
  requirePermission('favorite:read'),
  validateParams(UserIdParamsSchema),
  validateQuery(PaginationQuerySchema),
  (c) => getFavoritesController().listByUser(c)
);

export { reviewsRouter };
export type { ReviewsController };
export type { FavoritesController };
