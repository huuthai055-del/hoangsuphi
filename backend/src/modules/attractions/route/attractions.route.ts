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

const attractionsRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const attractionsRepo = new DrizzleAttractionsRepository();
const service = new AttractionsService(regionsRepo, attractionsRepo);
const controller = new AttractionsController(service);

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

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
attractionsRouter.post('/', validateBody(CreateAttractionSchema), controller.create);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
attractionsRouter.patch(
  '/:id',
  validateParams(AttractionIdParamsSchema),
  validateBody(UpdateAttractionSchema),
  controller.update
);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
attractionsRouter.delete('/:id', validateParams(AttractionIdParamsSchema), controller.delete);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
attractionsRouter.patch(
  '/:id/activate',
  validateParams(AttractionIdParamsSchema),
  controller.activate
);

// TODO: Integrate authentication and authorization middleware from Identity module once implemented
attractionsRouter.patch(
  '/:id/deactivate',
  validateParams(AttractionIdParamsSchema),
  controller.deactivate
);

export { attractionsRouter };
export type { AttractionsController };
export type { AttractionsService };
