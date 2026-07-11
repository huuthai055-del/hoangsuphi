import pino from 'pino';
import { env, isDev } from '@/config/env';
import { requestStore } from './context';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',
  'password',
  'token',
  'refreshToken',
  'accessToken',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  mixin() {
    const store = requestStore.getStore();
    return store ? { requestId: store.requestId, userId: store.userId } : {};
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        },
      }
    : undefined,
});

export const auditLogger = logger.child({ type: 'audit' });
