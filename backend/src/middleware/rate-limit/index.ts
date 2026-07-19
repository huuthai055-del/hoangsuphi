import { container } from '@/common/di/container';
import { RateLimitError } from '@/common/errors/http.errors';
import { AppConfig } from '@/config/app.config';
import { RedisKeyFactory } from '@/lib/redis/redis-key.factory';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { extractClientIp } from '@/common/utils/ip';
import type { MiddlewareHandler } from 'hono';

export const rateLimit = (
  endpointName: string,
  customLimit?: number,
  customWindowMs?: number
): MiddlewareHandler => {
  return async (c, next) => {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_FOR_TESTS !== 'true') {
      await next();
      return;
    }

    const user = c.get('user') as { sub?: string } | undefined;
    const userId = user?.sub;
    const clientIp = extractClientIp(c);
    const identifier = userId ? `auth:${userId}` : `anon:${clientIp}`;

    const key = RedisKeyFactory.rateLimit(endpointName, identifier);
    const limit = customLimit ?? (userId ? AppConfig.rateLimit.auth : AppConfig.rateLimit.anon);
    const windowMs = customWindowMs ?? AppConfig.rateLimit.windowMs;
    const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

    const redisStore = container.resolve<IRedisStore>('RedisStore');
    const count = await redisStore.increment(key, ttlSeconds);
    const remaining = Math.max(0, limit - count);

    c.res.headers.set('X-RateLimit-Limit', limit.toString());
    c.res.headers.set('X-RateLimit-Remaining', remaining.toString());

    if (count > limit) {
      const remainingTtl = await redisStore.ttl(key);
      const retryAfterSeconds = remainingTtl > 0 ? remainingTtl : ttlSeconds;
      c.res.headers.set('Retry-After', retryAfterSeconds.toString());
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    await next();
  };
};

