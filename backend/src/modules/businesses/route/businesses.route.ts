import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';
import {
  BusinessIdParamsSchema,
  BusinessNearbyQuerySchema,
  BusinessSlugParamsSchema,
  CreateBusinessSchema,
  ListBusinessesQuerySchema,
  UpdateBusinessSchema,
} from '../dto/businesses.dto';
import type { BusinessesController } from './businesses.controller';

const businessesRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): BusinessesController =>
  container.resolve<BusinessesController>('BusinessesController');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/v1/businesses
businessesRouter.get('/', validateQuery(ListBusinessesQuerySchema), (c) => getController().list(c));

// GET /api/v1/businesses/nearby
businessesRouter.get('/nearby', validateQuery(BusinessNearbyQuerySchema), (c) =>
  getController().searchNearby(c)
);

// GET /api/v1/businesses/slug/:slug
businessesRouter.get('/slug/:slug', validateParams(BusinessSlugParamsSchema), (c) =>
  getController().getBySlug(c)
);

// GET /api/v1/businesses/region/:regionId
businessesRouter.get(
  '/region/:regionId',
  validateParams(z.object({ regionId: z.string().uuid('Region ID must be a valid UUID') })),
  validateQuery(ListBusinessesQuerySchema),
  (c) => getController().listByRegion(c)
);

// GET /api/v1/businesses/:id
businessesRouter.get('/:id', validateParams(BusinessIdParamsSchema), (c) =>
  getController().getById(c)
);

// ==========================================
// ADMIN ROUTES
// ==========================================

businessesRouter.post(
  '/',
  authGuard,
  requirePermission('business:write'),
  validateBody(CreateBusinessSchema),
  (c) => getController().create(c)
);

businessesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  validateBody(UpdateBusinessSchema),
  (c) => getController().update(c)
);

businessesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  (c) => getController().delete(c)
);

businessesRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  (c) => getController().activate(c)
);

businessesRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('business:write'),
  validateParams(BusinessIdParamsSchema),
  (c) => getController().deactivate(c)
);

export { businessesRouter };
