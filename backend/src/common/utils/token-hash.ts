import { createHash } from 'node:crypto';

/**
 * Creates a deterministic SHA-256 hash of a given token string.
 * This is safe for repository lookups (findByHash) and prevents DB leaks.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
