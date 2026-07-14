import { Hono } from 'hono';
import { container } from '@/common/di/container';
import { MediaIdParamsSchema } from '../dto/media.dto';
import { validateParams } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import type { MiddlewareHandler } from 'hono';
import type { MediaController } from './media.controller';

const mediaRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) => container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): MediaController => container.resolve<MediaController>('MediaController');

mediaRouter.post('/upload', authGuard, requirePermission('media:upload'), (c) => getController().upload(c));

mediaRouter.get(
  '/:id',
  authGuard,
  requirePermission('media:read'),
  validateParams(MediaIdParamsSchema),
  (c) => getController().getById(c)
);

mediaRouter.get(
  '/:id/variants',
  authGuard,
  requirePermission('media:read'),
  validateParams(MediaIdParamsSchema),
  (c) => getController().getVariants(c)
);

mediaRouter.delete(
  '/:id',
  authGuard,
  requirePermission('media:delete'),
  validateParams(MediaIdParamsSchema),
  (c) => getController().delete(c)
);

export { mediaRouter };
