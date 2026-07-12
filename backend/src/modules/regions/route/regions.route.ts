import { Hono } from 'hono';
import { RegionsController } from './regions.controller';
import { RegionsService } from '../service/regions.service';
import { DrizzleRegionsRepository } from '@/modules/regions/repository/regions.repository';
import { DrizzleTouristPlacesRepository } from '@/modules/regions/repository/places.repository';
import {
  CreateRegionSchema,
  UpdateRegionSchema,
  ListRegionsQuerySchema,
  RegionIdParamsSchema,
  RegionSlugParamsSchema,
} from '../dto/regions.dto';
import { validateBody, validateQuery, validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';

const regionsRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const placesRepo = new DrizzleTouristPlacesRepository();
const regionsService = new RegionsService(regionsRepo, placesRepo);
const controller = new RegionsController(regionsService);

const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

// Public routes
regionsRouter.get('/', validateQuery(ListRegionsQuerySchema), controller.list);

regionsRouter.get('/:id', validateParams(RegionIdParamsSchema), controller.getById);

regionsRouter.get('/slug/:slug', validateParams(RegionSlugParamsSchema), controller.getBySlug);

// Admin routes
regionsRouter.post(
  '/',
  authGuard,
  requirePermission('system:write'),
  validateBody(CreateRegionSchema),
  controller.create
);

regionsRouter.patch(
  '/:id',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  validateBody(UpdateRegionSchema),
  controller.update
);

regionsRouter.delete(
  '/:id',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  controller.delete
);

regionsRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  controller.activate
);

regionsRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  controller.deactivate
);



export { regionsRouter };
export type { RegionsController };
export type { RegionsService };
