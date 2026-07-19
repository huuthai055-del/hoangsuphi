import { createHash, randomBytes } from 'node:crypto';
import { RateLimitError, TokenInvalidOrExpiredError } from '@/common/errors/http.errors';
import { env } from '@/config/env';
import { runInTransaction, type TransactionClient } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { RedisKeyFactory } from '@/lib/redis/redis-key.factory';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { EmailProviderTimeoutError } from '@/modules/email/email.errors';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import { renderPasswordResetTemplate } from '@/modules/email/templates/password-reset.template';
import {
  getForgotPasswordTimingBudgetMs,
  PasswordRecoveryConstants,
} from '../constants/password-recovery.constants';
import type { IOneTimeTokenRepository } from '../repository/one-time-token.repository.interface';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { IPasswordService } from './password.service';
import type { ISessionService } from './session.service';

export interface IPasswordRecoveryService {
  forgotPassword(email: string, clientIp: string, idempotencyKey?: string): Promise<void>;
  resetPassword(
    token: string,
    newPassword: string,
    clientIp: string,
    idempotencyKey?: string
  ): Promise<void>;
}

export class PasswordRecoveryService implements IPasswordRecoveryService {
  private readonly forgotTimingBudgetMs: number;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IOneTimeTokenRepository,
    private readonly sessionService: ISessionService,
    private readonly passwordService: IPasswordService,
    private readonly emailSender: IEmailSender,
    private readonly redisStore: IRedisStore,
    forgotTimingBudgetMs = getForgotPasswordTimingBudgetMs(env.EMAIL_SEND_TIMEOUT_MS)
  ) {
    if (!Number.isFinite(forgotTimingBudgetMs) || forgotTimingBudgetMs <= 0) {
      throw new Error('forgotTimingBudgetMs must be a positive finite number');
    }
    this.forgotTimingBudgetMs = forgotTimingBudgetMs;
  }

  private static hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static redactEmail(email: string): string {
    return email.replace(/(?<=^.{1})[^@\n]+(?=@)/, '***');
  }

  private async runWithIdempotency<T>(
    context: string,
    idempotencyKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const key = RedisKeyFactory.idempotency(context, idempotencyKey);
    const acquired = await this.redisStore.setIfAbsent(
      key,
      'PROCESSING',
      PasswordRecoveryConstants.IDEMPOTENCY_LOCK_SECONDS
    );

    if (!acquired) {
      const state = await this.redisStore.get(key);
      if (state === 'DONE') {
        return undefined as T;
      }
      throw new RateLimitError('Yêu cầu đang được xử lý, vui lòng đợi.');
    }

    try {
      const result = await operation();
      await this.redisStore.set(key, 'DONE', PasswordRecoveryConstants.IDEMPOTENCY_TTL_SECONDS);
      return result;
    } catch (error) {
      await this.redisStore.delete(key);
      throw error;
    }
  }

  private async checkForgotPasswordRateLimits(email: string): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_FOR_TESTS !== 'true') {
      return;
    }

    const emailHash = PasswordRecoveryService.hash(email);
    const cooldownKey = `cooldown:password/forgot:email:${emailHash}`;
    const cooldownAcquired = await this.redisStore.setIfAbsent(
      cooldownKey,
      '1',
      PasswordRecoveryConstants.COOLDOWN_SECONDS
    );
    if (!cooldownAcquired) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    const emailRateLimitKey = RedisKeyFactory.rateLimit('password/forgot', `email:${emailHash}`);
    const emailCount = await this.redisStore.increment(
      emailRateLimitKey,
      PasswordRecoveryConstants.RATE_LIMIT_WINDOW_SECONDS
    );
    if (emailCount > PasswordRecoveryConstants.RATE_LIMIT_FORGOT_EMAIL_MAX) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }
  }

  private async equalizeForgotPasswordTiming(startedAt: number): Promise<void> {
    const remaining = this.forgotTimingBudgetMs - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    }
  }

  private executeDummySink(email: string): void {
    const dummyToken = randomBytes(32).toString('base64url');
    const resetUrl = `${env.PUBLIC_SITE_URL}/reset-password?token=${dummyToken}`;
    const template = renderPasswordResetTemplate(resetUrl, email);
    createHash('sha256').update(`${template.subject}:${template.html}:${template.text}`).digest('hex');
  }

  private async issuePasswordResetEmail(userId: string, email: string): Promise<void> {
    await this.tokenRepository.revokePendingTokens(userId, 'password_reset');
    const rawToken = await this.tokenRepository.createToken(
      userId,
      'password_reset',
      PasswordRecoveryConstants.TOKEN_TTL_SECONDS
    );
    const resetUrl = `${env.PUBLIC_SITE_URL}/reset-password?token=${rawToken}`;
    const template = renderPasswordResetTemplate(resetUrl, email);

    try {
      await this.emailSender.send({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        templateId: 'password_reset',
      });
    } catch (error) {
      if (!(error instanceof EmailProviderTimeoutError)) {
        await this.tokenRepository.revokePendingTokens(userId, 'password_reset');
      }
      throw error;
    }
  }

  public async forgotPassword(
    email: string,
    _clientIp: string,
    idempotencyKey?: string
  ): Promise<void> {
    const startedAt = Date.now();
    const normalizedEmail = PasswordRecoveryService.normalizeEmail(email);
    const effectiveIdempotencyKey =
      idempotencyKey?.trim() ||
      PasswordRecoveryService.hash(
        `password/forgot:${normalizedEmail}:${Math.floor(Date.now() / 60_000)}`
      );

    await this.runWithIdempotency('password/forgot', effectiveIdempotencyKey, async () => {
      try {
        await this.checkForgotPasswordRateLimits(normalizedEmail);
        const user = await this.userRepository.findByEmail(normalizedEmail);

        // Only an account that can log in is eligible. Other states deliberately take
        // the same generic response path to avoid revealing account state.
        if (!user || user.status !== 'active') {
          this.executeDummySink(normalizedEmail);
          return;
        }

        try {
          await this.issuePasswordResetEmail(user.id, user.email);
        } catch (error) {
          logger.error(
            {
              errorCode: error instanceof Error ? error.name : 'UnknownError',
              userId: user.id,
              email: PasswordRecoveryService.redactEmail(user.email),
            },
            '[PasswordRecoveryService] Failed to send password reset email'
          );
          // The public contract remains generic. Hard failures revoke the fresh token;
          // a typed timeout leaves it valid because delivery outcome is unknown.
        }
      } finally {
        await this.equalizeForgotPasswordTiming(startedAt);
      }
    });
  }

  public async resetPassword(
    token: string,
    newPassword: string,
    _clientIp: string,
    idempotencyKey?: string
  ): Promise<void> {
    const rawToken = token.trim();
    const password = newPassword.trim();
    if (!rawToken || !password) {
      throw new TokenInvalidOrExpiredError();
    }

    this.passwordService.validatePolicy(password);
    const passwordHash = await this.passwordService.hash(password);
    const effectiveIdempotencyKey =
      idempotencyKey?.trim() || PasswordRecoveryService.hash(rawToken);

    await this.runWithIdempotency('password/reset', effectiveIdempotencyKey, async () => {
      await runInTransaction(async (tx: TransactionClient) => {
        const userId = await this.tokenRepository.consumeToken(rawToken, 'password_reset', tx);
        if (!userId) {
          throw new TokenInvalidOrExpiredError();
        }

        const user = await this.userRepository.findById(userId, tx);
        if (!user || user.status !== 'active') {
          throw new TokenInvalidOrExpiredError();
        }

        user.changePassword(passwordHash);
        await this.userRepository.update(user, tx);
        await this.sessionService.revokeAllSessions(user.id, 'password_reset', tx);
        await this.tokenRepository.revokePendingTokens(user.id, 'password_reset', tx);
      });
    });
  }
}
