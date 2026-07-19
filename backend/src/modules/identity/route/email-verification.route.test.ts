import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { Hono } from 'hono';
import { User } from '../domain/user.entity';
import { DrizzleUserRepository } from '../repository/users.repository';
import { DrizzleOneTimeTokenRepository } from '../repository/drizzle-one-time-token.repository';
import { FakeEmailSender } from '@/modules/email/fake-email-sender';
import { FakeRedisStore } from '@/lib/redis/fake-redis-store';

// Mock database runInTransaction
mock.module('@/lib/database/client', () => {
  return {
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
    db: {},
    dbHealthCheck: async () => ({ status: 'healthy' }),
  };
});

describe('Email Verification API Routes (`/api/v1/auth/email-verification`)', () => {
  let app: Hono;

  const userId = '019f4264-a179-7672-b7b6-278802ae1916';
  const email = 'pending@hoangsuphi.vn';

  let testUser: User;

  // Repository Mocks
  const mockUserFindByEmail = mock((_email: string) => Promise.resolve<User | null>(null));
  const mockUserFindById = mock((_id: string) => Promise.resolve<User | null>(null));
  const mockUserUpdate = mock((_user: any) => Promise.resolve());

  const mockTokenCreate = mock((_user: string, _type: string, _ttl: number) =>
    Promise.resolve('token_abc123')
  );
  const mockTokenRevoke = mock((_user: string, _type: string) => Promise.resolve());
  const mockTokenConsume = mock((_token: string, _type: string) => Promise.resolve<string | null>(null));

  const mockEmailSend = mock((_msg: any) => Promise.resolve({ messageId: 'msg-123', provider: 'fake' as const }));

  beforeEach(async () => {
    mockUserFindByEmail.mockReset();
    mockUserFindById.mockReset();
    mockUserUpdate.mockReset();
    mockTokenCreate.mockReset().mockResolvedValue('token_abc123');
    mockTokenRevoke.mockReset().mockResolvedValue(undefined);
    mockTokenConsume.mockReset().mockResolvedValue(null);
    mockEmailSend.mockReset().mockResolvedValue({ messageId: 'msg-123', provider: 'fake' as const });
    spyOn(DrizzleUserRepository.prototype, 'findByEmail').mockImplementation(mockUserFindByEmail);
    spyOn(DrizzleUserRepository.prototype, 'findById').mockImplementation(mockUserFindById);
    spyOn(DrizzleUserRepository.prototype, 'update').mockImplementation(mockUserUpdate);

    spyOn(DrizzleOneTimeTokenRepository.prototype, 'createToken').mockImplementation(mockTokenCreate);
    spyOn(DrizzleOneTimeTokenRepository.prototype, 'revokePendingTokens').mockImplementation(mockTokenRevoke);
    spyOn(DrizzleOneTimeTokenRepository.prototype, 'consumeToken').mockImplementation(mockTokenConsume);

    spyOn(FakeEmailSender.prototype, 'send').mockImplementation(mockEmailSend);

    testUser = User.rehydrate({
      id: userId,
      email,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
      status: 'pending_verification',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      permissionsVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      lastPasswordChangedAt: null,
      lastFailedLoginAt: null,
      deletedAt: null,
    });

    const { container } = await import('@/common/di/container');
    const { EmailVerificationService } = await import('../service/email-verification.service');
    container.reset();
    container.register(
      'EmailVerificationService',
      new EmailVerificationService(
        new DrizzleUserRepository(),
        new DrizzleOneTimeTokenRepository(),
        new FakeEmailSender(),
        new FakeRedisStore(),
        200
      )
    );

    const { createApp } = await import('../../../app');
    app = createApp();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('POST /api/v1/auth/email-verification/resend', () => {
    test('should return 202 Accepted and generic message when user is pending_verification', async () => {
      mockUserFindByEmail.mockResolvedValue(testUser);

      const res = await app.request('/api/v1/auth/email-verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json).toEqual({
        data: {
          message: 'Nếu địa chỉ email hợp lệ và đủ điều kiện, hướng dẫn sẽ được gửi trong ít phút.',
        },
      });

      expect(mockTokenRevoke).toHaveBeenCalledWith(userId, 'email_verification', undefined);
      expect(mockTokenCreate).toHaveBeenCalledWith(userId, 'email_verification', 86400, undefined);
      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          templateId: 'email_verification',
        })
      );
    });

    test('should return 202 Accepted and generic message even if user is not found (no disclosure)', async () => {
      mockUserFindByEmail.mockResolvedValue(null);

      const res = await app.request('/api/v1/auth/email-verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@hoangsuphi.vn' }),
      });

      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.data.message).toBe(
        'Nếu địa chỉ email hợp lệ và đủ điều kiện, hướng dẫn sẽ được gửi trong ít phút.'
      );
      expect(mockTokenCreate).not.toHaveBeenCalled();
      expect(mockTokenRevoke).not.toHaveBeenCalled();
      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    test('should return 400 Bad Request if email is missing or invalid format', async () => {
      const res = await app.request('/api/v1/auth/email-verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('VAL_001');
    });
  });

  describe('POST /api/v1/auth/email-verification/confirm', () => {
    test('should return 200 OK and success message when token is valid', async () => {
      mockTokenConsume.mockResolvedValue(userId);
      mockUserFindById.mockResolvedValue(testUser);

      const res = await app.request('/api/v1/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid_token_string' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        data: {
          message: 'Xác thực email thành công.',
        },
      });

      expect(mockUserUpdate).toHaveBeenCalled();
      const updatedUser = mockUserUpdate.mock.calls[0]?.[0] as User;
      expect(updatedUser.status).toBe('active');
    });

    test('should return 400 with TOKEN_INVALID_OR_EXPIRED error code if token is expired or used', async () => {
      mockTokenConsume.mockResolvedValue(null); // Consuming returns null when invalid/expired/used

      const res = await app.request('/api/v1/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'expired_or_invalid_token' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('TOKEN_INVALID_OR_EXPIRED');
      expect(json.detail).toBe('Token xác minh không hợp lệ hoặc đã hết hạn.');
    });

    test('should return 400 Bad Request if token parameter is missing', async () => {
      const res = await app.request('/api/v1/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('VAL_001');
    });

    test('should return 400 Bad Request if token exceeds 256 characters or has non-base64url chars (F-014)', async () => {
      const longToken = 'a'.repeat(257);
      const resLong = await app.request('/api/v1/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: longToken }),
      });
      expect(resLong.status).toBe(400);

      const invalidToken = 'invalid-token-!@#$%^&*()';
      const resInvalid = await app.request('/api/v1/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invalidToken }),
      });
      expect(resInvalid.status).toBe(400);
    });

    test('should support Idempotency-Key header without leaking tokens/keys (F-013, F-020)', async () => {
      mockTokenConsume.mockResolvedValue(userId);
      mockUserFindById.mockResolvedValue(testUser);

      const res = await app.request('/api/v1/auth/email-verification/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'confirm-header-test-key-123',
        },
        body: JSON.stringify({ token: 'valid_token_string' }),
      });

      expect(res.status).toBe(200);
      const resText = await res.text();
      expect(resText).not.toContain('confirm-header-test-key-123');
      expect(resText).not.toContain('$2a$10$abcdefghijklmnopqrstuv');
    });
  });

  describe('CORS and Security Headers (F-016, F-020)', () => {
    test('should include Idempotency-Key in CORS allow and expose headers', async () => {
      const res = await app.request('/api/v1/auth/email-verification/resend', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Idempotency-Key',
        },
      });

      const allowHeaders = res.headers.get('Access-Control-Allow-Headers') || '';
      const exposeHeaders = res.headers.get('Access-Control-Expose-Headers') || '';
      expect(allowHeaders).toContain('Idempotency-Key');
      expect(exposeHeaders).toContain('Idempotency-Key');
    });
  });
});
