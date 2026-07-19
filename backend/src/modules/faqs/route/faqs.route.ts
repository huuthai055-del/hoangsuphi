import { Permissions } from '@/common/constants/permissions';
import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import {
  CreateFaqRequestSchema,
  FaqFilterQuerySchema,
  FaqIdParamsSchema,
  UpdateFaqRequestSchema,
} from '../dto/faqs.dto';
import type { FaqsController } from './faqs.controller';

import type { MiddlewareHandler } from 'hono';

const faqsRouter = new Hono();

// Dynamically resolve authGuard and controller from Container
const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): FaqsController => container.resolve<FaqsController>('FaqsController');

// Public Routes
faqsRouter.get('/', validateQuery(FaqFilterQuerySchema), (c) => getController().list(c));

faqsRouter.get('/:id', validateParams(FaqIdParamsSchema), (c) => getController().getById(c));

// Admin Routes
faqsRouter.post(
  '/',
  authGuard,
  requirePermission(Permissions.Faq.Create),
  validateBody(CreateFaqRequestSchema),
  (c) => getController().create(c)
);

faqsRouter.patch(
  '/:id',
  authGuard,
  requirePermission(Permissions.Faq.Update),
  validateParams(FaqIdParamsSchema),
  validateBody(UpdateFaqRequestSchema),
  (c) => getController().update(c)
);

faqsRouter.delete(
  '/:id',
  authGuard,
  requirePermission(Permissions.Faq.Delete),
  validateParams(FaqIdParamsSchema),
  (c) => getController().delete(c)
);

faqsRouter.post(
  '/:id/publish',
  authGuard,
  requirePermission(Permissions.Faq.Update),
  validateParams(FaqIdParamsSchema),
  (c) => getController().publish(c)
);

faqsRouter.post(
  '/:id/archive',
  authGuard,
  requirePermission(Permissions.Faq.Update),
  validateParams(FaqIdParamsSchema),
  (c) => getController().archive(c)
);

export { faqsRouter };
