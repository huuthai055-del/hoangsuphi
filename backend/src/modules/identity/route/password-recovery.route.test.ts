import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { Hono } from 'hono';
import { container } from '@/common/di/container';
import { TokenInvalidOrExpiredError } from '@/common/errors/http.errors';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';

mock.module('@/lib/database/client', () => ({
  runInTransaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
}));

describe('Password Recovery API Routes', () => {
  let app: Hono;
  let originalRedisStore: IRedisStore;
  const forgot = mock(async () => {});
  const reset = mock(async () => {});

  beforeEach(async () => {
    forgot.mockReset();
    reset.mockReset();
    await import('@/common/di/container');
    originalRedisStore = container.resolve<IRedisStore>('RedisStore');
    const { PasswordRecoveryService } = await import('../service/password-recovery.service');
    spyOn(PasswordRecoveryService.prototype, 'forgotPassword').mockImplementation(forgot);
    spyOn(PasswordRecoveryService.prototype, 'resetPassword').mockImplementation(reset);
    const { createApp } = await import('../../../app');
    app = createApp();
  });

  afterEach(() => {
    container.register('RedisStore', originalRedisStore);
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'false';
    mock.restore();
  });

  test('forgot returns the contract’s fixed generic 202 response and forwards Idempotency-Key', async () => {
    const response = await app.request('/api/v1/auth/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'forgot-123' },
      body: JSON.stringify({ email: 'test@hoangsuphi.vn' }),
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      data: {
        message: 'Nếu địa chỉ email hợp lệ và đủ điều kiện, hướng dẫn sẽ được gửi trong ít phút.',
      },
    });
    expect(forgot).toHaveBeenCalledWith('test@hoangsuphi.vn', expect.any(String), 'forgot-123');
  });

  test('forgot rejects missing, malformed, oversized, and unknown request fields', async () => {
    const invalidBodies = [
      {},
      { email: 'not-an-email' },
      { email: `${'a'.repeat(245)}@example.com` },
      { email: 'test@hoangsuphi.vn', extra: true },
    ];
    for (const body of invalidBodies) {
      const response = await app.request('/api/v1/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    expect(forgot).not.toHaveBeenCalled();
  });

  test('reset accepts exactly token and newPassword, then returns the contract response', async () => {
    const response = await app.request('/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'reset-123' },
      body: JSON.stringify({ token: 'valid_token_string', newPassword: 'NewStrongPassword123!' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { message: 'Đổi mật khẩu thành công.' } });
    expect(reset).toHaveBeenCalledWith(
      'valid_token_string',
      'NewStrongPassword123!',
      expect.any(String),
      'reset-123'
    );
  });

  test('reset rejects invalid token format, overlong token, and confirmPassword outside the contract', async () => {
    const invalidBodies = [
      { token: 'bad-token!', newPassword: 'NewStrongPassword123!' },
      { token: 'a'.repeat(257), newPassword: 'NewStrongPassword123!' },
      {
        token: 'valid_token_string',
        newPassword: 'NewStrongPassword123!',
        confirmPassword: 'NewStrongPassword123!',
      },
    ];
    for (const body of invalidBodies) {
      const response = await app.request('/api/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    expect(reset).not.toHaveBeenCalled();
  });

  test('reset maps every invalid-token state to the generic RFC 7807 response', async () => {
    reset.mockRejectedValueOnce(new TokenInvalidOrExpiredError());
    const response = await app.request('/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'expired_token', newPassword: 'NewStrongPassword123!' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'TOKEN_INVALID_OR_EXPIRED',
      detail: 'Token xác minh không hợp lệ hoặc đã hết hạn.',
    });
  });

  test('enforces the 10/hour IP limits for forgot and reset through Redis middleware', async () => {
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
    const increment = mock(async (_key: string, _ttlSeconds: number) => 1);
    const redisStore: IRedisStore = {
      get: async () => null,
      set: async () => {},
      setIfAbsent: async () => true,
      delete: async () => true,
      increment,
      ttl: async () => 3600,
    };
    container.register('RedisStore', redisStore);

    const counters = new Map<string, number>();
    increment.mockImplementation(async (key: string) => {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    });

    for (let request = 0; request < 10; request += 1) {
      const response = await app.request('/api/v1/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `user${request}@hoangsuphi.vn` }),
      });
      expect(response.status).toBe(202);
    }
    const forgotExceeded = await app.request('/api/v1/auth/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'over-limit@hoangsuphi.vn' }),
    });
    expect(forgotExceeded.status).toBe(429);

    counters.clear();
    for (let request = 0; request < 10; request += 1) {
      const response = await app.request('/api/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: `valid_token_${request}`, newPassword: 'NewStrongPassword123!' }),
      });
      expect(response.status).toBe(200);
    }
    const resetExceeded = await app.request('/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'over_limit_token', newPassword: 'NewStrongPassword123!' }),
    });
    expect(resetExceeded.status).toBe(429);

    const keys = increment.mock.calls.map(([key]) => key as string);
    expect(keys.some((key) => key.includes('password/forgot-ip'))).toBe(true);
    expect(keys.some((key) => key.includes('password/reset-ip'))).toBe(true);
  });

  test('publishes the exact Forgot/Reset request contracts in OpenAPI', async () => {
    const response = await app.request('/api/v1/auth/openapi.json');
    expect(response.status).toBe(200);
    const document = (await response.json()) as {
      paths: Record<string, { post?: { requestBody?: { content?: Record<string, { schema?: unknown }> } } }>;
    };

    expect(document.paths['/auth/password/forgot']?.post).toBeDefined();
    const resetSchema = document.paths['/auth/password/reset']?.post?.requestBody?.content?.[
      'application/json'
    ]?.schema;
    expect(resetSchema).toMatchObject({
      required: ['token', 'newPassword'],
      additionalProperties: false,
    });
  });
});
