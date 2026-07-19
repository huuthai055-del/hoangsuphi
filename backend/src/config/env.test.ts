import { describe, expect, it, afterEach, beforeEach } from 'bun:test';
import { envSchema } from './env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should default EMAIL_PROVIDER to fake and not require RESEND_API_KEY', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'api_key';
    process.env.CLOUDINARY_API_SECRET = 'api_secret';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.SEARCH_CURSOR_KEYS_JSON = `{"default": "${'c'.repeat(32)}"}`;
    process.env.SEARCH_CURSOR_ACTIVE_KEY_ID = 'default';

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.EMAIL_PROVIDER).toBe('fake');
      expect(result.data.EMAIL_SEND_TIMEOUT_MS).toBe(5000);
      expect(result.data.REDIS_URL).toBe('redis://localhost:6379');
    }
  });

  it('should fail if EMAIL_PROVIDER is resend but RESEND_API_KEY is missing', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'api_key';
    process.env.CLOUDINARY_API_SECRET = 'api_secret';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.SEARCH_CURSOR_KEYS_JSON = `{"default": "${'c'.repeat(32)}"}`;
    process.env.SEARCH_CURSOR_ACTIVE_KEY_ID = 'default';
    process.env.EMAIL_PROVIDER = 'resend';

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i: any) => i.path.includes('RESEND_API_KEY'));
      expect(issue).toBeDefined();
    }
  });

  it('should reject FakeEmailSender in staging and production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'api_key';
    process.env.CLOUDINARY_API_SECRET = 'api_secret';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.PUBLIC_SITE_URL = 'https://hoangsuphi.vn';
    process.env.SEARCH_CURSOR_KEYS_JSON = `{"default": "${'c'.repeat(32)}"}`;
    process.env.SEARCH_CURSOR_ACTIVE_KEY_ID = 'default';
    process.env.EMAIL_PROVIDER = 'fake';
    process.env.RESEND_API_KEY = undefined;

    const result = envSchema.safeParse(process.env);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('EMAIL_PROVIDER'))).toBe(true);
    }
  });

  it('should validate EMAIL_SEND_TIMEOUT_MS range', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'api_key';
    process.env.CLOUDINARY_API_SECRET = 'api_secret';
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.SEARCH_CURSOR_KEYS_JSON = `{"default": "${'c'.repeat(32)}"}`;
    process.env.SEARCH_CURSOR_ACTIVE_KEY_ID = 'default';

    process.env.EMAIL_SEND_TIMEOUT_MS = '500'; // Too small
    let result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);

    process.env.EMAIL_SEND_TIMEOUT_MS = '50000'; // Too large
    result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);

    process.env.EMAIL_SEND_TIMEOUT_MS = '15000'; // Valid
    result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
  });
});
