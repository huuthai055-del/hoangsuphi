import { Hono } from 'hono';
import { TagsController } from './tags.controller';
import { TagsService } from '../service/tags.service';
import { DrizzleTagsRepository } from '../repository/tags.repository';
import {
  CreateTagSchema,
  UpdateTagSchema,
  TagIdParamsSchema,
  TagSlugParamsSchema,
  ListTagsQuerySchema,
  SearchTagsQuerySchema,
} from '../dto/tags.dto';
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

const tagsRouter = new Hono();

const tagsRepo = new DrizzleTagsRepository();
const clock = { now: () => new Date() };
const service = new TagsService(tagsRepo, logger, clock);
const controller = new TagsController(service);

const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

// Public Routes
tagsRouter.get('/', validateQuery(ListTagsQuerySchema), controller.list);
tagsRouter.get('/search', validateQuery(SearchTagsQuerySchema), controller.search);
tagsRouter.get('/slug/:slug', validateParams(TagSlugParamsSchema), controller.getBySlug);
tagsRouter.get('/:id', validateParams(TagIdParamsSchema), controller.getById);

// Admin Routes
tagsRouter.post(
  '/',
  authGuard,
  requirePermission('article:write'),
  validateBody(CreateTagSchema),
  controller.create
);

tagsRouter.patch(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(TagIdParamsSchema),
  validateBody(UpdateTagSchema),
  controller.update
);

tagsRouter.delete(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(TagIdParamsSchema),
  controller.delete
);

export { tagsRouter };
export type { TagsController };
export type { TagsService };
