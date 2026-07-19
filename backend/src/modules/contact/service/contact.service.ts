import type { IEmailSender } from '@/modules/email/email-sender.interface';
import { EmailProviderError } from '@/modules/email/email.errors';
import { env } from '@/config/env';
import { EmailDeliveryUnavailableError, RateLimitError } from '@/common/errors/http.errors';
import type { ContactDto } from '../dto/contact.dto';
import { renderContactNotificationTemplate } from '@/modules/email/templates/contact-notification.template';
import { logger } from '@/lib/logger';
import { RedisKeyFactory } from '@/lib/redis/redis-key.factory';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';
import { createHash, randomUUID } from 'node:crypto';
import { ContactConstants } from '../contact.constants';

export class ContactService {
  constructor(
    private readonly emailSender: IEmailSender,
    private readonly redisStore: IRedisStore
  ) {}

  private async runWithIdempotency(
    idempotencyKey: string | undefined,
    dto: ContactDto,
    action: () => Promise<void>
  ): Promise<void> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const fallbackKey = createHash('sha256')
      .update(`${normalizedEmail}:${dto.message}:${Math.floor(Date.now() / 60_000)}`)
      .digest('hex');
    const rawKey = idempotencyKey?.trim() || fallbackKey;
    const redisKey = RedisKeyFactory.idempotency('contact', rawKey);
    const acquired = await this.redisStore.setIfAbsent(
      redisKey,
      'PROCESSING',
      ContactConstants.IDEMPOTENCY_LOCK_SECONDS
    );

    if (!acquired) {
      const status = await this.redisStore.get(redisKey);
      if (status === 'DONE') {
        return;
      }

      throw new RateLimitError('Yêu cầu liên hệ đang được xử lý. Vui lòng thử lại sau.');
    }

    try {
      await action();
      await this.redisStore.set(redisKey, 'DONE', ContactConstants.IDEMPOTENCY_TTL_SECONDS);
    } catch (error) {
      await this.redisStore.delete(redisKey);
      throw error;
    }
  }

  public async submitContact(
    dto: ContactDto,
    idempotencyKey?: string,
    requestId = `req_${randomUUID()}`
  ): Promise<void> {
    await this.runWithIdempotency(idempotencyKey, dto, async () => {
      const template = renderContactNotificationTemplate(dto);
      const providerIdempotencyKey = `contact:${createHash('sha256')
        .update(idempotencyKey?.trim() || `${dto.email.trim().toLowerCase()}:${dto.message}`)
        .digest('hex')}`;

      try {
        const result = await this.emailSender.send({
          to: env.CONTACT_RECIPIENT_EMAIL,
          from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
          replyTo: dto.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          idempotencyKey: providerIdempotencyKey,
          templateId: 'contact_notification',
          requestId,
        });

        logger.info(
          { requestId, provider: result.provider, providerMessageId: result.messageId },
          '[ContactService] Contact notification delivered'
        );
      } catch (error) {
        logger.error(
          {
            requestId,
            provider: error instanceof EmailProviderError ? error.provider : 'unknown',
            errorCode: error instanceof Error ? error.name : 'UnknownError',
          },
          '[ContactService] Contact notification delivery failed'
        );

        // Adapters must not leak provider-specific responses to callers. Unknown adapter failures
        // are treated as delivery failures as well, while their sanitized class is retained in logs.
        throw new EmailDeliveryUnavailableError();
      }
    });
  }
}
