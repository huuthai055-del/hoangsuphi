import { describe, expect, test } from 'bun:test';
import { parseSearchQuery } from '../dto/search.dto';
import type { SearchKeyset } from '../repository/search-read-model';
import { SearchCursorCodec } from './search-cursor';

const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(32);
const RESULT_ID = '019f5ff3-2000-7000-8000-000000000001';

function makeCodec(
  activeKeyId = 'current',
  keys: Readonly<Record<string, string>> = { current: SECRET_A }
): SearchCursorCodec {
  return new SearchCursorCodec({ activeKeyId, keys });
}

function mutateBase64url(value: string): string {
  const index = Math.floor(value.length / 2);
  const replacement = value[index] === 'A' ? 'B' : 'A';
  return `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`;
}

describe('SearchCursorCodec', () => {
  test.each([
    {
      sort: 'relevance',
      sortValue: 0.3125,
      entityType: 'business',
      id: RESULT_ID,
    },
    {
      sort: 'newest',
      sortValue: '2026-07-14 09:30:00.123456+00',
      entityType: 'article',
      id: RESULT_ID,
    },
    {
      sort: 'rating',
      sortValue: null,
      entityType: 'attraction',
      id: RESULT_ID,
    },
    {
      sort: 'price_asc',
      sortValue: '100000.00',
      entityType: 'business',
      id: RESULT_ID,
    },
    {
      sort: 'price_desc',
      sortValue: null,
      entityType: 'article',
      id: RESULT_ID,
    },
  ] satisfies SearchKeyset[])('round-trips the exact $sort keyset', (keyset: SearchKeyset) => {
    const codec = makeCodec();
    const query = parseSearchQuery({ q: 'homestay', sort: 'relevance' });
    const fingerprint = codec.fingerprint(query);
    const cursor = codec.encode(keyset, fingerprint);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(cursor.length).toBeLessThanOrEqual(512);
    expect(codec.decode(cursor, fingerprint)).toEqual(keyset);
  });

  test('rejects tampered, malformed and request-mismatched cursors', () => {
    const codec = makeCodec();
    const firstQuery = parseSearchQuery({ q: 'homestay' });
    const otherQuery = parseSearchQuery({ q: 'ruộng bậc thang' });
    const fingerprint = codec.fingerprint(firstQuery);
    const cursor = codec.encode(
      { sort: 'relevance', sortValue: 0.25, entityType: 'place', id: RESULT_ID },
      fingerprint
    );

    expect(codec.decode(mutateBase64url(cursor), fingerprint)).toBeNull();
    expect(codec.decode(cursor, codec.fingerprint(otherQuery))).toBeNull();
    expect(codec.decode('not.a.cursor', fingerprint)).toBeNull();
  });

  test('supports key rotation while issuing only with the active key', () => {
    const oldCodec = makeCodec('old', { old: SECRET_A });
    const query = parseSearchQuery({ types: 'business' });
    const fingerprint = oldCodec.fingerprint(query);
    const keyset: SearchKeyset = {
      sort: 'newest',
      sortValue: '2026-07-14 09:30:00.123456+00',
      entityType: 'business',
      id: RESULT_ID,
    };
    const oldCursor = oldCodec.encode(keyset, fingerprint);
    const rotatedCodec = makeCodec('new', { old: SECRET_A, new: SECRET_B });

    expect(rotatedCodec.decode(oldCursor, fingerprint)).toEqual(keyset);
    const newCursor = rotatedCodec.encode(keyset, fingerprint);
    expect(oldCodec.decode(newCursor, fingerprint)).toBeNull();
    expect(rotatedCodec.decode(newCursor, fingerprint)).toEqual(keyset);
  });

  test('fingerprint excludes the opaque cursor and cursor payload excludes raw q', () => {
    const codec = makeCodec();
    const withoutCursor = parseSearchQuery({ q: 'secret search phrase' });
    const withCursor = parseSearchQuery({ q: 'secret search phrase', cursor: 'abc_DEF' });
    const fingerprint = codec.fingerprint(withoutCursor);
    const cursor = codec.encode(
      { sort: 'relevance', sortValue: 0.5, entityType: 'article', id: RESULT_ID },
      fingerprint
    );
    const decodedEnvelope = Buffer.from(cursor, 'base64url').toString('utf8');

    expect(codec.fingerprint(withCursor)).toBe(fingerprint);
    expect(decodedEnvelope).not.toContain('secret search phrase');
    expect(decodedEnvelope).toContain(fingerprint);
  });

  test('rejects weak key material and a missing active key', () => {
    expect(() => makeCodec('current', { current: 'weak' })).toThrow('at least 32 bytes');
    expect(() => makeCodec('missing', { current: SECRET_A })).toThrow('active key is missing');
  });
});
