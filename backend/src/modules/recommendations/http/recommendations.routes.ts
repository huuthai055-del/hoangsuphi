import { Hono } from 'hono';
import type { RecommendationsController } from './recommendations.controller';

export function createRecommendationsRouter(controller: RecommendationsController): Hono {
  const router = new Hono();

  router.get('/', controller.getRecommendations);

  return router;
}

import { container } from '@/common/di/container';
export const recommendationsRouter = createRecommendationsRouter(
  container.resolve('RecommendationsController')
);
