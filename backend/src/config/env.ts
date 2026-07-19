import { z } from 'zod';

const positiveInt = () => z.coerce.number().int().positive();
const nonEmptyStr = () => z.string().min(1);
const searchCursorKeyId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/u);

function parseSearchCursorKeys(value: string): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}

export const envSchema = z
  .object({
    // Server
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: positiveInt().default(3001),
    HOST: nonEmptyStr().default('0.0.0.0'),
    API_VERSION: nonEmptyStr().default('v1'),
    PUBLIC_SITE_URL: z.string().url().optional(),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:3001')
      .transform((s) => s.split(',')),

    // Database
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_MIN: positiveInt().default(2),
    DATABASE_POOL_MAX: positiveInt().default(10),
    DATABASE_IDLE_TIMEOUT_MS: positiveInt().default(30_000),
    DATABASE_CONNECT_TIMEOUT_MS: positiveInt().default(5_000),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(64, 'JWT_ACCESS_SECRET must be at least 64 characters'),
    JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters'),
    JWT_ACCESS_EXPIRES_IN: nonEmptyStr().default('15m'),
    JWT_REFRESH_EXPIRES_IN: nonEmptyStr().default('30d'),

    // Search cursor integrity and key rotation
    SEARCH_CURSOR_ACTIVE_KEY_ID: searchCursorKeyId.default('v1'),
    SEARCH_CURSOR_KEYS_JSON: z.string().min(1).optional(),

    // Media storage (required outside development/test)
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: positiveInt().default(60_000),
    RATE_LIMIT_ANON_MAX: positiveInt().default(60),
    RATE_LIMIT_AUTH_MAX: positiveInt().default(300),
    TRUST_PROXY: z
      .union([z.boolean(), z.string().transform((v) => v === 'true')])
      .default(false),

    // Logging
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_PRETTY: z
      .string()
      .transform((v) => v === 'true')
      .default('false'),

    // Typesense (Optional for initial boot)
    TYPESENSE_HOST: nonEmptyStr().default('localhost'),
    TYPESENSE_PORT: positiveInt().default(8108),
    TYPESENSE_PROTOCOL: z.enum(['http', 'https']).default('http'),
    TYPESENSE_API_KEY: z.string().default('placeholder_api_key'),

    // Email
    EMAIL_PROVIDER: z.enum(['fake', 'resend']).default('fake'),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM_NAME: z.string().default('Hoàng Su Phì Portal'),
    EMAIL_FROM_ADDRESS: z.string().default('noreply@hoangsuphi.vn'),
    EMAIL_REPLY_TO: z.string().default('contact@hoangsuphi.vn'),
    CONTACT_RECIPIENT_EMAIL: z.string().default('contact@hoangsuphi.vn'),
    EMAIL_SEND_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),

    // Redis
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
  })
  .superRefine((value, context) => {
    // Validate PUBLIC_SITE_URL
    const publicSiteUrl = value.PUBLIC_SITE_URL;
    if (value.NODE_ENV === 'staging' || value.NODE_ENV === 'production') {
      if (!publicSiteUrl) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PUBLIC_SITE_URL'],
          message: 'PUBLIC_SITE_URL is required in staging and production',
        });
      } else {
        if (!publicSiteUrl.startsWith('https://')) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['PUBLIC_SITE_URL'],
            message: 'PUBLIC_SITE_URL must use HTTPS protocol in staging and production',
          });
        }
        if (publicSiteUrl.endsWith('/')) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['PUBLIC_SITE_URL'],
            message: 'PUBLIC_SITE_URL must not contain a trailing slash',
          });
        }
        try {
          const urlObj = new URL(publicSiteUrl);
          if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['PUBLIC_SITE_URL'],
              message: 'PUBLIC_SITE_URL must not contain a path',
            });
          }
          if (urlObj.search || urlObj.hash || urlObj.username || urlObj.password) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['PUBLIC_SITE_URL'],
              message: 'PUBLIC_SITE_URL must not contain query, fragment, or credentials',
            });
          }
        } catch {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['PUBLIC_SITE_URL'],
            message: 'PUBLIC_SITE_URL is not a valid absolute URL',
          });
        }
      }
    } else {
      // In development/test, fallback to http://localhost:3000 if not provided
      if (!publicSiteUrl) {
        value.PUBLIC_SITE_URL = 'http://localhost:3000';
      } else {
        if (publicSiteUrl.endsWith('/')) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['PUBLIC_SITE_URL'],
            message: 'PUBLIC_SITE_URL must not contain a trailing slash',
          });
        }
        try {
          const urlObj = new URL(publicSiteUrl);
          if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['PUBLIC_SITE_URL'],
              message: 'PUBLIC_SITE_URL must not contain a path',
            });
          }
          if (urlObj.search || urlObj.hash || urlObj.username || urlObj.password) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['PUBLIC_SITE_URL'],
              message: 'PUBLIC_SITE_URL must not contain query, fragment, or credentials',
            });
          }
        } catch {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['PUBLIC_SITE_URL'],
            message: 'PUBLIC_SITE_URL is not a valid absolute URL',
          });
        }
      }
    }

    if (value.NODE_ENV === 'staging' || value.NODE_ENV === 'production') {
      for (const key of [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
      ] as const) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in staging and production`,
          });
        }
      }
    }

    const keysJson = value.SEARCH_CURSOR_KEYS_JSON;
    if (keysJson === undefined) {
      if (value.NODE_ENV === 'staging' || value.NODE_ENV === 'production') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SEARCH_CURSOR_KEYS_JSON'],
          message: 'SEARCH_CURSOR_KEYS_JSON is required in staging and production',
        });
      }
    } else {
      const keys = parseSearchCursorKeys(keysJson);
      if (keys === null || Object.keys(keys).length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SEARCH_CURSOR_KEYS_JSON'],
          message: 'SEARCH_CURSOR_KEYS_JSON must be a non-empty JSON object',
        });
      } else {
        for (const [keyId, secret] of Object.entries(keys)) {
          if (!searchCursorKeyId.safeParse(keyId).success) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['SEARCH_CURSOR_KEYS_JSON'],
              message: `Search cursor key ID ${keyId} is invalid`,
            });
          }
          if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['SEARCH_CURSOR_KEYS_JSON'],
              message: `Search cursor key ${keyId} must contain at least 32 UTF-8 bytes`,
            });
          }
        }

        if (!Object.hasOwn(keys, value.SEARCH_CURSOR_ACTIVE_KEY_ID)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['SEARCH_CURSOR_ACTIVE_KEY_ID'],
            message: 'Active Search cursor key must exist in SEARCH_CURSOR_KEYS_JSON',
          });
        }
      }
    }

    // Email constraints
    if (
      (value.NODE_ENV === 'staging' || value.NODE_ENV === 'production') &&
      value.EMAIL_PROVIDER !== 'resend'
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EMAIL_PROVIDER'],
        message:
          'EMAIL_PROVIDER must be resend in staging and production; FakeEmailSender is restricted to development and test',
      });
    }

    if (value.EMAIL_PROVIDER === 'resend' && !value.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when EMAIL_PROVIDER is resend',
      });
    }
  });

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(_parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = _parsed.data;

export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
export const isProd = env.NODE_ENV === 'production';
export const isStaging = env.NODE_ENV === 'staging';
