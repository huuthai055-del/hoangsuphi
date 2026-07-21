import { container } from '@/common/di/container';
import { Hono, type MiddlewareHandler } from 'hono';
import type { PublicCatalogController } from './public-catalog.controller';

const noStore: MiddlewareHandler = async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
};

export function createPublicCatalogRouter(resolveController: () => PublicCatalogController): Hono {
  const router = new Hono();
  router.use('*', noStore);
  router.get('/catalog/:kind', (c) => resolveController().list(c));
  router.get('/catalog/:kind/:slug', (c) => resolveController().detail(c));
  router.get('/references/:kind', (c) => resolveController().references(c));
  return router;
}

export const publicCatalogRouter = createPublicCatalogRouter(() =>
  container.resolve<PublicCatalogController>('PublicCatalogController')
);
