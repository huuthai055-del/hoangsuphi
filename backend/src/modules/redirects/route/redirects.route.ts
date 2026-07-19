import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { container } from '../../../common/di/container';
import { validateBody, validateParams, validateQuery } from '../../../middleware/validator';
import { requirePermission } from '../../identity/middleware/permission.middleware';
import {
  CreateRedirectSchema,
  ListRedirectsQuerySchema,
  RedirectIdParamsSchema,
  ResolveRedirectQuerySchema,
  UpdateRedirectSchema,
} from '../dto/redirects.dto';
import type { RedirectsController } from './redirects.controller';

const redirectsPublicRouter = new Hono();
const redirectsAdminRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);

const getController = (): RedirectsController =>
  container.resolve<RedirectsController>('RedirectsController');

// Public route for resolving redirects
redirectsPublicRouter.get('/resolve', validateQuery(ResolveRedirectQuerySchema), (c) =>
  getController().resolve(c)
);

// Admin CRUD routes
redirectsAdminRouter.use('*', authGuard, requirePermission('system:write'));

redirectsAdminRouter.get('/', validateQuery(ListRedirectsQuerySchema), (c) => getController().list(c));
redirectsAdminRouter.get('/:id', validateParams(RedirectIdParamsSchema), (c) => getController().getById(c));
redirectsAdminRouter.post('/', validateBody(CreateRedirectSchema), (c) => getController().create(c));
redirectsAdminRouter.patch('/:id', validateParams(RedirectIdParamsSchema), validateBody(UpdateRedirectSchema), (c) =>
  getController().update(c)
);
redirectsAdminRouter.delete('/:id', validateParams(RedirectIdParamsSchema), (c) => getController().delete(c));

export { redirectsPublicRouter, redirectsAdminRouter };
