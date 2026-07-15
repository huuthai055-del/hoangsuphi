import { container } from '@/common/di/container';
import { Hono, type MiddlewareHandler } from 'hono';
import { parseNearbyQuery } from '../dto/nearby.dto';
import type { NearbyController } from './nearby.controller';

export type NearbyControllerResolver = () => NearbyController;

export const validateNearbyQuery: MiddlewareHandler = async (c, next) => {
  const query = parseNearbyQuery(new URL(c.req.url).searchParams);
  c.set('validQuery', query);
  await next();
};

export function createNearbyRouter(resolveController: NearbyControllerResolver): Hono {
  const router = new Hono();
  router.get('/', validateNearbyQuery, (c) => resolveController().search(c));
  return router;
}

export const nearbyRouter = createNearbyRouter(() =>
  container.resolve<NearbyController>('NearbyController')
);
