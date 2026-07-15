import { describe, expect, test } from 'bun:test';
import {
  InvalidNearbyCursorError,
  NearbyCursorQueryMismatchError,
  UnsupportedNearbyCursorVersionError,
} from '../application/nearby-application.errors';
import {
  NearbyCursorCodec,
  type NearbyCursorKeyring,
  type NearbyCursorPayload,
} from '../application/nearby-cursor.codec';

const validKeyring: NearbyCursorKeyring = {
  activeKeyId: 'k1',
  keys: {
    k1: '12345678901234567890123456789012', // 32 bytes
    k2: 'abcdefghijklmnopqrstabcdefghijkl', // 32 bytes
  },
};

const defaultFp = 'a'.repeat(64);
const payload: NearbyCursorPayload = {
  distance: '426.354721980217',
  entityType: 'TOURIST_PLACE',
  id: 'e2000000-0000-4000-8000-000000000001',
};

describe('NearbyCursorCodec', () => {
  test('successfully encodes and decodes cursor', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const token = codec.encode(payload, defaultFp);
    expect(token).toBeTruthy();
    expect(token.length).toBeLessThan(512);

    const decoded = codec.decode(token, defaultFp);
    expect(decoded).toEqual(payload);
  });

  test('successfully decodes cursor encoded with previous key if present in keyring', () => {
    const previousKeyring: NearbyCursorKeyring = {
      activeKeyId: 'k2',
      keys: {
        k1: '12345678901234567890123456789012',
        k2: 'abcdefghijklmnopqrstabcdefghijkl',
      },
    };
    const codecPrev = new NearbyCursorCodec(previousKeyring);
    const token = codecPrev.encode(payload, defaultFp);

    const codecActive = new NearbyCursorCodec(validKeyring);
    const decoded = codecActive.decode(token, defaultFp);
    expect(decoded).toEqual(payload);
  });

  test('throws NearbyCursorQueryMismatchError when fingerprint does not match query context', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const token = codec.encode(payload, defaultFp);

    const wrongFp = 'b'.repeat(64);
    expect(() => codec.decode(token, wrongFp)).toThrow(NearbyCursorQueryMismatchError);
  });

  test('throws UnsupportedNearbyCursorVersionError when version is not supported', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const body = {
      v: 2,
      kid: 'k1',
      fp: defaultFp,
      key: {
        distance: payload.distance,
        entityType: payload.entityType,
        id: payload.id,
      },
    };
    const secret = Buffer.from(validKeyring.keys.k1 as string, 'utf8');
    const serialized = JSON.stringify(body);
    const mac = require('node:crypto')
      .createHmac('sha256', secret)
      .update(serialized)
      .digest('base64url');

    const envelope = { body, mac };
    const tamperedToken = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
    expect(() => codec.decode(tamperedToken, defaultFp)).toThrow(
      UnsupportedNearbyCursorVersionError
    );
  });

  test('throws InvalidNearbyCursorError when signature is tampered', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const token = codec.encode(payload, defaultFp);

    const envelopeJson = Buffer.from(token, 'base64url').toString('utf8');
    const envelope = JSON.parse(envelopeJson);
    envelope.body.key.distance = '500.000000'; // Tamper data

    const tamperedToken = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
    expect(() => codec.decode(tamperedToken, defaultFp)).toThrow(InvalidNearbyCursorError);
  });

  test('throws InvalidNearbyCursorError when envelope is corrupt or malformed', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    expect(() => codec.decode('not-a-valid-token-at-all', defaultFp)).toThrow(
      InvalidNearbyCursorError
    );
  });

  test('throws InvalidNearbyCursorError when kid is not present in keyring', () => {
    const otherKeyring: NearbyCursorKeyring = {
      activeKeyId: 'k_unknown',
      keys: {
        k_unknown: 'xyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy',
      },
    };
    const codecOther = new NearbyCursorCodec(otherKeyring);
    const token = codecOther.encode(payload, defaultFp);

    const codec = new NearbyCursorCodec(validKeyring);
    expect(() => codec.decode(token, defaultFp)).toThrow(InvalidNearbyCursorError);
  });

  test('rejects distance as number in payload validation', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const badPayload = { ...payload, distance: 426.3547 } as any;
    expect(() => codec.encode(badPayload, defaultFp)).toThrow();
  });

  test('rejects invalid distance strings in payload validation', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const badPayload = { ...payload, distance: 'not-a-distance' };
    expect(() => codec.encode(badPayload, defaultFp)).toThrow();
  });

  test('rejects invalid UUID in payload validation', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const badPayload = { ...payload, id: 'bad-uuid' };
    expect(() => codec.encode(badPayload, defaultFp)).toThrow();
  });

  test('rejects invalid entity type in payload validation', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const badPayload = { ...payload, entityType: 'BAD_TYPE' as any };
    expect(() => codec.encode(badPayload, defaultFp)).toThrow();
  });

  test('enforces max length constraints', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const longPayload: NearbyCursorPayload = {
      distance: '12345678.901234',
      entityType: 'TOURIST_PLACE',
      id: 'e2000000-0000-4000-8000-000000000001',
    };
    const token = codec.encode(longPayload, defaultFp);
    expect(token.length).toBeLessThan(512);
  });

  test('fails if keyring activeKeyId is invalid format', () => {
    expect(() => new NearbyCursorCodec({ activeKeyId: '', keys: {} })).toThrow();
  });

  test('fails if keyring keys contain key smaller than 32 bytes', () => {
    expect(
      () =>
        new NearbyCursorCodec({
          activeKeyId: 'k1',
          keys: {
            k1: 'too-short',
          },
        })
    ).toThrow();
  });

  test('supports scientific notation and short float8 representations in cursor distance', () => {
    const codec = new NearbyCursorCodec(validKeyring);
    const scientificPayload = {
      distance: '1e-7',
      entityType: 'TOURIST_PLACE' as const,
      id: 'e2000000-0000-4000-8000-000000000001',
    };
    const token = codec.encode(scientificPayload, defaultFp);
    expect(token).toBeTruthy();

    const decoded = codec.decode(token, defaultFp);
    expect(decoded.distance).toBe('1e-7');
    expect(Number(decoded.distance)).toBe(1e-7);
  });
});
