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

const placesRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const placesRepo = new DrizzleTouristPlacesRepository();
const placesService = new PlacesService(regionsRepo, placesRepo);
const controller = new PlacesController(placesService);

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

// TODO: Integrate authentication and authorization middleware from Identity module once implemented (e.g. require admin permissions)
placesRouter.post('/', validateBody(CreatePlaceSchema), controller.create);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
placesRouter.patch(
  '/:id',
  validateParams(PlaceIdParamsSchema),
  validateBody(UpdatePlaceSchema),
  controller.update
);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
placesRouter.delete('/:id', validateParams(PlaceIdParamsSchema), controller.delete);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
placesRouter.patch('/:id/activate', validateParams(PlaceIdParamsSchema), controller.activate);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
placesRouter.patch('/:id/deactivate', validateParams(PlaceIdParamsSchema), controller.deactivate);

export { placesRouter };
export type { PlacesController };
export type { PlacesService };
