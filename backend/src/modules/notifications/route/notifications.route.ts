import { Permissions } from '@/common/constants/permissions';
import { container } from '@/common/di/container';
import type { AppEnv } from '@/common/types/app-env';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import {
  CreateNotificationRequestSchema,
  NotificationFilterQuerySchema,
  NotificationIdParamsSchema,
} from '../dto/notifications.dto';
import type { NotificationsController } from './notifications.controller';

import type { MiddlewareHandler } from 'hono';

const notificationsRouter = new Hono<AppEnv>();

// Dynamically resolve authGuard and controller from Container
const authGuard: MiddlewareHandler<AppEnv> = (c, next) =>
  container.resolve<MiddlewareHandler<AppEnv>>('AuthGuard')(c, next);
const getController = (): NotificationsController =>
  container.resolve<NotificationsController>('NotificationsController');

// Routes
notificationsRouter.post(
  '/',
  authGuard,
  requirePermission(Permissions.Notification.Create),
  validateBody(CreateNotificationRequestSchema),
  (c) => getController().create(c)
);

notificationsRouter.get(
  '/',
  authGuard,
  requirePermission(Permissions.Notification.Read),
  validateQuery(NotificationFilterQuerySchema),
  (c) => getController().list(c)
);

notificationsRouter.get(
  '/:id',
  authGuard,
  requirePermission(Permissions.Notification.Read),
  validateParams(NotificationIdParamsSchema),
  (c) => getController().getById(c)
);

notificationsRouter.patch(
  '/:id/read',
  authGuard,
  requirePermission(Permissions.Notification.Update),
  validateParams(NotificationIdParamsSchema),
  (c) => getController().markRead(c)
);

notificationsRouter.patch(
  '/:id/unread',
  authGuard,
  requirePermission(Permissions.Notification.Update),
  validateParams(NotificationIdParamsSchema),
  (c) => getController().markUnread(c)
);

notificationsRouter.patch(
  '/:id/dismiss',
  authGuard,
  requirePermission(Permissions.Notification.Dismiss),
  validateParams(NotificationIdParamsSchema),
  (c) => getController().dismiss(c)
);

notificationsRouter.delete(
  '/:id',
  authGuard,
  requirePermission(Permissions.Notification.Delete),
  validateParams(NotificationIdParamsSchema),
  (c) => getController().delete(c)
);

export { notificationsRouter };
