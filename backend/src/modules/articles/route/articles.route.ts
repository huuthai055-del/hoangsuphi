import { Hono } from 'hono';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from '../service/articles.service';
import { DrizzleArticlesRepository } from '../repository/articles.repository';
import { DrizzleCategoriesRepository } from '../repository/categories.repository';
import { DrizzleTagsRepository } from '../repository/tags.repository';
import {
  CreateArticleSchema,
  UpdateArticleSchema,
  SearchArticlesQuerySchema,
  ArticleIdParamsSchema,
  ArticleSlugParamsSchema,
  BindTagsSchema,
  RemoveTagsSchema,
  RejectArticleSchema,
} from '../dto/articles.dto';
import { validateBody, validateQuery, validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { logger } from '@/lib/logger';

const articlesRouter = new Hono();

const articlesRepo = new DrizzleArticlesRepository();
const categoriesRepo = new DrizzleCategoriesRepository();
const tagsRepo = new DrizzleTagsRepository();
const clock = { now: () => new Date() };
const service = new ArticlesService(articlesRepo, categoriesRepo, tagsRepo, logger, clock);
const controller = new ArticlesController(service);

const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

// Public Routes
articlesRouter.get('/', validateQuery(SearchArticlesQuerySchema), controller.list);
articlesRouter.get('/slug/:slug', validateParams(ArticleSlugParamsSchema), controller.getBySlug);
articlesRouter.post('/:id/views', validateParams(ArticleIdParamsSchema), controller.recordView);
articlesRouter.get('/:id', validateParams(ArticleIdParamsSchema), controller.getById);

// Admin / Author / Publisher Routes
articlesRouter.post(
  '/',
  authGuard,
  requirePermission('article:write'),
  validateBody(CreateArticleSchema),
  controller.create
);

articlesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  validateBody(UpdateArticleSchema),
  controller.update
);

articlesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  controller.delete
);

articlesRouter.post(
  '/:id/submit',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  controller.submitReview
);

articlesRouter.post(
  '/:id/publish',
  authGuard,
  requirePermission('article:publish'),
  validateParams(ArticleIdParamsSchema),
  controller.publish
);

articlesRouter.post(
  '/:id/reject',
  authGuard,
  requirePermission('article:publish'),
  validateParams(ArticleIdParamsSchema),
  validateBody(RejectArticleSchema),
  controller.reject
);

articlesRouter.post(
  '/:id/archive',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  controller.archive
);

articlesRouter.post(
  '/:id/restore',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  controller.restore
);

articlesRouter.post(
  '/:id/tags',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  validateBody(BindTagsSchema),
  controller.bindTags
);

articlesRouter.delete(
  '/:id/tags',
  authGuard,
  requirePermission('article:write'),
  validateParams(ArticleIdParamsSchema),
  validateBody(RemoveTagsSchema),
  controller.removeTags
);

export { articlesRouter };
export type { ArticlesController };
export type { ArticlesService };
