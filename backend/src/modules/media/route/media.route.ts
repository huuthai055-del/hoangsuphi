import { Hono } from 'hono';
import { MediaController } from './media.controller';
import { MediaUploadService } from '../service/media-upload.service';
import { MediaProcessingService } from '../service/media-processing.service';
import { DrizzleMediaRepository } from '../repository/media.repository';
import { LocalStorageAdapter } from '../repository/local-storage.adapter';
import { NativeImageProcessor } from '../repository/native-image-processor';
import { MediaIdParamsSchema } from '../dto/media.dto';
import { validateParams } from '@/middleware/validator';

import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';

const mediaRouter = new Hono();

const mediaRepo = new DrizzleMediaRepository();
const storage = new LocalStorageAdapter();
const imageProcessor = new NativeImageProcessor();

const uploadService = new MediaUploadService(mediaRepo, storage);
const processingService = new MediaProcessingService(mediaRepo, storage, imageProcessor);
const controller = new MediaController(uploadService, processingService, mediaRepo, storage);

const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

mediaRouter.post('/upload', authGuard, requirePermission('media:upload'), controller.upload);

mediaRouter.get(
  '/:id',
  authGuard,
  requirePermission('media:read'),
  validateParams(MediaIdParamsSchema),
  controller.getById
);

mediaRouter.get(
  '/:id/variants',
  authGuard,
  requirePermission('media:read'),
  validateParams(MediaIdParamsSchema),
  controller.getVariants
);

mediaRouter.delete(
  '/:id',
  authGuard,
  requirePermission('media:delete'),
  validateParams(MediaIdParamsSchema),
  controller.delete
);

export { mediaRouter };
