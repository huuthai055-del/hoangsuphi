import { container } from '@/common/di/container';
import { Hono, type MiddlewareHandler } from 'hono';
import type { HarvestStatusPublicController } from './harvest-status.public.controller';

const noStore: MiddlewareHandler = async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
};

export function createHarvestStatusPublicRouter(
  resolveController: () => HarvestStatusPublicController
): Hono {
  const router = new Hono();
  router.use('*', noStore);
  router.get('/', (c) => resolveController().current(c));
  router.get('/regions/:slug', (c) => resolveController().regionTimeline(c));
  return router;
}

export const harvestStatusPublicRouter = createHarvestStatusPublicRouter(() =>
  container.resolve<HarvestStatusPublicController>('HarvestStatusPublicController')
);
