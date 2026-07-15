import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NearbyEntityType } from '../repository/nearby-projection';
import {
  InvalidNearbyCursorError,
  NearbyCursorQueryMismatchError,
  UnsupportedNearbyCursorVersionError,
} from './nearby-application.errors';

const CURSOR_VERSION = 1;
const MAX_CURSOR_LENGTH = 512;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

function isValidDistanceString(value: string): boolean {
  if (typeof value !== 'string') return false;
  const num = Number(value);
  return Number.isFinite(num) && !Number.isNaN(num) && num >= 0;
}

const ALLOWED_ENTITY_TYPES: readonly NearbyEntityType[] = [
  'TOURIST_PLACE',
  'ATTRACTION',
  'BUSINESS',
  'UTILITY',
];

export interface NearbyCursorKeyring {
  readonly activeKeyId: string;
  readonly keys: Readonly<Record<string, string | Uint8Array>>;
}

export interface NearbyCursorPayload {
  readonly distance: string;
  readonly entityType: NearbyEntityType;
  readonly id: string;
}

export interface INearbyCursorCodec {
  encode(payload: NearbyCursorPayload, fingerprint: string): string;
  decode(cursor: string, fingerprint: string): NearbyCursorPayload;
}

interface CursorBody {
  readonly v: number;
  readonly kid: string;
  readonly fp: string;
  readonly key: {
    readonly distance: string;
    readonly entityType: NearbyEntityType;
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

function isNearbyEntityType(value: unknown): value is NearbyEntityType {
  return (
    typeof value === 'string' &&
    (ALLOWED_ENTITY_TYPES as readonly string[]).includes(value as NearbyEntityType)
  );
}

function isCursorBodyShape(value: unknown): value is CursorBody {
  if (!isRecord(value) || !hasExactKeys(value, ['v', 'kid', 'fp', 'key'])) return false;
  if (typeof value.v !== 'number') return false;
  if (typeof value.kid !== 'string' || !KEY_ID_PATTERN.test(value.kid)) return false;
  if (typeof value.fp !== 'string' || !SHA256_HEX_PATTERN.test(value.fp)) return false;
  if (!isRecord(value.key)) return false;
  if (!hasExactKeys(value.key, ['distance', 'entityType', 'id'])) return false;
  if (typeof value.key.distance !== 'string' || !isValidDistanceString(value.key.distance)) {
    return false;
  }
  return (
    isNearbyEntityType(value.key.entityType) &&
    typeof value.key.id === 'string' &&
    UUID_PATTERN.test(value.key.id)
  );
}

function isCursorEnvelopeShape(value: unknown): value is CursorEnvelope {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['body', 'mac']) &&
    isCursorBodyShape(value.body) &&
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
      distance: body.key.distance,
      entityType: body.key.entityType,
      id: body.key.id,
    },
  });
}

export class NearbyCursorCodec implements INearbyCursorCodec {
  private readonly activeKeyId: string;
  private readonly keys: ReadonlyMap<string, Uint8Array>;

  constructor(keyring: NearbyCursorKeyring) {
    if (!KEY_ID_PATTERN.test(keyring.activeKeyId)) {
      throw new Error('Nearby cursor active key ID is invalid');
    }

    const normalizedKeys = new Map<string, Uint8Array>();
    for (const [keyId, secret] of Object.entries(keyring.keys)) {
      if (!KEY_ID_PATTERN.test(keyId)) {
        throw new Error('Nearby cursor key ID is invalid');
      }
      const bytes = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : Buffer.from(secret);
      if (bytes.byteLength < 32) {
        throw new Error(`Nearby cursor key ${keyId} must contain at least 32 bytes`);
      }
      normalizedKeys.set(keyId, bytes);
    }
    if (!normalizedKeys.has(keyring.activeKeyId)) {
      throw new Error('Nearby cursor active key is missing from the keyring');
    }

    this.activeKeyId = keyring.activeKeyId;
    this.keys = normalizedKeys;
  }

