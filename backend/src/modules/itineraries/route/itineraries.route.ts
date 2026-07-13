import { Hono } from 'hono';
import { container } from '@/common/di/container';
import { Permissions } from '@/common/constants/permissions';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import {
  ItineraryIdParamsSchema,
  ItineraryItemIdParamsSchema,
  CreateItineraryRequestSchema,
  UpdateItineraryRequestSchema,
  AddItineraryItemRequestSchema,
  ReorderItineraryItemsRequestSchema,
  ItineraryFilterQuerySchema,
} from '../dto/itineraries.dto';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import type { ItinerariesController } from './itineraries.controller';

import type { MiddlewareHandler } from 'hono';

const itinerariesRouter = new Hono();

// Dynamically resolve authGuard and controller from Container
const authGuard: MiddlewareHandler = (c, next) => container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): ItinerariesController => container.resolve<ItinerariesController>('ItinerariesController');

// Routes
itinerariesRouter.post(
  '/',
  authGuard,
  requirePermission(Permissions.Itinerary.Create),
  validateBody(CreateItineraryRequestSchema),
  (c) => getController().create(c)
);

itinerariesRouter.get(
  '/',
  authGuard,
  requirePermission(Permissions.Itinerary.Read),
  validateQuery(ItineraryFilterQuerySchema),
  (c) => getController().list(c)
);

itinerariesRouter.get(
  '/:id',
  authGuard,
  requirePermission(Permissions.Itinerary.Read),
  validateParams(ItineraryIdParamsSchema),
  (c) => getController().getById(c)
);

itinerariesRouter.patch(
  '/:id',
  authGuard,
  requirePermission(Permissions.Itinerary.Update),
  validateParams(ItineraryIdParamsSchema),
  validateBody(UpdateItineraryRequestSchema),
  (c) => getController().update(c)
);

itinerariesRouter.delete(
  '/:id',
  authGuard,
  requirePermission(Permissions.Itinerary.Delete),
  validateParams(ItineraryIdParamsSchema),
  (c) => getController().delete(c)
);

itinerariesRouter.post(
  '/:id/items',
  authGuard,
  requirePermission(Permissions.Itinerary.Update),
  validateParams(ItineraryIdParamsSchema),
  validateBody(AddItineraryItemRequestSchema),
  (c) => getController().addItem(c)
);

itinerariesRouter.delete(
  '/:id/items/:itemId',
  authGuard,
  requirePermission(Permissions.Itinerary.Update),
  validateParams(ItineraryItemIdParamsSchema),
  (c) => getController().removeItem(c)
);

itinerariesRouter.patch(
  '/:id/reorder',
  authGuard,
  requirePermission(Permissions.Itinerary.Update),
  validateParams(ItineraryIdParamsSchema),
  validateBody(ReorderItineraryItemsRequestSchema),
  (c) => getController().reorderItems(c)
);

itinerariesRouter.post(
  '/:id/publish',
  authGuard,
  requirePermission(Permissions.Itinerary.Update),
  validateParams(ItineraryIdParamsSchema),
  (c) => getController().publish(c)
);

itinerariesRouter.post(
  '/:id/archive',
  authGuard,
  requirePermission(Permissions.Itinerary.Update),
  validateParams(ItineraryIdParamsSchema),
  (c) => getController().archive(c)
);

export { itinerariesRouter };
