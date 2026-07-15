import { Hono } from 'hono';
import { AppConfig } from '@/config/app.config';
import { dbHealthCheck } from '@/lib/database/client';

import { regionsRouter } from '@/modules/regions/route/regions.route';
import { placesRouter } from '@/modules/regions/route/places.route';
import { businessesRouter } from '@/modules/businesses/route/businesses.route';
import { attractionsRouter } from '@/modules/attractions/route/attractions.route';
import { identityRouter } from '@/modules/identity/route/identity.route';
import { categoriesRouter } from '@/modules/articles/route/categories.route';
import { tagsRouter } from '@/modules/articles/route/tags.route';
import { articlesRouter } from '@/modules/articles/route/articles.route';
import { mediaRouter } from '@/modules/media/route/media.route';
import { reviewsRouter } from '@/modules/reviews/route/reviews.route';
import { itinerariesRouter } from '@/modules/itineraries/route/itineraries.route';
import { faqsRouter } from '@/modules/faqs/route/faqs.route';
import { topListsRouter } from '@/modules/faqs/route/top-lists.route';
import { weatherRouter } from '@/modules/weather/route/weather.route';
import { notificationsRouter } from '@/modules/notifications/route/notifications.route';
import { searchRouter } from '@/modules/search/route/search.route';
import { nearbyRouter } from '@/modules/nearby/http/nearby.routes';

export function registerRoutes(app: Hono) {
  // Liveness Check
  app.get('/health/live', (c) => c.text('OK', 200));

  // Readiness Check
  app.get('/health/ready', async (c) => {
    const dbStatus = await dbHealthCheck();
    const status = dbStatus.status === 'healthy' ? 'ready' : 'unhealthy';
    return c.json(
      {
        status,
        timestamp: new Date().toISOString(),
        database: dbStatus,
      },
      dbStatus.status === 'healthy' ? 200 : 503
    );
  });

  // Route Group V1
  const v1Router = new Hono();

  // Mount modules
  v1Router.route('/regions', regionsRouter);
  v1Router.route('/places', placesRouter);
  v1Router.route('/businesses', businessesRouter);
  v1Router.route('/attractions', attractionsRouter);
  v1Router.route('/auth', identityRouter);
  v1Router.route('/categories', categoriesRouter);
  v1Router.route('/tags', tagsRouter);
  v1Router.route('/articles', articlesRouter);
  v1Router.route('/media', mediaRouter);
  v1Router.route('/', reviewsRouter);
  v1Router.route('/itineraries', itinerariesRouter);
  v1Router.route('/faqs', faqsRouter);
  v1Router.route('/top-lists', topListsRouter);
  v1Router.route('/weather', weatherRouter);
  v1Router.route('/notifications', notificationsRouter);
  v1Router.route('/search', searchRouter);
  v1Router.route('/nearby', nearbyRouter);

  app.route(AppConfig.server.apiPrefix, v1Router);
}
