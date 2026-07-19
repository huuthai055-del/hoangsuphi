import { container } from '@/common/di/container';
import { validateBody, validateParams, validateQuery } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import {
  ArticleIdParamsSchema,
  ArticleSlugParamsSchema,
  BindTagsSchema,
  CreateArticleSchema,
  RejectArticleSchema,
  RemoveTagsSchema,
  SearchArticlesQuerySchema,
  UpdateArticleSchema,
} from '../dto/articles.dto';
import type { ArticlesController } from './articles.controller';

const articlesRouter = new Hono();

const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): ArticlesController =>
  container.resolve<ArticlesController>('ArticlesController');

// Public Routes
articlesRouter.get('/', validateQuery(SearchArticlesQuerySchema), (c) => getController().list(c));
articlesRouter.get('/slug/:slug', validateParams(ArticleSlugParamsSchema), (c) =>
  getController().getBySlug(c)
);
articlesRouter.post('/:id/views', validateParams(ArticleIdParamsSchema), (c) =>
  getController().recordView(c)
);
articlesRouter.get('/:id', validateParams(ArticleIdParamsSchema), (c) =>
  getController().getById(c)
);

// Admin / Author / Publisher Routes
articlesRouter.post(
  '/',
  authGuard,
  requirePermission('article:write'),
  validateBody(CreateArticleSchema),
  (c) => getController().create(c)
);

articlesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  validateBody(UpdateArticleSchema),
  (c) => getController().update(c)
);

articlesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  (c) => getController().delete(c)
);

articlesRouter.post(
  '/:id/submit',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  (c) => getController().submitReview(c)
);

articlesRouter.post(
  '/:id/publish',
  authGuard,
  requirePermission('article:publish'),
  validateParams(ArticleIdParamsSchema),
  (c) => getController().publish(c)
);

articlesRouter.post(
  '/:id/reject',
  authGuard,
  requirePermission('article:publish'),
  validateParams(ArticleIdParamsSchema),
  validateBody(RejectArticleSchema),
  (c) => getController().reject(c)
);

articlesRouter.post(
  '/:id/archive',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  (c) => getController().archive(c)
);

articlesRouter.post(
  '/:id/restore',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  (c) => getController().restore(c)
);

articlesRouter.post(
  '/:id/tags',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  validateBody(BindTagsSchema),
  (c) => getController().bindTags(c)
);

articlesRouter.delete(
  '/:id/tags',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  validateBody(RemoveTagsSchema),
  (c) => getController().removeTags(c)
);

export { articlesRouter };