  encode(payload: NearbyCursorPayload, fingerprint: string): string {
    if (!SHA256_HEX_PATTERN.test(fingerprint)) {
      throw new Error('Nearby cursor fingerprint is invalid');
    }
    if (!UUID_PATTERN.test(payload.id)) {
      throw new Error('Nearby cursor entity ID is invalid');
    }
    if (!isNearbyEntityType(payload.entityType)) {
      throw new Error('Nearby cursor entity type is invalid');
    }
    if (typeof payload.distance !== 'string' || !isValidDistanceString(payload.distance)) {
      throw new Error('Nearby cursor distance must be a valid decimal string');
    }

    const key = this.keys.get(this.activeKeyId);
    if (!key) throw new Error('Nearby cursor active key is unavailable');

    const body: CursorBody = {
      v: CURSOR_VERSION,
      kid: this.activeKeyId,
      fp: fingerprint,
      key: {
        distance: payload.distance,
        entityType: payload.entityType,
        id: payload.id,
      },
    };
    const mac = createHmac('sha256', key).update(serializeBody(body)).digest('base64url');
    const cursor = Buffer.from(JSON.stringify({ body, mac }), 'utf8').toString('base64url');
    if (cursor.length > MAX_CURSOR_LENGTH) {
      throw new Error('Nearby cursor exceeds the public length limit');
    }
    return cursor;
  }

  decode(cursor: string, fingerprint: string): NearbyCursorPayload {
    if (cursor.length < 1 || cursor.length > MAX_CURSOR_LENGTH || !BASE64URL_PATTERN.test(cursor)) {
      throw new InvalidNearbyCursorError('Cursor is malformed or has invalid length', {
        cursor: 'Cursor format is invalid',
      });
    }
    if (!SHA256_HEX_PATTERN.test(fingerprint)) {
      throw new Error('Provided query fingerprint is invalid');
    }

    let parsed: unknown;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      if (Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) {
        throw new Error('Base64url roundtrip check failed');
      }
      parsed = JSON.parse(decoded);
    } catch {
      throw new InvalidNearbyCursorError('Cursor is not a valid JSON structure', {
        cursor: 'Decoder JSON parsing failed',
      });
    }

    if (!isCursorEnvelopeShape(parsed)) {
      throw new InvalidNearbyCursorError('Cursor payload does not match required envelope schema', {
        cursor: 'Invalid schema structural compatibility',
      });
    }

    const secret = this.keys.get(parsed.body.kid);
    if (!secret) {
      throw new InvalidNearbyCursorError(
        `Cursor key ID ${parsed.body.kid} does not exist in keyring`,
        {
          kid: 'Unknown key ID',
        }
      );
    }

    const suppliedMac = Buffer.from(parsed.mac, 'base64url');
    const expectedMac = createHmac('sha256', secret).update(serializeBody(parsed.body)).digest();
    if (
      suppliedMac.byteLength !== expectedMac.byteLength ||
      !timingSafeEqual(suppliedMac, expectedMac)
    ) {
      throw new InvalidNearbyCursorError('Cursor signature is invalid or tampered', {
        signature: 'HMAC verification failed',
      });
    }

    if (parsed.body.v !== CURSOR_VERSION) {
      throw new UnsupportedNearbyCursorVersionError(
        `Cursor version v=${parsed.body.v} is not supported`,
        {
          version: `Unsupported version ${parsed.body.v}`,
        }
      );
    }

    if (parsed.body.fp !== fingerprint) {
      throw new NearbyCursorQueryMismatchError(
        'Cursor fingerprint does not match the current query context',
        {
          cursor: 'Query fingerprint mismatch',
        }
      );
    }

    return {
      distance: parsed.body.key.distance,
      entityType: parsed.body.key.entityType,
      id: parsed.body.key.id,
    };
  }
}
