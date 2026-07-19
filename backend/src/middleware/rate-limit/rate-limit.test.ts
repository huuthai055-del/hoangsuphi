import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { container } from '@/common/di/container';
import { ExternalServiceError, RateLimitError } from '@/common/errors/http.errors';
import { AppConfig } from '@/config/app.config';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { Hono } from 'hono';
import { rateLimit } from './index';

describe('Redis-Backed Rate Limiter Middleware', () => {
  let mockIncrement: ReturnType<typeof mock>;
  let mockTtl: ReturnType<typeof mock>;
  let originalRedisStore: IRedisStore;

  beforeEach(() => {
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
    originalRedisStore = container.resolve<IRedisStore>('RedisStore');

    mockIncrement = mock(async (_key: string, _ttlSeconds: number) => 1);
    mockTtl = mock(async (_key: string) => 60);

    const fakeRedisStore: IRedisStore = {
      get: async () => null,
      set: async () => {},
      setIfAbsent: async () => true,
      delete: async () => true,
      increment: mockIncrement,
      ttl: mockTtl,
    };

    // Override container registration for RedisStore
    container.register('RedisStore', fakeRedisStore);
  });

  afterEach(() => {
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'false';
    container.register('RedisStore', originalRedisStore);
  });

  it('should use Redis increment with correct key and TTL', async () => {
    const app = new Hono();
    app.use('/test', rateLimit('testEndpoint', 10));
    app.get('/test', (c) => c.text('OK'));

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    // Check that RedisStore.increment was called with formatted key and TTL
    expect(mockIncrement).toHaveBeenCalledTimes(1);
    const [key, ttlSeconds] = mockIncrement.mock.calls[0] as [string, number];
    expect(key).toContain('ratelimit:testEndpoint:anon:127.0.0.1');
    expect(ttlSeconds).toBe(Math.max(1, Math.ceil(AppConfig.rateLimit.windowMs / 1000)));

    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('9');
  });

  it('should return 429 RateLimitError when count exceeds limit', async () => {
    // Simulate count reaching 6 on a limit of 5
    mockIncrement = mock(async () => 6);
    mockTtl = mock(async () => 45);
    const fakeStore: IRedisStore = {
      get: async () => null,
      set: async () => {},
      setIfAbsent: async () => true,
      delete: async () => true,
      increment: mockIncrement,
      ttl: mockTtl,
    };
    container.register('RedisStore', fakeStore);

    const app = new Hono();
    app.use('/limited', rateLimit('limitedEndpoint', 5));
    app.get('/limited', (c) => c.text('OK'));

    // We catch errors thrown by middleware to inspect RateLimitError
    app.onError((err, c) => {
      if (err instanceof RateLimitError) {
        return c.json({ errorCode: err.errorCode, message: err.message }, err.statusCode as any);
      }
      return c.text('Error', 500);
    });

    const res = await app.request('/limited');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');

    const body = await res.json() as { errorCode: string; message: string };
    expect(body.errorCode).toBe('SYS_004');
    expect(body.message).toBe('Too many requests. Please try again later.');
  });

  it('should throw ExternalServiceError (SYS_005) when Redis store fails without falling back to Map', async () => {
    // Simulate Redis failure throwing ExternalServiceError
    mockIncrement = mock(async () => {
      throw new ExternalServiceError('Redis increment operation failed', { operation: 'increment' });
    });
    const errorStore: IRedisStore = {
      get: async () => null,
      set: async () => {},
      setIfAbsent: async () => true,
      delete: async () => true,
      increment: mockIncrement,
      ttl: async () => -1,
    };
    container.register('RedisStore', errorStore);

    const app = new Hono();
    app.use('/fail', rateLimit('failEndpoint', 10));
    app.get('/fail', (c) => c.text('OK'));

    app.onError((err, c) => {
      if (err instanceof ExternalServiceError) {
        return c.json({ errorCode: err.errorCode, message: err.message }, err.statusCode as any);
      }
      return c.text('Error', 500);
    });

    const res = await app.request('/fail');
    expect(res.status).toBe(502);

    const body = await res.json() as { errorCode: string; message: string };
    expect(body.errorCode).toBe('SYS_005');
  });

  it('should bypass rate limiter when ENABLE_RATE_LIMIT_FOR_TESTS is not set to true in test mode', async () => {
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'false';
    const app = new Hono();
    app.use('/bypass', rateLimit('bypassEndpoint', 1));
    app.get('/bypass', (c) => c.text('OK'));

    const res = await app.request('/bypass');
    expect(res.status).toBe(200);
    expect(mockIncrement).not.toHaveBeenCalled();
  });
});
