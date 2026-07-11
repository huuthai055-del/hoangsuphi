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

const regionsRouter = new Hono();

const regionsRepo = new DrizzleRegionsRepository();
const placesRepo = new DrizzleTouristPlacesRepository();
const regionsService = new RegionsService(regionsRepo, placesRepo);
const controller = new RegionsController(regionsService);

// Public routes
regionsRouter.get('/', validateQuery(ListRegionsQuerySchema), controller.list);

regionsRouter.get('/:id', validateParams(RegionIdParamsSchema), controller.getById);

regionsRouter.get('/slug/:slug', validateParams(RegionSlugParamsSchema), controller.getBySlug);

// Admin routes
// TODO: Integrate authentication and authorization middleware from Identity module once implemented
regionsRouter.post('/', validateBody(CreateRegionSchema), controller.create);

regionsRouter.patch(
  '/:id',
  validateParams(RegionIdParamsSchema),
  validateBody(UpdateRegionSchema),
  controller.update
);

regionsRouter.delete('/:id', validateParams(RegionIdParamsSchema), controller.delete);

regionsRouter.patch('/:id/activate', validateParams(RegionIdParamsSchema), controller.activate);

regionsRouter.patch('/:id/deactivate', validateParams(RegionIdParamsSchema), controller.deactivate);

export { regionsRouter };
export type { RegionsController };
export type { RegionsService };
