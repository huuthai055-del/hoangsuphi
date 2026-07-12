import { Hono } from 'hono';
import { z } from 'zod';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from '../service/businesses.service';
import { DrizzleRegionsRepository } from '@/modules/regions/repository/regions.repository';
import { DrizzleBusinessesRepository } from '../repository/businesses.repository';
import {
  CreateBusinessSchema,
  UpdateBusinessSchema,
  ListBusinessesQuerySchema,
  BusinessNearbyQuerySchema,
  BusinessIdParamsSchema,
  BusinessSlugParamsSchema,
} from '../dto/businesses.dto';
import { validateBody, validateQuery, validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';

const businessesRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const businessesRepo = new DrizzleBusinessesRepository();
const service = new BusinessesService(regionsRepo, businessesRepo);
const controller = new BusinessesController(service);

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

// GET /api/v1/businesses
businessesRouter.get('/', validateQuery(ListBusinessesQuerySchema), controller.list);

// GET /api/v1/businesses/nearby
businessesRouter.get('/nearby', validateQuery(BusinessNearbyQuerySchema), controller.searchNearby);

// GET /api/v1/businesses/slug/:slug
businessesRouter.get('/slug/:slug', validateParams(BusinessSlugParamsSchema), controller.getBySlug);

// GET /api/v1/businesses/region/:regionId
businessesRouter.get(
  '/region/:regionId',
  validateParams(z.object({ regionId: z.string().uuid('Region ID must be a valid UUID') })),
  validateQuery(ListBusinessesQuerySchema),
  controller.listByRegion
);

// GET /api/v1/businesses/:id
businessesRouter.get('/:id', validateParams(BusinessIdParamsSchema), controller.getById);

// ==========================================
// ADMIN ROUTES
// ==========================================

businessesRouter.post(
  '/',
  authGuard,
  requirePermission('business:write'),
  validateBody(CreateBusinessSchema),
  controller.create
);

businessesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  validateBody(UpdateBusinessSchema),
  controller.update
);

businessesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  controller.delete
);

businessesRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  controller.activate
);

businessesRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  controller.deactivate
);



export { businessesRouter };
export type { BusinessesController };
export type { BusinessesService };
