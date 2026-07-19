import { Permissions } from '@/common/constants/permissions';
import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import {
  AddTopListItemRequestSchema,
  CreateTopListRequestSchema,
  ReorderTopListItemsRequestSchema,
  TopListFilterQuerySchema,
  TopListIdParamsSchema,
  TopListItemIdParamsSchema,
  UpdateTopListRequestSchema,
} from '../dto/top-lists.dto';
import type { TopListsController } from './top-lists.controller';

import type { MiddlewareHandler } from 'hono';

const topListsRouter = new Hono();

// Dynamically resolve authGuard and controller from Container
const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): TopListsController =>
  container.resolve<TopListsController>('TopListsController');

// Public Routes
topListsRouter.get('/', validateQuery(TopListFilterQuerySchema), (c) => getController().list(c));

topListsRouter.get('/:id', validateParams(TopListIdParamsSchema), (c) =>
  getController().getById(c)
);

// Admin Routes
topListsRouter.post(
  '/',
  authGuard,
  requirePermission(Permissions.TopList.Create),
  validateBody(CreateTopListRequestSchema),
  (c) => getController().create(c)
);

topListsRouter.patch(
  '/:id',
  authGuard,
  requirePermission(Permissions.TopList.Update),
  validateParams(TopListIdParamsSchema),
  validateBody(UpdateTopListRequestSchema),
  (c) => getController().update(c)
);

topListsRouter.delete(
  '/:id',
  authGuard,
  requirePermission(Permissions.TopList.Delete),
  validateParams(TopListIdParamsSchema),
  (c) => getController().delete(c)
);

topListsRouter.post(
  '/:id/items',
  authGuard,
  requirePermission(Permissions.TopList.Update),
  validateParams(TopListIdParamsSchema),
  validateBody(AddTopListItemRequestSchema),
  (c) => getController().addItem(c)
);

topListsRouter.delete(
  '/:id/items/:itemId',
  authGuard,
  requirePermission(Permissions.TopList.Update),
  validateParams(TopListItemIdParamsSchema),
  (c) => getController().removeItem(c)
);

topListsRouter.patch(
  '/:id/reorder',
  authGuard,
  requirePermission(Permissions.TopList.Update),
  validateParams(TopListIdParamsSchema),
  validateBody(ReorderTopListItemsRequestSchema),
  (c) => getController().reorderItems(c)
);

topListsRouter.post(
  '/:id/publish',
  authGuard,
  requirePermission(Permissions.TopList.Update),
  validateParams(TopListIdParamsSchema),
  (c) => getController().publish(c)
);

topListsRouter.post(
  '/:id/archive',
  authGuard,
  requirePermission(Permissions.TopList.Update),
  validateParams(TopListIdParamsSchema),
  (c) => getController().archive(c)
);

export { topListsRouter };
