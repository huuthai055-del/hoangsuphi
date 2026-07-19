import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { RateLimitError, TokenInvalidOrExpiredError } from '@/common/errors/http.errors';
import { EmailProviderHardFailureError, EmailProviderTimeoutError } from '@/modules/email/email.errors';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { User } from '../domain/user.entity';
import { getForgotPasswordTimingBudgetMs } from '../constants/password-recovery.constants';
import type { IOneTimeTokenRepository } from '../repository/one-time-token.repository.interface';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { IPasswordService } from './password.service';
import { PasswordRecoveryService } from './password-recovery.service';
import type { ISessionService } from './session.service';

mock.module('@/lib/database/client', () => ({
  runInTransaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
}));

const userId = '019f4264-a179-7672-b7b6-278802ae1916';
const email = 'test@hoangsuphi.vn';

function userWithStatus(status: 'active' | 'inactive' | 'pending_verification' = 'active'): User {
  return User.rehydrate({
    id: userId,
    email,
    passwordHash: '$2y$10$existingPasswordHash',
    status,
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
}

describe('PasswordRecoveryService', () => {
  let userRepository: IUserRepository;
  let tokenRepository: IOneTimeTokenRepository;
  let sessionService: ISessionService;
  let passwordService: IPasswordService;
  let emailSender: IEmailSender;
  let redisStore: IRedisStore;
  let service: PasswordRecoveryService;

  beforeEach(() => {
    userRepository = {
      findById: mock(async () => null),
      findByEmail: mock(async () => null),
      existsByEmail: mock(async () => false),
      create: mock(async () => {}),
      update: mock(async () => {}),
      delete: mock(async () => {}),
      assignRole: mock(async () => {}),
      removeRole: mock(async () => {}),
      findRoleByCode: mock(async () => null),
    };
    tokenRepository = {
      createToken: mock(async () => 'raw-reset-token'),
      consumeToken: mock(async () => userId),
      revokePendingTokens: mock(async () => {}),
    };
    sessionService = {
      createSession: mock(async () => ({})),
      createRefreshToken: mock(async () => ({})),
      rotateRefreshToken: mock(async () => ({})),
      revokeSession: mock(async () => {}),
      revokeAllSessions: mock(async () => {}),
      isSessionActive: mock(async () => true),
      touchSession: mock(async () => {}),
    } as unknown as ISessionService;
    passwordService = {
      hash: mock(async () => '$2y$10$newPasswordHash'),
      verify: mock(async () => true),
      validatePolicy: mock(() => {}),
    };
    emailSender = {
      send: mock(async () => ({ messageId: 'fake-message', provider: 'fake' as const })),
    };
    redisStore = {
      get: mock(async () => null),
      set: mock(async () => {}),
      setIfAbsent: mock(async () => true),
      delete: mock(async () => true),
      increment: mock(async () => 1),
      ttl: mock(async () => 60),
    };
    service = new PasswordRecoveryService(
      userRepository,
      tokenRepository,
      sessionService,
      passwordService,
      emailSender,
      redisStore,
      25
    );
  });

  describe('forgotPassword', () => {
    test('issues a 30-minute token and sends through IEmailSender for an active user', async () => {
      (userRepository.findByEmail as ReturnType<typeof mock>).mockResolvedValue(userWithStatus());

      await service.forgotPassword(email, '127.0.0.1');

      expect(tokenRepository.revokePendingTokens).toHaveBeenCalledWith(userId, 'password_reset');
      expect(tokenRepository.createToken).toHaveBeenCalledWith(userId, 'password_reset', 1800);
      expect(emailSender.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: email, templateId: 'password_reset' })
      );
    });

    test('does not persist a token or send email for unknown, pending, or inactive accounts', async () => {
      await service.forgotPassword('unknown@hoangsuphi.vn', '127.0.0.1', 'unknown-request');
      expect(tokenRepository.createToken).not.toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();

      const pending = userWithStatus('pending_verification');
      (userRepository.findByEmail as ReturnType<typeof mock>).mockResolvedValue(pending);
      await service.forgotPassword(email, '127.0.0.1', 'inactive-request');
      expect(tokenRepository.createToken).not.toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();
    });

    test('returns generically but revokes the new token on a provider hard failure', async () => {
      (userRepository.findByEmail as ReturnType<typeof mock>).mockResolvedValue(userWithStatus());
      (emailSender.send as ReturnType<typeof mock>).mockRejectedValue(
        new EmailProviderHardFailureError('unauthorized', 'fake')
      );

      await expect(service.forgotPassword(email, '127.0.0.1')).resolves.toBeUndefined();
      expect(tokenRepository.revokePendingTokens).toHaveBeenCalledTimes(2);
    });

    test('returns generically and retains the new token on a typed provider timeout', async () => {
      (userRepository.findByEmail as ReturnType<typeof mock>).mockResolvedValue(userWithStatus());
      (emailSender.send as ReturnType<typeof mock>).mockRejectedValue(
        new EmailProviderTimeoutError('timed out', 'fake')
      );

      await expect(service.forgotPassword(email, '127.0.0.1')).resolves.toBeUndefined();
      expect(tokenRepository.revokePendingTokens).toHaveBeenCalledTimes(1);
    });

    test('uses hashed email keys and atomically enforces cooldown plus the 3/hour email limit', async () => {
      const previous = process.env.ENABLE_RATE_LIMIT_FOR_TESTS;
      process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
      (userRepository.findByEmail as ReturnType<typeof mock>).mockResolvedValue(null);
      (redisStore.increment as ReturnType<typeof mock>).mockResolvedValue(4);

      try {
        await expect(service.forgotPassword(email, '127.0.0.1', 'rate-limit-request')).rejects.toThrow(
          RateLimitError
        );
        const redisKeys = (redisStore.setIfAbsent as ReturnType<typeof mock>).mock.calls.map(
          ([key]) => key as string
        );
        expect(redisKeys.some((key) => key.includes(email))).toBe(false);
        expect(redisKeys.some((key) => key.includes('cooldown:password/forgot:email:'))).toBe(true);
      } finally {
        process.env.ENABLE_RATE_LIMIT_FOR_TESTS = previous;
      }
    });

    test('rejects a request already being processed and accepts a completed idempotent retry', async () => {
      (redisStore.setIfAbsent as ReturnType<typeof mock>).mockResolvedValue(false);
      (redisStore.get as ReturnType<typeof mock>).mockResolvedValue('PROCESSING');
      await expect(service.forgotPassword(email, '127.0.0.1', 'in-progress')).rejects.toThrow(
        RateLimitError
      );

      (redisStore.get as ReturnType<typeof mock>).mockResolvedValue('DONE');
      await expect(service.forgotPassword(email, '127.0.0.1', 'done-request')).resolves.toBeUndefined();
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    test('uses a generic token error for missing, invalid, and wrong-status tokens', async () => {
      await expect(service.resetPassword('', 'new-password', '127.0.0.1')).rejects.toThrow(
        TokenInvalidOrExpiredError
      );

      (tokenRepository.consumeToken as ReturnType<typeof mock>).mockResolvedValue(null);
      await expect(service.resetPassword('invalid-token', 'new-password', '127.0.0.1')).rejects.toThrow(
        TokenInvalidOrExpiredError
      );

      const pending = userWithStatus('pending_verification');
      (tokenRepository.consumeToken as ReturnType<typeof mock>).mockResolvedValue(userId);
      (userRepository.findById as ReturnType<typeof mock>).mockResolvedValue(pending);
      await expect(service.resetPassword('pending-token', 'new-password', '127.0.0.1')).rejects.toThrow(
        TokenInvalidOrExpiredError
      );
    });

    test('changes the password and revokes sessions and sibling reset tokens in one transaction', async () => {
      const user = userWithStatus();
      (tokenRepository.consumeToken as ReturnType<typeof mock>).mockResolvedValue(userId);
      (userRepository.findById as ReturnType<typeof mock>).mockResolvedValue(user);

      await service.resetPassword('valid-token', 'new-password', '127.0.0.1');

      expect(passwordService.validatePolicy).toHaveBeenCalledWith('new-password');
      expect(passwordService.hash).toHaveBeenCalledWith('new-password');
      expect(tokenRepository.consumeToken).toHaveBeenCalledWith(
        'valid-token',
        'password_reset',
        expect.anything()
      );
      expect(userRepository.update).toHaveBeenCalledWith(user, expect.anything());
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith(
        userId,
        'password_reset',
        expect.anything()
      );
      expect(tokenRepository.revokePendingTokens).toHaveBeenCalledWith(
        userId,
        'password_reset',
        expect.anything()
      );
    });

    test('uses token-hash fallback idempotency without placing the raw token in Redis', async () => {
      const user = userWithStatus();
      (userRepository.findById as ReturnType<typeof mock>).mockResolvedValue(user);
      await service.resetPassword('raw-token-value', 'new-password', '127.0.0.1');

      const keys = (redisStore.setIfAbsent as ReturnType<typeof mock>).mock.calls.map(
        ([key]) => key as string
      );
      expect(keys.some((key) => key.includes('raw-token-value'))).toBe(false);
    });
  });

  test('derives the production timing budget from sender timeout plus grace', () => {
    expect(getForgotPasswordTimingBudgetMs(1_000)).toBe(1_500);
    expect(getForgotPasswordTimingBudgetMs(5_000)).toBe(5_500);
  });
});
