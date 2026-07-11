import { env } from './env';

export const AppConfig = {
  server: {
    port: env.PORT,
    host: env.HOST,
    apiPrefix: `/api/${env.API_VERSION}`,
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 50,
  },

  upload: {
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },

  auth: {
    bcryptRounds: 12,
    maxActiveSessions: 5, // Tối đa 5 thiết bị đăng nhập cùng lúc
    refreshTokenRotation: true, // Rotate refresh token mỗi lần dùng
  },

  cache: {
    region: 60 * 60 * 24, // 24h
    business: 60 * 15, // 15m
    article: 60 * 60, // 1h
    search: 60 * 5, // 5m
    healthCheck: 10, // 10s
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    anon: env.RATE_LIMIT_ANON_MAX,
    auth: env.RATE_LIMIT_AUTH_MAX,
    login: 10, // 10 lần/phút cho login
    passwordReset: 5, // 5 lần/phút
  },
} as const;

export type AppConfig = typeof AppConfig;
