import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../../app';
import { container } from '@/common/di/container';
import type { FakeEmailSender } from '@/modules/email/fake-email-sender';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import type { FakeRedisStore } from '@/lib/redis/fake-redis-store';
import type { IRedisStore } from '@/lib/redis/redis-store.interface';

describe('Contact Route (Integration)', () => {
  const app = createApp();
  let emailSender: FakeEmailSender;
  let redisStore: FakeRedisStore;

  beforeAll(() => {
    // Reset DI and ensure FakeEmailSender is used
    container.reset();
    emailSender = container.resolve<IEmailSender>('EmailSender') as FakeEmailSender;
    redisStore = container.resolve<IRedisStore>('RedisStore') as FakeRedisStore;
  });

  beforeEach(() => {
    emailSender.clearCapture();
    emailSender.setSimulateFailure(false);
    emailSender.setSimulateTimeout(false);
    redisStore.clear();
  });

  afterAll(() => {
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'false';
  });

  it('should process contact form successfully and return 200', async () => {
    const res = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '0123456789',
        subject: 'Test Subject',
        message: 'This is a long enough message to pass validation.',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toBe('Liên hệ đã được gửi thành công.');

    const captured = emailSender.getCapturedEmails();
    expect(captured).toHaveLength(1);
  });

  it('should reject newlines in name to prevent header injection', async () => {
    const res = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test\r\nUser',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a long enough message to pass validation.',
      }),
    });

    expect(res.status).toBe(400); // Zod validation fails
    const body = await res.json();
    expect(body.code).toBe('VAL_001');
  });

  it('should reject newlines in subject', async () => {
    const res = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test\nSubject',
        message: 'This is a long enough message to pass validation.',
      }),
    });

    expect(res.status).toBe(400);
  });

  it('strictly rejects unknown fields and CR/LF in reply-to candidates', async () => {
    const unknownField = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a long enough message to pass validation.',
        unexpected: 'must not be silently ignored',
      }),
    });
    const injectedEmail = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com\r\nBcc: attacker@example.com',
        subject: 'Test Subject',
        message: 'This is a long enough message to pass validation.',
      }),
    });

    expect(unknownField.status).toBe(400);
    expect(injectedEmail.status).toBe(400);
  });

  it('should return 503 if provider throws hard failure', async () => {
    emailSender.setSimulateFailure(true);

    const res = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a long enough message to pass validation.',
      }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_DELIVERY_UNAVAILABLE');
  });

  it('returns the same 503 contract when the provider times out', async () => {
    emailSender.setSimulateTimeout(true);

    const res = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'This is a long enough message to pass validation.',
      }),
    });

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('EMAIL_DELIVERY_UNAVAILABLE');
  });

  it('deduplicates retries with Idempotency-Key without retaining contact data', async () => {
    const body = JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a long enough message to pass validation.',
    });
    const request = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'contact-route-001' },
      body,
    };

    expect((await app.request('/api/v1/contact', request)).status).toBe(200);
    expect((await app.request('/api/v1/contact', request)).status).toBe(200);
    expect(emailSender.getCapturedEmails()).toHaveLength(1);
  });

  it('enforces the five-per-hour IP limit and permits Idempotency-Key via CORS', async () => {
    process.env.ENABLE_RATE_LIMIT_FOR_TESTS = 'true';
    const body = JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a long enough message to pass validation.',
    });

    for (let index = 0; index < 5; index += 1) {
      expect(
        (
          await app.request('/api/v1/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `contact-limit-${index}` },
            body,
          })
        ).status
      ).toBe(200);
    }
    const rejected = await app.request('/api/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'contact-limit-6' },
      body,
    });
    const preflight = await app.request('/api/v1/contact', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Idempotency-Key',
      },
    });

    expect(rejected.status).toBe(429);
    expect(preflight.headers.get('access-control-allow-headers')).toContain('Idempotency-Key');
  });
});
