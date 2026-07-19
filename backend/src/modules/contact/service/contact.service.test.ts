import { describe, expect, it, beforeEach } from 'bun:test';
import { ContactService } from './contact.service';
import { FakeEmailSender } from '@/modules/email/fake-email-sender';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import { env } from '@/config/env';
import { EmailDeliveryUnavailableError } from '@/common/errors/http.errors';
import { FakeRedisStore } from '@/lib/redis/fake-redis-store';

describe('ContactService', () => {
  let emailSender: FakeEmailSender;
  let redisStore: FakeRedisStore;
  let contactService: ContactService;

  beforeEach(() => {
    emailSender = new FakeEmailSender();
    redisStore = new FakeRedisStore();
    contactService = new ContactService(emailSender, redisStore);
  });

  it('should send email successfully with escaped HTML and plain text', async () => {
    const dto = {
      name: 'John Doe <script>alert("xss")</script>',
      email: 'john@example.com',
      phone: '0123456789',
      subject: 'Hello World',
      message: 'This is a message\nWith a newline and <script> tag.',
    };

    await contactService.submitContact(dto);

    const captured = emailSender.getCapturedEmails();
    expect(captured).toHaveLength(1);
    // biome-ignore lint/style/noNonNullAssertion: we just checked length
    const email = captured[0]!;

    expect(email.to).toBe(env.CONTACT_RECIPIENT_EMAIL);
    expect(email.from).toBe(`${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`);
    expect(email.replyTo).toBe('john@example.com');
    expect(email.subject).toBe('[Liên hệ website] Hello World');
    expect(email.templateId).toBe('contact_notification');
    expect(email.idempotencyKey).toMatch(/^contact:[a-f0-9]{64}$/u);

    // Test escaping in HTML
    expect(email.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(email.html).toContain('This is a message<br />With a newline and &lt;script&gt; tag.');

    // Test plain text does not escape but keeps newlines
    expect(email.text).toContain('John Doe <script>alert("xss")</script>');
    expect(email.text).toContain('This is a message\nWith a newline and <script> tag.');
  });

  it('should throw EmailDeliveryUnavailableError on hard failure', async () => {
    emailSender.setSimulateFailure(true);

    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Hello World',
      message: 'This is a message',
    };

    await expect(contactService.submitContact(dto)).rejects.toThrow(EmailDeliveryUnavailableError);
  });

  it('maps provider timeouts to the same safe delivery error', async () => {
    emailSender.setSimulateTimeout(true);

    await expect(
      contactService.submitContact({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Hello World',
        message: 'This is a message that is long enough.',
      })
    ).rejects.toThrow(EmailDeliveryUnavailableError);
  });

  it('does not leak an untyped provider failure', async () => {
    const unknownFailureSender: IEmailSender = {
      send: async () => {
        throw new Error('provider response contained an internal secret');
      },
    };
    contactService = new ContactService(unknownFailureSender, redisStore);

    await expect(
      contactService.submitContact({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Hello World',
        message: 'This is a message that is long enough.',
      })
    ).rejects.toThrow(EmailDeliveryUnavailableError);
  });

  it('sends only once for the same completed idempotency key', async () => {
    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Hello World',
      message: 'This is a message that is long enough.',
    };

    await contactService.submitContact(dto, 'contact-retry-001');
    await contactService.submitContact(dto, 'contact-retry-001');

    expect(emailSender.getCapturedEmails()).toHaveLength(1);
  });

  it('hashes fallback idempotency material before writing a Redis key', async () => {
    const calls: string[] = [];
    const setIfAbsent = redisStore.setIfAbsent.bind(redisStore);
    redisStore.setIfAbsent = async (key, value, ttlSeconds) => {
      calls.push(key);
      return setIfAbsent(key, value, ttlSeconds);
    };
    const dto = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Hello World',
      message: 'Unique contact message that must not appear in a Redis key.',
    };

    await contactService.submitContact(dto);

    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain(dto.email);
    expect(calls[0]).not.toContain(dto.message);
  });
});
