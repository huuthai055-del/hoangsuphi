import { Hono } from 'hono';
import { ReviewsController } from './reviews.controller';
import { FavoritesController } from './favorites.controller';
import { ReviewsService } from '@/modules/reviews/service/reviews.service';
import { FavoritesService } from '@/modules/reviews/service/favorites.service';
import { DrizzleReviewsRepository, DrizzleFavoritesRepository } from '@/modules/reviews/repository/reviews.repository';
import {
  ReviewIdParamsSchema,
  FavoriteIdParamsSchema,
  OwnerParamsSchema,
  UserIdParamsSchema,
  CreateReviewRequestSchema,
  UpdateReviewRequestSchema,
  CreateFavoriteRequestSchema,
  PaginationQuerySchema,
  SearchQuerySchema,
  ReviewFilterQuerySchema,
  FavoriteFilterQuerySchema,
} from '../dto/reviews.dto';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';

const reviewsRouter = new Hono();

// Lazy Instances
let reviewsService: ReviewsService | null = null;
let favoritesService: FavoritesService | null = null;
let reviewsController: ReviewsController | null = null;
let favoritesController: FavoritesController | null = null;

export function injectMockControllers(
  mockReviewsCtrl: ReviewsController,
  mockFavoritesCtrl: FavoritesController
) {
  reviewsController = mockReviewsCtrl;
  favoritesController = mockFavoritesCtrl;
}

function getReviewsController(): ReviewsController {
  if (!reviewsController) {
    const reviewsRepo = new DrizzleReviewsRepository();
    reviewsService = new ReviewsService(reviewsRepo);
    reviewsController = new ReviewsController(reviewsService);
  }
  return reviewsController;
}

function getFavoritesController(): FavoritesController {
  if (!favoritesController) {
    const favoritesRepo = new DrizzleFavoritesRepository();
    favoritesService = new FavoritesService(favoritesRepo);
    favoritesController = new FavoritesController(favoritesService);
  }
  return favoritesController;
}

// Authentication Guard dependencies
const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

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
