import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SearchCursorKeyring } from '@/modules/search/service/search-cursor';
import { InvalidPublicCatalogCursorError } from './public-catalog.errors';
import type {
  PublicCatalogCursorKeyset,
  PublicCatalogListQuery,
  PublicCatalogSort,
} from './public-catalog.types';

const CURSOR_VERSION = 1;
const MAX_CURSOR_LENGTH = 768;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

interface CursorBody {
  v: 1;
  kid: string;
  fp: string;
  key: {
    sort: PublicCatalogSort;
    sortTimestamp: string | null;
    nameKey: string;
    id: string;
  };
}

interface CursorEnvelope {
  body: CursorBody;
  mac: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 40) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isCursorBody(value: unknown): value is CursorBody {
  if (!isRecord(value) || !hasExactKeys(value, ['v', 'kid', 'fp', 'key'])) return false;
  if (value.v !== CURSOR_VERSION) return false;
  if (typeof value.kid !== 'string' || !KEY_ID_PATTERN.test(value.kid)) return false;
  if (typeof value.fp !== 'string' || !SHA256_PATTERN.test(value.fp)) return false;
  if (
    !isRecord(value.key) ||
    !hasExactKeys(value.key, ['sort', 'sortTimestamp', 'nameKey', 'id'])
  ) {
    return false;
  }
  if (value.key.sort !== 'newest' && value.key.sort !== 'name') return false;
  if (value.key.sort === 'newest' && !isIsoDate(value.key.sortTimestamp)) return false;
  if (value.key.sort === 'name' && value.key.sortTimestamp !== null) return false;
  return (
    typeof value.key.nameKey === 'string' &&
    value.key.nameKey.length >= 1 &&
    value.key.nameKey.length <= 255 &&
    typeof value.key.id === 'string' &&
    UUID_PATTERN.test(value.key.id)
  );
}

function isCursorEnvelope(value: unknown): value is CursorEnvelope {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['body', 'mac']) &&
    isCursorBody(value.body) &&
    typeof value.mac === 'string' &&
    BASE64URL_PATTERN.test(value.mac)
  );
}

export class PublicCatalogCursorCodec {
  private readonly activeKeyId: string;
  private readonly keys: ReadonlyMap<string, Uint8Array>;

  constructor(keyring: SearchCursorKeyring) {
    const keys = new Map<string, Uint8Array>();
    for (const [keyId, secret] of Object.entries(keyring.keys)) {
      if (!KEY_ID_PATTERN.test(keyId)) throw new Error('Public catalog cursor key ID is invalid');
      const bytes = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
      if (bytes.byteLength < 32)
        throw new Error('Public catalog cursor key must contain at least 32 bytes');
      keys.set(keyId, bytes);
    }
    if (!KEY_ID_PATTERN.test(keyring.activeKeyId) || !keys.has(keyring.activeKeyId)) {
      throw new Error('Public catalog cursor active key is unavailable');
    }
    this.activeKeyId = keyring.activeKeyId;
    this.keys = keys;
  }

  fingerprint(query: PublicCatalogListQuery): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          v: CURSOR_VERSION,
          kind: query.kind,
          limit: query.limit,
          sort: query.sort,
          regionSlug: query.regionSlug,
          businessTypeSlug: query.businessTypeSlug,
          categorySlug: query.categorySlug,
          amenitySlugs: query.amenitySlugs,
          parentRegionSlug: query.parentRegionSlug,
          order:
            query.sort === 'newest' ? 'updatedAt:desc,nameKey:asc,id:asc' : 'nameKey:asc,id:asc',
        })
      )
      .digest('hex');
  }

  encode(keyset: PublicCatalogCursorKeyset, fingerprint: string): string {
    if (!SHA256_PATTERN.test(fingerprint)) throw new Error('Public catalog fingerprint is invalid');
    const secret = this.keys.get(this.activeKeyId);
    if (!secret) throw new Error('Public catalog cursor active key is unavailable');
    const body: CursorBody = {
      v: CURSOR_VERSION,
      kid: this.activeKeyId,
      fp: fingerprint,
      key: {
        sort: keyset.sort,
        sortTimestamp: keyset.sortTimestamp?.toISOString() ?? null,
        nameKey: keyset.nameKey,
        id: keyset.id,
      },
    };
    const mac = createHmac('sha256', secret).update(JSON.stringify(body)).digest('base64url');
    const cursor = Buffer.from(JSON.stringify({ body, mac }), 'utf8').toString('base64url');
    if (cursor.length > MAX_CURSOR_LENGTH)
      throw new Error('Public catalog cursor exceeds length limit');
    return cursor;
  }

  decode(
    cursor: string,
    fingerprint: string,
    expectedSort: PublicCatalogSort
  ): PublicCatalogCursorKeyset {
    try {
      if (
        !BASE64URL_PATTERN.test(cursor) ||
        cursor.length < 1 ||
        cursor.length > MAX_CURSOR_LENGTH
      ) {
        throw new Error('invalid envelope');
      }
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor)
        throw new Error('invalid encoding');
      const parsed: unknown = JSON.parse(decoded);
      if (
        !isCursorEnvelope(parsed) ||
        parsed.body.fp !== fingerprint ||
        parsed.body.key.sort !== expectedSort
      ) {
        throw new Error('invalid context');
      }
      const secret = this.keys.get(parsed.body.kid);
      if (!secret) throw new Error('unknown key');
      const supplied = Buffer.from(parsed.mac, 'base64url');
      const expected = createHmac('sha256', secret).update(JSON.stringify(parsed.body)).digest();
      if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) {
        throw new Error('invalid signature');
      }
      return {
        sort: parsed.body.key.sort,
        sortTimestamp:
          parsed.body.key.sortTimestamp === null ? null : new Date(parsed.body.key.sortTimestamp),
        nameKey: parsed.body.key.nameKey,
        id: parsed.body.key.id,
      };
    } catch {
      throw new InvalidPublicCatalogCursorError({
        cursor: 'Invalid, tampered, or mismatched cursor',
      });
    }
  }
}
