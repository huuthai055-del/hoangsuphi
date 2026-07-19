import { errorHandlerMiddleware } from '@/middleware/error';
import { Hono } from 'hono';
import { registerMiddlewares } from './app/register-middlewares';
import { registerRoutes } from './app/register-routes';

export function createApp() {
  const app = new Hono();

  // Register all middlewares
  registerMiddlewares(app);

  // Register all routes
  registerRoutes(app);

  // Global Error Handler
  app.onError(errorHandlerMiddleware());

  // Global 404 Route
  app.notFound((c) => {
    return c.json(
      {
        type: 'https://hoangsuphi.vn/errors/not-found',
        title: 'Resource Not Found',
        status: 404,
        code: 'SYS_002',
        detail: `The requested path [${c.req.path}] does not exist on this server.`,
        instance: c.req.path,
      },
      404,
      { 'Content-Type': 'application/problem+json' }
    );
  });

  return app;
}
