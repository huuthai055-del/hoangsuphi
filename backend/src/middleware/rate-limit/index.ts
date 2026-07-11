import type { MiddlewareHandler } from 'hono';
import { RateLimitError } from '@/common/errors/http.errors';
import { AppConfig } from '@/config/app.config';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Periodic cleanup to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000).unref();

export const rateLimit = (endpointName: string, customLimit?: number): MiddlewareHandler => {
  return async (c, next) => {
    if (process.env.NODE_ENV === 'test') {
      await next();
      return;
    }

    const user = c.get('user') as { sub?: string } | undefined;
    const userId = user?.sub;
    const clientIp =
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || '127.0.0.1';
    const identifier = userId ? `auth:${userId}` : `anon:${clientIp}`;

    const key = `${endpointName}:${identifier}`;
    const limit = customLimit ?? (userId ? AppConfig.rateLimit.auth : AppConfig.rateLimit.anon);
    const windowMs = AppConfig.rateLimit.windowMs;

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      const resetTime = now + windowMs;
      rateLimitStore.set(key, { count: 1, resetTime });
      c.res.headers.set('X-RateLimit-Limit', limit.toString());
      c.res.headers.set('X-RateLimit-Remaining', (limit - 1).toString());
    } else {
      record.count += 1;
      const remaining = Math.max(0, limit - record.count);
      c.res.headers.set('X-RateLimit-Limit', limit.toString());
      c.res.headers.set('X-RateLimit-Remaining', remaining.toString());

      if (record.count > limit) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        c.res.headers.set('Retry-After', retryAfterSeconds.toString());
        throw new RateLimitError('Too many requests. Please try again later.');
      }
    }

    await next();
  };
};
