import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';
import {
  AttractionIdParamsSchema,
  AttractionNearbyQuerySchema,
  AttractionSlugParamsSchema,
  CreateAttractionSchema,
  ListAttractionsQuerySchema,
  UpdateAttractionSchema,
} from '../dto/attractions.dto';
import type { AttractionsController } from './attractions.controller';

const attractionsRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): AttractionsController =>
  container.resolve<AttractionsController>('AttractionsController');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/v1/attractions
attractionsRouter.get('/', validateQuery(ListAttractionsQuerySchema), (c) =>
  getController().list(c)
);

// GET /api/v1/attractions/nearby
attractionsRouter.get('/nearby', validateQuery(AttractionNearbyQuerySchema), (c) =>
  getController().searchNearby(c)
);

// GET /api/v1/attractions/slug/:slug
attractionsRouter.get('/slug/:slug', validateParams(AttractionSlugParamsSchema), (c) =>
  getController().getBySlug(c)
);

// GET /api/v1/attractions/region/:regionId
attractionsRouter.get(
  '/region/:regionId',
  validateParams(z.object({ regionId: z.string().uuid('Region ID must be a valid UUID') })),
  validateQuery(ListAttractionsQuerySchema),
  (c) => getController().listByRegion(c)
);

// GET /api/v1/attractions/:id
attractionsRouter.get('/:id', validateParams(AttractionIdParamsSchema), (c) =>
  getController().getById(c)
);

// ==========================================
// ADMIN ROUTES
// ==========================================

attractionsRouter.post(
  '/',
  authGuard,
  requirePermission('attraction:write'),
  validateBody(CreateAttractionSchema),
  (c) => getController().create(c)
);

attractionsRouter.patch(
  '/:id',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  validateBody(UpdateAttractionSchema),
  (c) => getController().update(c)
);

attractionsRouter.delete(
  '/:id',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  (c) => getController().delete(c)
);

attractionsRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  (c) => getController().activate(c)
);

attractionsRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('attraction:write'),
  validateParams(AttractionIdParamsSchema),
  (c) => getController().deactivate(c)
);

export { attractionsRouter };
