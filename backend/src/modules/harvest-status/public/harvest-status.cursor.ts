import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SearchCursorKeyring } from '@/modules/search/service/search-cursor';
import { InvalidHarvestCursorError } from './harvest-status.public.errors';

const CURSOR_VERSION = 1;
const MAX_CURSOR_LENGTH = 768;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export type HarvestCurrentKeyset = {
  scope: 'current';
  observedAt: Date;
  regionName: string;
  regionId: string;
};

export type HarvestTimelineKeyset = {
  scope: 'timeline';
  observedAt: Date;
  publishedAt: Date;
  id: string;
};

export type HarvestCursorKeyset = HarvestCurrentKeyset | HarvestTimelineKeyset;

interface CursorBody {
  v: 1;
  kid: string;
  fp: string;
  key:
    | { scope: 'current'; observedAt: string; regionName: string; regionId: string }
    | { scope: 'timeline'; observedAt: string; publishedAt: string; id: string };
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
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isCursorBody(value: unknown): value is CursorBody {
  if (!isRecord(value) || !hasExactKeys(value, ['v', 'kid', 'fp', 'key'])) return false;
  if (value.v !== CURSOR_VERSION) return false;
  if (typeof value.kid !== 'string' || !KEY_ID_PATTERN.test(value.kid)) return false;
  if (typeof value.fp !== 'string' || !SHA256_PATTERN.test(value.fp)) return false;
  if (!isRecord(value.key) || typeof value.key.scope !== 'string') return false;

  if (value.key.scope === 'current') {
    return (
      hasExactKeys(value.key, ['scope', 'observedAt', 'regionName', 'regionId']) &&
      isIsoDate(value.key.observedAt) &&
      typeof value.key.regionName === 'string' &&
      value.key.regionName.length >= 1 &&
      value.key.regionName.length <= 100 &&
      typeof value.key.regionId === 'string' &&
      UUID_PATTERN.test(value.key.regionId)
    );
  }

  return (
    value.key.scope === 'timeline' &&
    hasExactKeys(value.key, ['scope', 'observedAt', 'publishedAt', 'id']) &&
    isIsoDate(value.key.observedAt) &&
    isIsoDate(value.key.publishedAt) &&
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
  return JSON.stringify(body);
}

export class HarvestStatusCursorCodec {
  private readonly activeKeyId: string;
  private readonly keys: ReadonlyMap<string, Uint8Array>;

  constructor(keyring: SearchCursorKeyring) {
    const keys = new Map<string, Uint8Array>();
    for (const [keyId, secret] of Object.entries(keyring.keys)) {
      if (!KEY_ID_PATTERN.test(keyId)) throw new Error('Harvest cursor key ID is invalid');
      const bytes = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
      if (bytes.byteLength < 32) throw new Error('Harvest cursor key must contain at least 32 bytes');
      keys.set(keyId, bytes);
    }
    if (!KEY_ID_PATTERN.test(keyring.activeKeyId) || !keys.has(keyring.activeKeyId)) {
      throw new Error('Harvest cursor active key is unavailable');
    }
    this.activeKeyId = keyring.activeKeyId;
    this.keys = keys;
  }

  fingerprint(scope: 'current' | 'timeline', limit: number, regionId?: string): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          v: 1,
          scope,
          limit,
          regionId: regionId ?? null,
          order:
            scope === 'current'
              ? 'observedAt:desc,regionName:asc,regionId:asc'
              : 'observedAt:desc,publishedAt:desc,id:desc',
        })
      )
      .digest('hex');
  }

  encode(keyset: HarvestCursorKeyset, fingerprint: string): string {
    if (!SHA256_PATTERN.test(fingerprint)) throw new Error('Harvest cursor fingerprint is invalid');
    const secret = this.keys.get(this.activeKeyId);
    if (!secret) throw new Error('Harvest cursor active key is unavailable');

    const key =
      keyset.scope === 'current'
        ? {
            scope: 'current' as const,
            observedAt: keyset.observedAt.toISOString(),
            regionName: keyset.regionName,
            regionId: keyset.regionId,
          }
        : {
            scope: 'timeline' as const,
            observedAt: keyset.observedAt.toISOString(),
            publishedAt: keyset.publishedAt.toISOString(),
            id: keyset.id,
          };
    const body: CursorBody = { v: CURSOR_VERSION, kid: this.activeKeyId, fp: fingerprint, key };
    const mac = createHmac('sha256', secret).update(serializeBody(body)).digest('base64url');
    const cursor = Buffer.from(JSON.stringify({ body, mac }), 'utf8').toString('base64url');
    if (cursor.length > MAX_CURSOR_LENGTH) throw new Error('Harvest cursor exceeds length limit');
    return cursor;
  }

  decode(cursor: string, fingerprint: string, expectedScope: HarvestCursorKeyset['scope']): HarvestCursorKeyset {
    try {
      if (!BASE64URL_PATTERN.test(cursor) || cursor.length < 1 || cursor.length > MAX_CURSOR_LENGTH) {
        throw new Error('invalid envelope');
      }
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) throw new Error('invalid encoding');
      const parsed: unknown = JSON.parse(decoded);
      if (!isCursorEnvelope(parsed) || parsed.body.fp !== fingerprint || parsed.body.key.scope !== expectedScope) {
        throw new Error('invalid cursor context');
      }
      const secret = this.keys.get(parsed.body.kid);
      if (!secret) throw new Error('unknown key');
      const supplied = Buffer.from(parsed.mac, 'base64url');
      const expected = createHmac('sha256', secret).update(serializeBody(parsed.body)).digest();
      if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) {
        throw new Error('invalid signature');
      }
      return parsed.body.key.scope === 'current'
        ? {
            scope: 'current',
            observedAt: new Date(parsed.body.key.observedAt),
            regionName: parsed.body.key.regionName,
            regionId: parsed.body.key.regionId,
          }
        : {
            scope: 'timeline',
            observedAt: new Date(parsed.body.key.observedAt),
            publishedAt: new Date(parsed.body.key.publishedAt),
            id: parsed.body.key.id,
          };
    } catch {
      throw new InvalidHarvestCursorError({ cursor: 'Invalid, tampered, or mismatched cursor' });
    }
  }
}
