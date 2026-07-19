import { describe, expect, it } from 'bun:test';
import { ValidationError } from '../../../common/errors/http.errors';
import { decodeRedirectCursor, encodeRedirectCursor } from './redirect-cursor.codec';

describe('redirect cursor codec', () => {
  const cursorData = {
    createdAt: '2026-07-19T10:00:00.000Z',
    id: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('round-trips a valid cursor', () => {
    expect(decodeRedirectCursor(encodeRedirectCursor(cursorData))).toEqual(cursorData);
  });

  it('rejects malformed, oversized, or invalid-shaped cursors', () => {
    const invalidShape = Buffer.from(JSON.stringify({ createdAt: 'not-a-date' })).toString('base64url');
    for (const cursor of ['not-base64-json', 'a'.repeat(513), invalidShape]) {
      expect(() => decodeRedirectCursor(cursor)).toThrow(ValidationError);
    }
  });
});
