import { Hono } from 'hono';
import { z } from 'zod';
import { PlacesController } from './places.controller';
import { PlacesService } from '../service/places.service';
import { DrizzleRegionsRepository } from '@/modules/regions/repository/regions.repository';
import { DrizzleTouristPlacesRepository } from '@/modules/regions/repository/places.repository';
import {
  CreatePlaceSchema,
  UpdatePlaceSchema,
  ListPlacesQuerySchema,
  PlaceNearbyQuerySchema,
  PlaceIdParamsSchema,
  PlaceSlugParamsSchema,
} from '../dto/places.dto';
import { validateBody, validateQuery, validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';

const placesRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const placesRepo = new DrizzleTouristPlacesRepository();
const placesService = new PlacesService(regionsRepo, placesRepo);
const controller = new PlacesController(placesService);

const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/v1/places
placesRouter.get('/', validateQuery(ListPlacesQuerySchema), controller.list);

// GET /api/v1/places/nearby
placesRouter.get('/nearby', validateQuery(PlaceNearbyQuerySchema), controller.searchNearby);

// GET /api/v1/places/slug/:slug
placesRouter.get('/slug/:slug', validateParams(PlaceSlugParamsSchema), controller.getBySlug);

// GET /api/v1/places/region/:regionId
placesRouter.get(
  '/region/:regionId',
  validateParams(z.object({ regionId: z.string().uuid('Region ID must be a valid UUID') })),
  validateQuery(ListPlacesQuerySchema),
  controller.listByRegion
);

// GET /api/v1/places/:id
placesRouter.get('/:id', validateParams(PlaceIdParamsSchema), controller.getById);

// ==========================================
// ADMIN ROUTES
// ==========================================

placesRouter.post(
  '/',
  authGuard,
  requirePermission('place:write'),
  validateBody(CreatePlaceSchema),
  controller.create
);

placesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  validateBody(UpdatePlaceSchema),
  controller.update
);

placesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  controller.delete
);

placesRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  controller.activate
);

placesRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  controller.deactivate
);



export { placesRouter };
export type { PlacesController };
export type { PlacesService };
