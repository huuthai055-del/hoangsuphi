import { container } from '@/common/di/container';
import { Hono, type MiddlewareHandler } from 'hono';
import { parseSearchQuery } from '../dto/search.dto';
import type { SearchController } from './search.controller';

export type SearchControllerResolver = () => SearchController;

export const validateSearchQuery: MiddlewareHandler = async (c, next) => {
  const query = parseSearchQuery(new URL(c.req.url).searchParams);
  c.set('validQuery', query);
  await next();
};

export function createSearchRouter(resolveController: SearchControllerResolver): Hono {
  const router = new Hono();
  router.get('/', validateSearchQuery, (c) => resolveController().search(c));
  return router;
}

export const searchRouter = createSearchRouter(() =>
  container.resolve<SearchController>('SearchController')
);
