import { createHash } from 'node:crypto';

export const RedisKeyFactory = {
  rateLimit: (endpoint: string, identifier: string) => `ratelimit:${endpoint}:${identifier}`,
  idempotency: (context: string, key: string) => {
    const trimmed = (key || '').trim();
    if (!trimmed) {
      return `idempotency:${context}:empty`;
    }
    // If over 128 chars or contains characters outside standard safe set, hash it
    const isSafe = /^[A-Za-z0-9_-]{1,128}$/.test(trimmed);
    const safeKey = isSafe ? trimmed : createHash('sha256').update(trimmed).digest('hex');
    return `idempotency:${context}:${safeKey}`;
  },
  session: (sessionId: string) => `session:${sessionId}`,
} as const;
