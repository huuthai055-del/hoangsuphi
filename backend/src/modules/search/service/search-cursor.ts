import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SearchQueryDto } from '../dto/search.dto';
import {
  SEARCH_ENTITY_TYPES,
  SEARCH_SORTS,
  type SearchEntityType,
  type SearchKeyset,
  type SearchSort,
} from '../repository/search-read-model';

const CURSOR_VERSION = 1;
const FINGERPRINT_VERSION = 1;
const MAX_CURSOR_LENGTH = 512;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const RATING_CURSOR_PATTERN = /^[1-5](?:\.\d+)?$/;
const PRICE_CURSOR_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export interface SearchCursorKeyring {
  readonly activeKeyId: string;
  readonly keys: Readonly<Record<string, string | Uint8Array>>;
}

export interface ISearchCursorCodec {
  fingerprint(query: SearchQueryDto): string;
  encode(keyset: SearchKeyset, fingerprint: string): string;
  decode(cursor: string, fingerprint: string): SearchKeyset | null;
}

interface CursorBody {
  readonly v: 1;
  readonly kid: string;
  readonly fp: string;
  readonly key: {
    readonly sort: SearchSort;
    readonly sortValue: number | string | null;
    readonly entityType: SearchEntityType;
    readonly id: string;
  };
}

interface CursorEnvelope {
  readonly body: CursorBody;
  readonly mac: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index])
  );
}

function isSearchEntityType(value: unknown): value is SearchEntityType {
  return typeof value === 'string' && (SEARCH_ENTITY_TYPES as readonly string[]).includes(value);
}

function isSearchSort(value: unknown): value is SearchSort {
  return typeof value === 'string' && (SEARCH_SORTS as readonly string[]).includes(value);
}

function isSortValue(sort: SearchSort, value: unknown): value is number | string | null {
  switch (sort) {
    case 'relevance':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    case 'newest':
      return (
        value === null || (typeof value === 'string' && value.length >= 1 && value.length <= 64)
      );
    case 'rating':
      return value === null || (typeof value === 'string' && RATING_CURSOR_PATTERN.test(value));
    case 'price_asc':
    case 'price_desc':
      return value === null || (typeof value === 'string' && PRICE_CURSOR_PATTERN.test(value));
  }
}

