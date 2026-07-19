import { ValidationError } from '../../../common/errors/http.errors';

export interface RedirectCursorData {
  createdAt: string;
  id: string;
}

const MAX_CURSOR_LENGTH = 512;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

export function encodeRedirectCursor(data: RedirectCursorData): string {
  return Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
}

export function decodeRedirectCursor(cursor: string): RedirectCursorData {
  if (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH || !BASE64URL_PATTERN.test(cursor)) {
    throw new ValidationError('Invalid cursor');
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Invalid cursor shape');
    }
    const record = parsed as Record<string, unknown>;
    const createdAt = record.createdAt;
    const id = record.id;
    if (
      typeof createdAt !== 'string' ||
      Number.isNaN(Date.parse(createdAt)) ||
      typeof id !== 'string' ||
      id.length === 0 ||
      id.length > 64
    ) {
      throw new Error('Invalid cursor shape');
    }
    return { createdAt, id };
  } catch {
    throw new ValidationError('Invalid cursor');
  }
}
