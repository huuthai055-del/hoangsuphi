import { env } from '@/config/env';
import { loggerMiddleware } from '@/middleware/logging';
import { rateLimit } from '@/middleware/rate-limit';
import type { Hono } from 'hono';
import { cors } from 'hono/cors';

export function registerMiddlewares(app: Hono) {
  // 1. Logger & Request ID Tracing
  app.use('*', loggerMiddleware());

  // 2. CORS Policy
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGINS,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'X-Correlation-ID',
        'Idempotency-Key',
      ],
      exposeHeaders: [
        'Content-Length',
        'X-Request-ID',
        'X-Correlation-ID',
        'Idempotency-Key',
      ],
      maxAge: 600,
      credentials: true,
    })
  );

  // 3. Global Security Headers
  app.use('*', async (c, next) => {
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY');
    c.res.headers.set('X-XSS-Protection', '1; mode=block');
    await next();
  });

  // 4. Request Timeout Middleware (30 seconds)
  app.use('*', async (_c, next) => {
    let timeoutId: Timer | undefined;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request Timeout'));
      }, 30000);
    });
    try {
      await Promise.race([next(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  });

  // 5. Rate Limiter
  app.use('/api/*', rateLimit('global'));
}
