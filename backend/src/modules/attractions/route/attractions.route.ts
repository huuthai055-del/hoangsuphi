import { Hono } from 'hono';
import { z } from 'zod';
import { AttractionsController } from './attractions.controller';
import { AttractionsService } from '../service/attractions.service';
import { DrizzleRegionsRepository } from '@/modules/regions/repository/regions.repository';
import { DrizzleAttractionsRepository } from '../repository/attractions.repository';
import {
  CreateAttractionSchema,
  UpdateAttractionSchema,
  ListAttractionsQuerySchema,
  AttractionNearbyQuerySchema,
  AttractionIdParamsSchema,
  AttractionSlugParamsSchema,
} from '../dto/attractions.dto';
import { validateBody, validateQuery, validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';

const attractionsRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const attractionsRepo = new DrizzleAttractionsRepository();
const service = new AttractionsService(regionsRepo, attractionsRepo);
const controller = new AttractionsController(service);

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

// GET /api/v1/attractions
attractionsRouter.get('/', validateQuery(ListAttractionsQuerySchema), controller.list);

// GET /api/v1/attractions/nearby
attractionsRouter.get(
  '/nearby',
  validateQuery(AttractionNearbyQuerySchema),
  controller.searchNearby
);

// GET /api/v1/attractions/slug/:slug
attractionsRouter.get(
  '/slug/:slug',
  validateParams(AttractionSlugParamsSchema),
  controller.getBySlug
);

// GET /api/v1/attractions/region/:regionId
attractionsRouter.get(
  '/region/:regionId',
  validateParams(z.object({ regionId: z.string().uuid('Region ID must be a valid UUID') })),
  validateQuery(ListAttractionsQuerySchema),
  controller.listByRegion
);

// GET /api/v1/attractions/:id
attractionsRouter.get('/:id', validateParams(AttractionIdParamsSchema), controller.getById);

// ==========================================
// ADMIN ROUTES
// ==========================================

attractionsRouter.post(
  '/',
  authGuard,
  requirePermission('attraction:write'),
  validateBody(CreateAttractionSchema),
  controller.create
);

attractionsRouter.patch(
  '/:id',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  validateBody(UpdateAttractionSchema),
  controller.update
);

attractionsRouter.delete(
  '/:id',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  controller.delete
);

attractionsRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  controller.activate
);

attractionsRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  controller.deactivate
);



export { attractionsRouter };
export type { AttractionsController };
export type { AttractionsService };
