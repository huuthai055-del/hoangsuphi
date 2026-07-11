import { z } from 'zod';

const positiveInt = () => z.coerce.number().int().positive();
const nonEmptyStr = () => z.string().min(1);

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: positiveInt().default(3001),
  HOST: nonEmptyStr().default('0.0.0.0'),
  API_VERSION: nonEmptyStr().default('v1'),
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

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: positiveInt().default(60_000),
  RATE_LIMIT_ANON_MAX: positiveInt().default(60),
  RATE_LIMIT_AUTH_MAX: positiveInt().default(300),

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
