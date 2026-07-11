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

const businessesRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const businessesRepo = new DrizzleBusinessesRepository();
const service = new BusinessesService(regionsRepo, businessesRepo);
const controller = new BusinessesController(service);

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

// TODO: Integrate authentication and authorization middleware from Identity module once implemented (e.g. require admin permissions)
businessesRouter.post('/', validateBody(CreateBusinessSchema), controller.create);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
businessesRouter.patch(
  '/:id',
  validateParams(BusinessIdParamsSchema),
  validateBody(UpdateBusinessSchema),
  controller.update
);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
businessesRouter.delete('/:id', validateParams(BusinessIdParamsSchema), controller.delete);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
businessesRouter.patch(
  '/:id/activate',
  validateParams(BusinessIdParamsSchema),
  controller.activate
);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
businessesRouter.patch(
  '/:id/deactivate',
  validateParams(BusinessIdParamsSchema),
  controller.deactivate
);

export { businessesRouter };
export type { BusinessesController };
export type { BusinessesService };
