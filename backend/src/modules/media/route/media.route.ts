import { container } from '@/common/di/container';
import { ValidationError } from '@/common/errors/http.errors';
import { validateParams } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { MediaIdParamsSchema } from '../dto/media.dto';
import type { MediaController } from './media.controller';

const mediaRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): MediaController => container.resolve<MediaController>('MediaController');

mediaRouter.post(
  '/upload',
  authGuard,
  requirePermission('media:upload'),
  bodyLimit({
    maxSize: 10.5 * 1024 * 1024, // 10.5MB limit
    onError: () => {
      throw new ValidationError('File size exceeds the maximum limit of 10.5MB');
    },
  }),
  (c) => getController().upload(c)
);

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
