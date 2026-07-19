import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';
import {
  CreatePlaceSchema,
  ListPlacesQuerySchema,
  PlaceIdParamsSchema,
  PlaceNearbyQuerySchema,
  PlaceSlugParamsSchema,
  UpdatePlaceSchema,
} from '../dto/places.dto';
import type { PlacesController } from './places.controller';

const placesRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): PlacesController =>
  container.resolve<PlacesController>('PlacesController');

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/v1/places
placesRouter.get('/', validateQuery(ListPlacesQuerySchema), (c) => getController().list(c));

// GET /api/v1/places/nearby
placesRouter.get('/nearby', validateQuery(PlaceNearbyQuerySchema), (c) =>
  getController().searchNearby(c)
);

// GET /api/v1/places/slug/:slug
placesRouter.get('/slug/:slug', validateParams(PlaceSlugParamsSchema), (c) =>
  getController().getBySlug(c)
);

// GET /api/v1/places/region/:regionId
placesRouter.get(
  '/region/:regionId',
  validateParams(z.object({ regionId: z.string().uuid('Region ID must be a valid UUID') })),
  validateQuery(ListPlacesQuerySchema),
  (c) => getController().listByRegion(c)
);

// GET /api/v1/places/:id
placesRouter.get('/:id', validateParams(PlaceIdParamsSchema), (c) => getController().getById(c));

// ==========================================
// ADMIN ROUTES
// ==========================================

placesRouter.post(
  '/',
  authGuard,
  requirePermission('place:write'),
  validateBody(CreatePlaceSchema),
  (c) => getController().create(c)
);

placesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  validateBody(UpdatePlaceSchema),
  (c) => getController().update(c)
);

placesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  (c) => getController().delete(c)
);

placesRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  (c) => getController().activate(c)
);

placesRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('place:write'),
  validateParams(PlaceIdParamsSchema),
  (c) => getController().deactivate(c)
);

export { placesRouter };
