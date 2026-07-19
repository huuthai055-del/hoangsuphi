import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import {
  CreateRegionSchema,
  ListRegionsQuerySchema,
  RegionIdParamsSchema,
  RegionSlugParamsSchema,
  UpdateRegionSchema,
} from '../dto/regions.dto';
import type { RegionsController } from './regions.controller';

const regionsRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): RegionsController =>
  container.resolve<RegionsController>('RegionsController');

// Public routes
regionsRouter.get('/', validateQuery(ListRegionsQuerySchema), (c) => getController().list(c));

regionsRouter.get('/:id', validateParams(RegionIdParamsSchema), (c) => getController().getById(c));

regionsRouter.get('/slug/:slug', validateParams(RegionSlugParamsSchema), (c) =>
  getController().getBySlug(c)
);

// Admin routes
regionsRouter.post(
  '/',
  authGuard,
  requirePermission('system:write'),
  validateBody(CreateRegionSchema),
  (c) => getController().create(c)
);

regionsRouter.patch(
  '/:id',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  validateBody(UpdateRegionSchema),
  (c) => getController().update(c)
);

regionsRouter.delete(
  '/:id',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  (c) => getController().delete(c)
);

regionsRouter.patch(
  '/:id/activate',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  (c) => getController().activate(c)
);

regionsRouter.patch(
  '/:id/deactivate',
  authGuard,
  requirePermission('system:write'),
  validateParams(RegionIdParamsSchema),
  (c) => getController().deactivate(c)
);

export { regionsRouter };
