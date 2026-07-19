import { describe, expect, it, beforeEach, spyOn, mock } from 'bun:test';
import { RateLimitError, TokenInvalidOrExpiredError } from '@/common/errors/http.errors';
import { User } from '../domain/user.entity';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { IOneTimeTokenRepository } from '../repository/one-time-token.repository.interface';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { EmailProviderTimeoutError, EmailProviderHardFailureError } from '@/modules/email/email.errors';
import { getResendTimingBudgetMs } from '../constants/email-verification.constants';
import { EmailVerificationService } from './email-verification.service';

// Mock database runInTransaction
mock.module('@/lib/database/client', () => {
  return {
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let mockUserRepo: IUserRepository;
  let mockTokenRepo: IOneTimeTokenRepository;
  let mockEmailSender: IEmailSender;
  let mockRedisStore: IRedisStore;
  let testUser: User;

  const userId = '019f4264-a179-7672-b7b6-278802ae1916';
  const email = 'test@hoangsuphi.vn';

  beforeEach(() => {
    testUser = User.rehydrate({
      id: userId,
      email,
      passwordHash: '$2y$10$mockPasswordHashXYZ',
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

    mockUserRepo = {
      findById: async () => testUser,
      findByEmail: async () => testUser,
      create: async () => {},
      update: async () => {},
      existsByEmail: async () => true,
      assignRole: async () => {},
      removeRole: async () => {},
      findRoleByCode: async () => null,
      delete: async () => {},
    };

    mockTokenRepo = {
      createToken: async () => 'rawToken_123',
      revokePendingTokens: async () => {},
      consumeToken: async () => userId,
    };

    mockEmailSender = {
      send: async () => ({ messageId: 'fake-id', provider: 'fake' }),
    };

    mockRedisStore = {
      get: async () => null,
      set: async () => {},
      setIfAbsent: async () => true,
      increment: async () => 1,
      delete: async () => {},
      exists: async () => false,
      expire: async () => true,
    } as unknown as IRedisStore;

    service = new EmailVerificationService(
      mockUserRepo,
      mockTokenRepo,
      mockEmailSender,
      mockRedisStore,
      200
    );
  });

  describe('issueAndSendVerificationEmail()', () => {
    it('should revoke pending tokens, create new 24h token, and send email', async () => {
      const revokeSpy = spyOn(mockTokenRepo, 'revokePendingTokens');
      const createSpy = spyOn(mockTokenRepo, 'createToken');
      const sendSpy = spyOn(mockEmailSender, 'send');

      await service.issueAndSendVerificationEmail(userId, email);

      expect(revokeSpy).toHaveBeenCalledWith(userId, 'email_verification', undefined);
      expect(createSpy).toHaveBeenCalledWith(userId, 'email_verification', 86400, undefined);
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should immediately revoke newly created token if email sender throws non-timeout error (hard failure)', async () => {
      spyOn(mockEmailSender, 'send').mockImplementation(async () => {
        throw new EmailProviderHardFailureError('503 Provider Hard Failure', 'fake');
      });
      const revokeSpy = spyOn(mockTokenRepo, 'revokePendingTokens');

      let error: Error | null = null;
      try {
        await service.issueAndSendVerificationEmail(userId, email);
      } catch (e: any) {
        error = e;
      }

      expect(error).not.toBeNull();
      // Revoked twice: 1 at start, 1 after failure
      expect(revokeSpy).toHaveBeenCalledTimes(2);
    });

    it('should NOT revoke newly created token if email sender throws timeout error', async () => {
      spyOn(mockEmailSender, 'send').mockImplementation(async () => {
        throw new EmailProviderTimeoutError('Simulated Timeout when sending', 'fake');
      });
      const revokeSpy = spyOn(mockTokenRepo, 'revokePendingTokens');

      let error: Error | null = null;
      try {
        await service.issueAndSendVerificationEmail(userId, email);
      } catch (e: any) {
        error = e;
      }

      expect(error).not.toBeNull();
      // Revoked only once right at the start before creating token
      expect(revokeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resend()', () => {
    it('should return silently (generic behavior) if user not found', async () => {
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => null);
      const createSpy = spyOn(mockTokenRepo, 'createToken');
      const revokeSpy = spyOn(mockTokenRepo, 'revokePendingTokens');
      const sendSpy = spyOn(mockEmailSender, 'send');

      await service.resend('notfound@hoangsuphi.vn', '127.0.0.1');
      // No token may be created or revoked for a synthetic user.
      expect(createSpy).not.toHaveBeenCalled();
      expect(revokeSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should return silently (generic behavior) if user is already verified (not pending_verification)', async () => {
      const activeUser = User.rehydrate({
        id: userId,
        email,
        passwordHash: '$2y$10$xyz',
        status: 'active',
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
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => activeUser);
      const createSpy = spyOn(mockTokenRepo, 'createToken');
      const revokeSpy = spyOn(mockTokenRepo, 'revokePendingTokens');
      const sendSpy = spyOn(mockEmailSender, 'send');

      await service.resend(email, '127.0.0.1');
      // No token may be created or revoked for a non-pending account.
      expect(createSpy).not.toHaveBeenCalled();
      expect(revokeSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should issue token and send email when user is pending_verification', async () => {
      const sendSpy = spyOn(mockEmailSender, 'send');
      await service.resend(email, '127.0.0.1');
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should log sanitized error without throwing when issueAndSend throws provider error during resend', async () => {
      spyOn(mockEmailSender, 'send').mockImplementation(async () => {
        throw new Error('503 Hard Failure');
      });
      // Should complete without throwing so controller can return 202 Accepted
      await expect(service.resend(email, '127.0.0.1')).resolves.toBeUndefined();
    });

    it('should enforce rate limit when ENABLE_RATE_LIMIT_FOR_TESTS is set', async () => {
      const origEnv = process.env.ENABLE_RATE_LIMIT_FOR_TESTS;
      try {
        process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
        spyOn(mockRedisStore, 'setIfAbsent').mockImplementation(async () => false); // Cooldown violation

        await expect(service.resend(email, '127.0.0.1')).rejects.toThrow(RateLimitError);
      } finally {
        process.env.ENABLE_RATE_LIMIT_FOR_TESTS = origEnv;
      }
    });
  });

  describe('confirm()', () => {
    it('should verify user when token is valid', async () => {
      spyOn(mockTokenRepo, 'consumeToken').mockImplementation(async () => userId);
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => testUser);
      const updateSpy = spyOn(mockUserRepo, 'update');

      await service.confirm('token123', '127.0.0.1');
      expect(updateSpy).toHaveBeenCalled();
      const updatedUser = updateSpy.mock.calls[0]?.[0] as User;
      expect(updatedUser.status).toBe('active');
    });

    it('should throw TokenInvalidOrExpiredError when consumeToken returns null', async () => {
      spyOn(mockTokenRepo, 'consumeToken').mockImplementation(async () => null);

      await expect(service.confirm('invalid_token', '127.0.0.1')).rejects.toThrow(
        TokenInvalidOrExpiredError
      );
    });

    it('should throw TokenInvalidOrExpiredError when user not found or not pending', async () => {
      spyOn(mockTokenRepo, 'consumeToken').mockImplementation(async () => userId);
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => null);

      await expect(service.confirm('token123', '127.0.0.1')).rejects.toThrow(
        TokenInvalidOrExpiredError
      );
    });

    it('should throw TokenInvalidOrExpiredError if user status is not pending_verification', async () => {
      const activeUser = User.rehydrate({
        id: userId,
        email,
        passwordHash: '$2y$10$xyz',
        status: 'active',
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
      spyOn(mockTokenRepo, 'consumeToken').mockImplementation(async () => userId);
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => activeUser);

      await expect(service.confirm('token123', '127.0.0.1')).rejects.toThrow(
        TokenInvalidOrExpiredError
      );
    });

    it('should enforce confirm rate limits when enabled in test', async () => {
      process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
      spyOn(mockRedisStore, 'increment').mockImplementation(async () => 100); // Exceed limit

      await expect(service.confirm('token123', '127.0.0.1')).rejects.toThrow(RateLimitError);
      process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'false';
    });
  });

  describe('Idempotency handling & new verification scenarios', () => {
    it('should return silently if idempotency key is DONE in Redis during resend', async () => {
      spyOn(mockRedisStore, 'setIfAbsent').mockImplementation(async (key: string) =>
        !key.includes('idempotency')
      );
      spyOn(mockRedisStore, 'get').mockImplementation(async (key: string) =>
        key.includes('idempotency') ? 'DONE' : null
      );
      const findSpy = spyOn(mockUserRepo, 'findByEmail');

      await service.resend('test@hoangsuphi.vn', '127.0.0.1', 'idempotency-key-resend-1');
      expect(findSpy).not.toHaveBeenCalled();
    });

    it('should throw RateLimitError if idempotency key is PROCESSING in Redis during confirm', async () => {
      spyOn(mockRedisStore, 'setIfAbsent').mockImplementation(async (key: string) =>
        !key.includes('idempotency')
      );
      spyOn(mockRedisStore, 'get').mockImplementation(async (key: string) =>
        key.includes('idempotency') ? 'PROCESSING' : null
      );

      await expect(
        service.confirm('token123', '127.0.0.1', 'idempotency-key-confirm-1')
      ).rejects.toThrow(RateLimitError);
    });

    it('should use fallback key when idempotency header is missing (F-013)', async () => {
      const setIfAbsentSpy = spyOn(mockRedisStore, 'setIfAbsent').mockImplementation(async () => true);
      await service.confirm('token123', '127.0.0.1', undefined);
      expect(setIfAbsentSpy).toHaveBeenCalled();
      const calledArgs = setIfAbsentSpy.mock.calls.find((args) => typeof args[0] === 'string' && args[0].includes('idempotency'));
      expect(calledArgs).toBeDefined();
    });

    it('should normalize and hash long/unsafe idempotency keys (F-013)', async () => {
      const setIfAbsentSpy = spyOn(mockRedisStore, 'setIfAbsent').mockImplementation(async () => true);
      const longKey = 'A'.repeat(200);
      await service.confirm('token123', '127.0.0.1', longKey);
      const calledArgs = setIfAbsentSpy.mock.calls.find((args) => typeof args[0] === 'string' && args[0].includes('idempotency'));
      if (!calledArgs) {
        throw new Error('Expected calledArgs to be defined');
      }
      expect(calledArgs[0].length).toBeLessThan(150); // Hashed key is compact
    });

    it('should dynamically equalize timing baseline independent of provider network (R-005, R-006)', async () => {
      const mockNetworkDelayMs = 175;
      spyOn(mockEmailSender, 'send').mockImplementation(async () => {
        // Simulate network delay for real provider
        await new Promise((r) => setTimeout(r, mockNetworkDelayMs));
        return { messageId: 'mock-id', provider: 'fake' };
      });

      // 1. Pending User
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => testUser);
      const startPending = performance.now();
      await service.resend('pending@hoangsuphi.vn', '127.0.0.1', 'idempotency-timing-pending');
      const durationPending = performance.now() - startPending;

      // 2. Active User
      const activeUser = User.rehydrate({
        id: testUser.id,
        email: testUser.email,
        passwordHash: '$2y$10$mockPasswordHashXYZ',
        status: 'active',
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
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => activeUser);
      const startActive = performance.now();
      await service.resend('active@hoangsuphi.vn', '127.0.0.1', 'idempotency-timing-active');
      const durationActive = performance.now() - startActive;

      // 3. Nonexistent User
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => null);
      const startNonExistent = performance.now();
      await service.resend('notfound@hoangsuphi.vn', '127.0.0.1', 'idempotency-timing-nonexistent');
      const durationNonExistent = performance.now() - startNonExistent;

      // The sender is deliberately slower than the former 150ms budget. Every branch
      // must still complete within the same configured response budget.
      // Tolerance covers scheduler jitter on Windows/Bun.
      expect(Math.abs(durationPending - durationActive)).toBeLessThan(60);
      expect(Math.abs(durationPending - durationNonExistent)).toBeLessThan(60);
      expect(Math.abs(durationActive - durationNonExistent)).toBeLessThan(60);

      // Verify dummy sink logic didn't trigger real network send
      const sendSpyCalls = (mockEmailSender.send as import('bun:test').Mock<any>).mock.calls;
      // Should have been called exactly once (for the Pending User)
      expect(sendSpyCalls.length).toBe(1);
    });

    it('derives the production timing budget from the provider timeout plus grace', () => {
      expect(getResendTimingBudgetMs(1000)).toBe(1500);
      expect(getResendTimingBudgetMs(5000)).toBe(5500);
      expect(getResendTimingBudgetMs(30000)).toBe(30500);
    });
  });
});