function isCursorBody(value: unknown): value is CursorBody {
  if (!isRecord(value) || !hasExactKeys(value, ['v', 'kid', 'fp', 'key'])) return false;
  if (value.v !== CURSOR_VERSION) return false;
  if (typeof value.kid !== 'string' || !KEY_ID_PATTERN.test(value.kid)) return false;
  if (typeof value.fp !== 'string' || !SHA256_HEX_PATTERN.test(value.fp)) return false;
  if (!isRecord(value.key)) return false;
  if (!hasExactKeys(value.key, ['sort', 'sortValue', 'entityType', 'id'])) return false;
  if (!isSearchSort(value.key.sort) || !isSortValue(value.key.sort, value.key.sortValue)) {
    return false;
  }
  return (
    isSearchEntityType(value.key.entityType) &&
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

function serializeBody(body: CursorBody): string {
  return JSON.stringify({
    v: body.v,
    kid: body.kid,
    fp: body.fp,
    key: {
      sort: body.key.sort,
      sortValue: body.key.sortValue,
      entityType: body.key.entityType,
      id: body.key.id,
    },
  });
}

function toKeyset(body: CursorBody): SearchKeyset {
  const base = { entityType: body.key.entityType, id: body.key.id };
  switch (body.key.sort) {
    case 'relevance':
      return { ...base, sort: 'relevance', sortValue: body.key.sortValue as number };
    case 'newest':
      return { ...base, sort: 'newest', sortValue: body.key.sortValue as string | null };
    case 'rating':
      return { ...base, sort: 'rating', sortValue: body.key.sortValue as string | null };
    case 'price_asc':
    case 'price_desc':
      return {
        ...base,
        sort: body.key.sort,
        sortValue: body.key.sortValue as string | null,
      };
  }
}

function isValidKeyset(keyset: SearchKeyset): boolean {
  return (
    UUID_PATTERN.test(keyset.id) &&
    isSearchEntityType(keyset.entityType) &&
    isSortValue(keyset.sort, keyset.sortValue)
  );
}

export class SearchCursorCodec implements ISearchCursorCodec {
  private readonly activeKeyId: string;
  private readonly keys: ReadonlyMap<string, Uint8Array>;

  constructor(keyring: SearchCursorKeyring) {
    if (!KEY_ID_PATTERN.test(keyring.activeKeyId)) {
      throw new Error('Search cursor active key ID is invalid');
    }

    const normalizedKeys = new Map<string, Uint8Array>();
    for (const [keyId, secret] of Object.entries(keyring.keys)) {
      if (!KEY_ID_PATTERN.test(keyId)) {
        throw new Error('Search cursor key ID is invalid');
      }
      const bytes = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
      if (bytes.byteLength < 32) {
        throw new Error(`Search cursor key ${keyId} must contain at least 32 bytes`);
      }
      normalizedKeys.set(keyId, bytes);
    }
    if (!normalizedKeys.has(keyring.activeKeyId)) {
      throw new Error('Search cursor active key is missing from the keyring');
    }

    this.activeKeyId = keyring.activeKeyId;
    this.keys = normalizedKeys;
  }

  fingerprint(query: SearchQueryDto): string {
    const canonicalRequest = JSON.stringify({
      v: FINGERPRINT_VERSION,
      q: query.q,
      types: [...query.types],
      regionId: query.regionId,
      includeDescendants: query.includeDescendants,
      articleCategoryId: query.articleCategoryId,
      attractionCategoryId: query.attractionCategoryId,
      businessTypeId: query.businessTypeId,
      minRating: query.minRating,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      amenityIds: [...query.amenityIds],
      sort: query.sort,
      limit: query.limit,
    });
    return createHash('sha256').update(canonicalRequest).digest('hex');
  }

  encode(keyset: SearchKeyset, fingerprint: string): string {
    if (!isValidKeyset(keyset)) throw new Error('Search cursor keyset is invalid');
    if (!SHA256_HEX_PATTERN.test(fingerprint)) {
      throw new Error('Search cursor fingerprint is invalid');
    }

    const key = this.keys.get(this.activeKeyId);
    if (!key) throw new Error('Search cursor active key is unavailable');

    const body: CursorBody = {
      v: CURSOR_VERSION,
      kid: this.activeKeyId,
      fp: fingerprint,
      key: {
        sort: keyset.sort,
        sortValue: keyset.sortValue,
        entityType: keyset.entityType,
        id: keyset.id,
      },
    };
    const mac = createHmac('sha256', key).update(serializeBody(body)).digest('base64url');
    const cursor = Buffer.from(JSON.stringify({ body, mac }), 'utf8').toString('base64url');
    if (cursor.length > MAX_CURSOR_LENGTH) {
      throw new Error('Search cursor exceeds the public length limit');
    }
    return cursor;
  }

  decode(cursor: string, fingerprint: string): SearchKeyset | null {
    if (
      cursor.length < 1 ||
      cursor.length > MAX_CURSOR_LENGTH ||
      !BASE64URL_PATTERN.test(cursor) ||
      !SHA256_HEX_PATTERN.test(fingerprint)
    ) {
      return null;
    }

    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) return null;
      const parsed: unknown = JSON.parse(decoded);
      if (!isCursorEnvelope(parsed) || parsed.body.fp !== fingerprint) return null;

      const secret = this.keys.get(parsed.body.kid);
      if (!secret) return null;

      const suppliedMac = Buffer.from(parsed.mac, 'base64url');
      const expectedMac = createHmac('sha256', secret).update(serializeBody(parsed.body)).digest();
      if (suppliedMac.byteLength !== expectedMac.byteLength) return null;
      if (!timingSafeEqual(suppliedMac, expectedMac)) return null;

      return toKeyset(parsed.body);
    } catch {
      return null;
    }
  }
}
