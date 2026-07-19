import { RateLimitError, TokenInvalidOrExpiredError } from '@/common/errors/http.errors';
import { env } from '@/config/env';
import { runInTransaction, type TransactionClient } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { RedisKeyFactory } from '@/lib/redis/redis-key.factory';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { EmailProviderTimeoutError } from '@/modules/email/email.errors';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import { renderEmailVerificationTemplate } from '@/modules/email/templates/email-verification.template';
import { createHash, randomBytes } from 'node:crypto';
import {
  EmailVerificationConstants,
  getResendTimingBudgetMs,
} from '../constants/email-verification.constants';
import type { IOneTimeTokenRepository } from '../repository/one-time-token.repository.interface';
import type { IUserRepository } from '../repository/users-repository.interface';

export interface IEmailVerificationService {
  issueAndSendVerificationEmail(
    userId: string,
    email: string,
    tx?: TransactionClient
  ): Promise<void>;
  resend(email: string, clientIp: string, idempotencyKey?: string): Promise<void>;
  confirm(token: string, clientIp: string, idempotencyKey?: string): Promise<void>;
}

export class EmailVerificationService implements IEmailVerificationService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: IOneTimeTokenRepository,
    private readonly emailSender: IEmailSender,
    private readonly redisStore: IRedisStore,
    resendTimingBudgetMs = getResendTimingBudgetMs(env.EMAIL_SEND_TIMEOUT_MS)
  ) {
    if (!Number.isFinite(resendTimingBudgetMs) || resendTimingBudgetMs <= 0) {
      throw new Error('resendTimingBudgetMs must be a positive finite number');
    }
    this.resendTimingBudgetMs = resendTimingBudgetMs;
  }

  private readonly resendTimingBudgetMs: number;

  private async checkResendRateLimits(email: string, clientIp: string): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_FOR_TESTS !== 'true') {
      return;
    }
    const emailHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    const ipKey = RedisKeyFactory.rateLimit('email-verification/resend', `ip:${clientIp}`);
    const emailKey = RedisKeyFactory.rateLimit('email-verification/resend', `email:${emailHash}`);
    const cooldownEmailKey = `cooldown:email-verification/resend:email:${emailHash}`;
    const cooldownIpKey = `cooldown:email-verification/resend:ip:${clientIp}`;

    // Check and set cooldowns (minimum 60s per contract)
    const emailCooldownSet = await this.redisStore.setIfAbsent(
      cooldownEmailKey,
      '1',
      EmailVerificationConstants.RESEND_COOLDOWN_SECONDS
    );
    const ipCooldownSet = await this.redisStore.setIfAbsent(
      cooldownIpKey,
      '1',
      EmailVerificationConstants.RESEND_COOLDOWN_SECONDS
    );
    if (!emailCooldownSet || !ipCooldownSet) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }

    // Check rate limits: 3/email/hr and 10/IP/hr
    const ipCount = await this.redisStore.increment(ipKey, EmailVerificationConstants.RATE_LIMIT_WINDOW_SECONDS);
    const emailCount = await this.redisStore.increment(emailKey, EmailVerificationConstants.RATE_LIMIT_WINDOW_SECONDS);

    if (
      ipCount > EmailVerificationConstants.RATE_LIMIT_IP_MAX ||
      emailCount > EmailVerificationConstants.RATE_LIMIT_EMAIL_MAX
    ) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }
  }

  private async checkConfirmRateLimits(clientIp: string): Promise<void> {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_FOR_TESTS !== 'true') {
      return;
    }
    const ipKey = RedisKeyFactory.rateLimit('email-verification/confirm', `ip:${clientIp}`);
    const ipCount = await this.redisStore.increment(ipKey, EmailVerificationConstants.RATE_LIMIT_WINDOW_SECONDS);

    if (ipCount > EmailVerificationConstants.RATE_LIMIT_CONFIRM_IP_MAX) {
      throw new RateLimitError('Too many requests. Please try again later.');
    }
  }

  private async runWithIdempotency<T>(
    context: string,
    idempotencyKey: string | undefined,
    fn: () => Promise<T>
  ): Promise<T> {
    const rawKey = (idempotencyKey || '').trim();
    if (!rawKey) {
      return await fn();
    }
    const safeKey = RedisKeyFactory.idempotency(context, rawKey);
    const acquired = await this.redisStore.setIfAbsent(
      safeKey,
      'PROCESSING',
      EmailVerificationConstants.IDEMPOTENCY_LOCK_SECONDS
    );
    if (!acquired) {
      const status = await this.redisStore.get(safeKey);
      if (status === 'DONE') {
        return undefined as unknown as T;
      }
      throw new RateLimitError('Yêu cầu đang được xử lý, vui lòng đợi.');
    }
    try {
      const result = await fn();
      await this.redisStore.set(safeKey, 'DONE', EmailVerificationConstants.IDEMPOTENCY_TTL_SECONDS);
      return result;
    } catch (err) {
      await this.redisStore.delete(safeKey);
      throw err;
    }
  }

  private executeDummySink(template: { subject: string; html: string; text: string }): void {
    // Local no-op sink to simulate local data processing/serialization without invoking
    // IEmailSender production network I/O. Prevents real emails to dummy addresses (R-005).
    createHash('sha256').update(`${template.subject}:${template.html}:${template.text}`).digest('hex');
  }

  private async executeEqualizedDelay(startTimeMs: number): Promise<void> {
    // The budget is at least the configured provider timeout plus local-work grace.
    // This prevents a slow-but-bounded provider call from exposing a pending account.
    const elapsed = Date.now() - startTimeMs;
    if (elapsed < this.resendTimingBudgetMs) {
      await new Promise((resolve) => setTimeout(resolve, this.resendTimingBudgetMs - elapsed));
    }
  }

  public async issueAndSendVerificationEmail(
    userId: string,
    email: string,
    tx?: TransactionClient
  ): Promise<void> {
    // 1. Revoke any existing pending verification tokens for this user
    await this.tokenRepo.revokePendingTokens(userId, 'email_verification', tx);

    // 2. Create new verification token (TTL 24 hours = 86400 seconds)
    const rawToken = await this.tokenRepo.createToken(
      userId,
      'email_verification',
      EmailVerificationConstants.TOKEN_TTL_SECONDS,
      tx
    );

    // 3. Build verification URL using PUBLIC_SITE_URL or default
    const baseUrl = env.PUBLIC_SITE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${rawToken}`;

    // 4. Render template
    const template = renderEmailVerificationTemplate(verificationUrl, email);

    // 5. Send email via IEmailSender
    try {
      await this.emailSender.send({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        templateId: 'email_verification',
      });
    } catch (error) {
      const isTimeout = error instanceof EmailProviderTimeoutError;
      // As per Contract v0.5 Section 3.4:
      // Provider Hard Failure: Nếu Provider ném lỗi xác định (sai key, unauthenticated, v.v.), vô hiệu hóa ngay token vừa tạo.
      // Provider Timeout (Unknown): Nếu timeout mà không rõ thư đã đi hay chưa, KHÔNG tự động vô hiệu hóa token.
      if (!isTimeout) {
        await this.tokenRepo.revokePendingTokens(userId, 'email_verification', tx);
      }
      throw error;
    }
  }

  public async resend(
    email: string,
    clientIp: string,
    idempotencyKey?: string
  ): Promise<void> {
    const trimmedEmail = (email || '').trim().toLowerCase();
    // Fallback key if idempotencyKey header is missing: hash(email + window)
    const effectiveKey =
      (idempotencyKey || '').trim() ||
      createHash('sha256')
        .update(`${trimmedEmail}:${Math.floor(Date.now() / 60000)}`)
        .digest('hex');

    return this.runWithIdempotency('email-verification/resend', effectiveKey, async () => {
      // Begin timing equalization window (R-006)
      const executionStartMs = Date.now();

      // 1. Check rate limits & cooldown (email & IP)
      await this.checkResendRateLimits(trimmedEmail, clientIp);

      // 2. Find user by email
      // Note: If user not found, or user is already verified (status !== 'pending_verification'),
      // we MUST NOT throw an error or reveal account status.
      // As per Contract v0.5 Section 3.4:
      // Forgot Password / Resend Verification: Phải luôn trả về status 202 Accepted cùng generic message cố định.
      const user = await this.userRepo.findByEmail(trimmedEmail);
      if (!user || user.status !== 'pending_verification') {
        // Never write a dummy token: one_time_tokens.user_id is a foreign key and
        // a synthetic UUID would turn the generic 202 response into a database error.
        // Keep local template work only; the response budget below equalizes provider latency.
        const baseUrl = env.PUBLIC_SITE_URL || 'http://localhost:3000';
        const dummyToken = randomBytes(32).toString('base64url');
        const dummyUrl = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${dummyToken}`;
        const template = renderEmailVerificationTemplate(dummyUrl, trimmedEmail);

        // Local-only work. It must not invoke IEmailSender or persistence.
        this.executeDummySink(template);

        await this.executeEqualizedDelay(executionStartMs);
        return;
      }

      // 3. Issue and send email
      try {
        await this.issueAndSendVerificationEmail(user.id, user.email);
      } catch (error) {
        // If error occurred (and token revoked if hard failure inside issueAndSendVerificationEmail),
        // we log sanitized error without throwing, so resend() still returns 202 Accepted with generic message.
        const redactedEmail = user.email.replace(/(?<=^.{1})[^@\n]+(?=@)/, '***');
        logger.error(
          {
            errorCode: error instanceof Error ? error.name : 'UnknownError',
            userId: user.id,
            email: redactedEmail,
          },
          '[EmailVerificationService] Error sending verification email during resend'
        );
      }

      // Equalize final time to constant budget target (R-006)
      await this.executeEqualizedDelay(executionStartMs);
    });
  }

  public async confirm(
    token: string,
    clientIp: string,
    idempotencyKey?: string
  ): Promise<void> {
    const rawToken = (token || '').trim();
    if (!rawToken) {
      throw new TokenInvalidOrExpiredError();
    }
    // Fallback key if idempotencyKey header is missing: hash(token)
    const effectiveKey =
      (idempotencyKey || '').trim() ||
      createHash('sha256').update(rawToken).digest('hex');

    return this.runWithIdempotency('email-verification/confirm', effectiveKey, async () => {
      // 1. Check IP rate limit for confirm
      await this.checkConfirmRateLimits(clientIp);

      // 2. Consume token atomically inside a database transaction
      await runInTransaction(async (tx) => {
        const userId = await this.tokenRepo.consumeToken(rawToken, 'email_verification', tx);
        if (!userId) {
          throw new TokenInvalidOrExpiredError();
        }

        const user = await this.userRepo.findById(userId, tx);
        if (!user) {
          throw new TokenInvalidOrExpiredError();
        }

        // 3. Verify user status is pending_verification
        if (user.status !== 'pending_verification') {
          throw new TokenInvalidOrExpiredError();
        }

        // 4. Update user status to active
        user.verifyEmail();
        await this.userRepo.update(user, tx);
      });
    });
  }
}
