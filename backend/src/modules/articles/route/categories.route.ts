import { Hono } from 'hono';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from '../service/categories.service';
import { DrizzleCategoriesRepository } from '../repository/categories.repository';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryIdParamsSchema,
  CategoryCodeParamsSchema,
} from '../dto/categories.dto';
import { validateBody, validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import { logger } from '@/lib/logger';

const categoriesRouter = new Hono();

const categoriesRepo = new DrizzleCategoriesRepository();
const clock = { now: () => new Date() };
const service = new CategoriesService(categoriesRepo, logger, clock);
const controller = new CategoriesController(service);

const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

// Public Routes
categoriesRouter.get('/', controller.list);
categoriesRouter.get('/code/:code', validateParams(CategoryCodeParamsSchema), controller.getByCode);
categoriesRouter.get('/:id', validateParams(CategoryIdParamsSchema), controller.getById);

// Admin Routes
categoriesRouter.post(
  '/',
  authGuard,
  requirePermission('article:write'),
  validateBody(CreateCategorySchema),
  controller.create
);

categoriesRouter.patch(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(CategoryIdParamsSchema),
  validateBody(UpdateCategorySchema),
  controller.update
);

categoriesRouter.delete(
  '/:id',
  authGuard,
  requirePermission('article:write'),
  validateParams(CategoryIdParamsSchema),
  controller.delete
);

export { categoriesRouter };
export type { CategoriesController };
export type { CategoriesService };
