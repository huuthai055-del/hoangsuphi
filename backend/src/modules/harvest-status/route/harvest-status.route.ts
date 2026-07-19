import { Permissions } from '@/common/constants/permissions';
import { container } from '@/common/di/container';
import type { AppEnv } from '@/common/types/app-env';
import { validateBody, validateParams } from '@/middleware/validator';
import { requirePermission } from '@/modules/identity/middleware/permission.middleware';
import type { MiddlewareHandler } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import { CreateHarvestUpdateDto, PatchHarvestUpdateDto } from '../dto/harvest-status.dto';
import type { HarvestStatusController } from './harvest-status.controller';

const harvestStatusRoute = new Hono<AppEnv>();
const paramIdSchema = z.object({ id: z.string().uuid() });

const authGuard: MiddlewareHandler<AppEnv> = (c, next) =>
  container.resolve<MiddlewareHandler<AppEnv>>('AuthGuard')(c, next);
const getController = (): HarvestStatusController =>
  container.resolve<HarvestStatusController>('HarvestStatusController');

harvestStatusRoute.post(
  '/admin/harvest-status',
  authGuard,
  requirePermission(Permissions.Harvest.Write),
  validateBody(CreateHarvestUpdateDto),
  (c) => getController().create(c)
);

harvestStatusRoute.patch(
  '/admin/harvest-status/:id',
  authGuard,
  requirePermission(Permissions.Harvest.Write),
  validateParams(paramIdSchema),
  validateBody(PatchHarvestUpdateDto),
  (c) => getController().patch(c)
);

harvestStatusRoute.post(
  '/admin/harvest-status/:id/publish',
  authGuard,
  requirePermission(Permissions.Harvest.Write),
  validateParams(paramIdSchema),
  (c) => getController().publish(c)
);

harvestStatusRoute.post(
  '/admin/harvest-status/:id/archive',
  authGuard,
  requirePermission(Permissions.Harvest.Write),
  validateParams(paramIdSchema),
  (c) => getController().archive(c)
);

export { harvestStatusRoute };
