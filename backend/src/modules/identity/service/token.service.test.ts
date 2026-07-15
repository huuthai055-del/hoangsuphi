import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { TokenService, type AccessTokenPayload, type RefreshTokenPayload } from './token.service';
import { sign } from 'hono/jwt';
import { env } from '@/config/env';
import { parseDurationToSeconds } from '@/common/utils/duration';

describe('TokenService', () => {
  let service: TokenService;
  const originalNow = Date.now;

  const validAccessPayload = {
    userId: '019f4264-a179-7672-b7b6-278802ae1916',
    email: 'test@example.com',
    sessionId: '019f4264-a179-7672-b7b6-278802ae1917',
    permissionsVersion: 2,
  };

  const validRefreshPayload = {
    userId: '019f4264-a179-7672-b7b6-278802ae1916',
    sessionId: 'session-uuid-123',
    jwtId: 'jwt-uuid-456',
  };

  beforeEach(() => {
    service = new TokenService();
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  describe('Access Token', () => {
    test('should generate a valid JWT Access Token', async () => {
      const token = await service.generateAccessToken(validAccessPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    test('should verify a valid Access Token successfully', async () => {
      const token = await service.generateAccessToken(validAccessPayload);
      const verified = await service.verifyAccessToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe(validAccessPayload.userId);
      expect(verified?.email).toBe(validAccessPayload.email);
      expect(verified?.permissionsVersion).toBe(validAccessPayload.permissionsVersion);
      expect(verified?.exp).toBeGreaterThan(verified?.iat ?? 0);
    });

    test('should return null for expired Access Token', async () => {
      let fakeTime = 1000000000;
      Date.now = () => fakeTime * 1000;

      const token = await service.generateAccessToken(validAccessPayload);

      // Expiration is 15 minutes, advance by 20 minutes
      fakeTime += 20 * 60;
      Date.now = () => fakeTime * 1000;

      const verified = await service.verifyAccessToken(token);
      expect(verified).toBeNull();
    });

    test('should return null for Access Token signed with a wrong secret', async () => {
      const wrongSecretToken = await sign(
        {
          sub: validAccessPayload.userId,
          email: validAccessPayload.email,
          sid: validAccessPayload.sessionId,
          permissionsVersion: validAccessPayload.permissionsVersion,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
        },
        'COMPLETELY_WRONG_SECRET_KEY_FOR_TESTING_PURPOSES_1234567890',
        'HS256'
      );

      const verified = await service.verifyAccessToken(wrongSecretToken);
      expect(verified).toBeNull();
    });

    test('should return null for Access Token with tampered signature', async () => {
      const token = await service.generateAccessToken(validAccessPayload);
      const parts = token.split('.');
      parts[2] = 'tamperedSignatureString123';
      const tamperedToken = parts.join('.');

      const verified = await service.verifyAccessToken(tamperedToken);
      expect(verified).toBeNull();
    });

    test('should return null for Access Token when payload is modified but signature is unchanged', async () => {
      const token = await service.generateAccessToken(validAccessPayload);
      const [header, payload, signature] = token.split('.');
      if (!header || !payload || !signature) throw new Error('Expected a three-part JWT');

      // Base64 decode payload
      const decodedPayload = JSON.parse(
        Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
      );

      // Modify sub claim in payload (simulate tampering)
      decodedPayload.sub = 'admin';

      // Base64 encode again
      const modifiedPayload = Buffer.from(JSON.stringify(decodedPayload))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const modifiedToken = `${header}.${modifiedPayload}.${signature}`;

      // Verify should fail
      const verified = await service.verifyAccessToken(modifiedToken);
      expect(verified).toBeNull();

      // Decode should still read the modified payload successfully
      const decoded = service.decode<AccessTokenPayload>(modifiedToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('admin');
    });

    test('should return null for malformed Access Token', async () => {
      const verified = await service.verifyAccessToken('not.a.jwt.token');
      expect(verified).toBeNull();
    });

    test('should decode Access Token payload without verifying signature', async () => {
      const token = await service.generateAccessToken(validAccessPayload);
      const parts = token.split('.');
      parts[2] = 'wrongSignature';
      const tamperedToken = parts.join('.');

      const decoded = service.decode<AccessTokenPayload>(tamperedToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(validAccessPayload.userId);
      expect(decoded?.email).toBe(validAccessPayload.email);
    });
  });

  describe('Refresh Token', () => {
    test('should generate a valid JWT Refresh Token', async () => {
      const token = await service.generateRefreshToken(validRefreshPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    test('should verify a valid Refresh Token successfully', async () => {
      const token = await service.generateRefreshToken(validRefreshPayload);
      const verified = await service.verifyRefreshToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.sub).toBe(validRefreshPayload.userId);
      expect(verified?.sid).toBe(validRefreshPayload.sessionId);
      expect(verified?.jti).toBe(validRefreshPayload.jwtId);
    });

    test('should return null for expired Refresh Token', async () => {
      let fakeTime = 1000000000;
      Date.now = () => fakeTime * 1000;

      const token = await service.generateRefreshToken(validRefreshPayload);

      // Expiration is 30 days, advance by 31 days
      fakeTime += 31 * 24 * 60 * 60;
      Date.now = () => fakeTime * 1000;

      const verified = await service.verifyRefreshToken(token);
      expect(verified).toBeNull();
    });

    test('should return null for Refresh Token signed with wrong secret', async () => {
      const wrongSecretToken = await sign(
        {
          sub: validRefreshPayload.userId,
          sid: validRefreshPayload.sessionId,
          jti: validRefreshPayload.jwtId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
        },
        'COMPLETELY_WRONG_SECRET_KEY_FOR_TESTING_PURPOSES_1234567890',
        'HS256'
      );

      const verified = await service.verifyRefreshToken(wrongSecretToken);
      expect(verified).toBeNull();
    });

    test('should return null for malformed Refresh Token', async () => {
      const verified = await service.verifyRefreshToken('abc.def');
      expect(verified).toBeNull();
    });

    test('should decode Refresh Token payload', async () => {
      const token = await service.generateRefreshToken(validRefreshPayload);
      const decoded = service.decode<RefreshTokenPayload>(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(validRefreshPayload.userId);
      expect(decoded?.sid).toBe(validRefreshPayload.sessionId);
      expect(decoded?.jti).toBe(validRefreshPayload.jwtId);
    });
  });

  describe('Edge Cases & Type Guards', () => {
    test('verifyAccessToken() and verifyRefreshToken() should never throw on null/undefined/empty/whitespace', async () => {
      expect(await service.verifyAccessToken('')).toBeNull();
      expect(await service.verifyAccessToken('   ')).toBeNull();
      expect(await service.verifyAccessToken('\n\t\r')).toBeNull();
      expect(await service.verifyRefreshToken('')).toBeNull();
      expect(await service.verifyRefreshToken('   ')).toBeNull();
      expect(await service.verifyRefreshToken('\n\t\r')).toBeNull();
    });

    test('decode() should return null for empty or invalid token', () => {
      expect(service.decode<AccessTokenPayload>('')).toBeNull();
      expect(service.decode<AccessTokenPayload>('   ')).toBeNull();
      expect(service.decode<AccessTokenPayload>('\n\t\r')).toBeNull();
      expect(service.decode<AccessTokenPayload>('invalid')).toBeNull();
    });

    test('should return null for Access Token with invalid claims payload (Type Guard mismatch)', async () => {
      const token = await sign({ sub: 'user-123' }, env.JWT_ACCESS_SECRET, 'HS256');
      const verified = await service.verifyAccessToken(token);
      expect(verified).toBeNull();
    });

    test('should return null for Refresh Token with invalid claims payload (Type Guard mismatch)', async () => {
      const token = await sign({ sub: 'user-123' }, env.JWT_REFRESH_SECRET, 'HS256');
      const verified = await service.verifyRefreshToken(token);
      expect(verified).toBeNull();
    });
  });

  describe('Duration Utility', () => {
    test('should parse durations to seconds correctly', () => {
      expect(parseDurationToSeconds('10s')).toBe(10);
      expect(parseDurationToSeconds('15m')).toBe(15 * 60);
      expect(parseDurationToSeconds('2h')).toBe(2 * 60 * 60);
      expect(parseDurationToSeconds('30d')).toBe(30 * 24 * 60 * 60);
    });

    test('should throw error for invalid expires_in formats', () => {
      expect(() => parseDurationToSeconds('invalidFormat')).toThrow(
        'Invalid duration format: invalidFormat'
      );
      expect(() => parseDurationToSeconds('')).toThrow('Duration string is required');
    });
  });
});
