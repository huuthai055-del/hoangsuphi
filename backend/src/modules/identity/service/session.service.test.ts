import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import {
  SessionService,
  type IUserSessionRepository,
  type IRefreshTokenRepository,
  type UserSessionModel,
  type RefreshTokenModel,
} from './session.service';
import { ValidationError, AuthenticationError, NotFoundError } from '@/common/errors/http.errors';

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepo: IUserSessionRepository;
  let mockTokenRepo: IRefreshTokenRepository;
  const originalNow = Date.now;

  const userId = '019f4264-a179-7672-b7b6-278802ae1916';
  const sessionId = '019f4264-a179-7672-b7b6-278802ae1917';
  const jwtId = '019f4264-a179-7672-b7b6-278802ae1918';
  const familyId = '019f4264-a179-7672-b7b6-278802ae1919';
  const newJwtId = '019f4264-a179-7672-b7b6-278802ae1920';

  let currentSession: UserSessionModel;
  let currentToken: RefreshTokenModel;

  beforeEach(() => {
    currentSession = {
      id: sessionId,
      userId,
      deviceName: 'Chrome',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      lastActivityAt: new Date(),
      isRevoked: false,
      revokedReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    currentToken = {
      id: jwtId,
      userId,
      sessionId,
      tokenHash: 'oldHash123',
      parentId: null,
      familyId,
      version: 1,
      isUsed: false,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockSessionRepo = {
      create: async () => {},
      findById: async () => null,
      update: async () => {},
      revokeAllUserSessions: async () => {},
    };

    mockTokenRepo = {
      create: async () => {},
      findById: async () => null,
      findByHash: async () => null,
      update: async () => {},
      revokeFamily: async () => {},
      revokeAllUserTokens: async () => {},
      revokeAllSessionTokens: async () => {},
    };

    service = new SessionService(mockSessionRepo, mockTokenRepo);
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  describe('createSession()', () => {
    test('should successfully create a new session', async () => {
      const createSpy = spyOn(mockSessionRepo, 'create');
      const session = await service.createSession({
        userId,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        deviceName: 'Chrome',
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.isRevoked).toBe(false);
      expect(createSpy).toHaveBeenCalled();
    });

    test('should throw ValidationError if userId is empty', async () => {
      await expect(
        service.createSession({
          userId: '',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          deviceName: 'Chrome',
        })
      ).rejects.toThrow('UserId is required');
    });

    test('should throw ValidationError if userId is not a valid UUID', async () => {
      await expect(
        service.createSession({
          userId: 'invalid-uuid',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          deviceName: 'Chrome',
        })
      ).rejects.toThrow('Invalid userId format');
    });

    test('should throw ValidationError if ipAddress is empty', async () => {
      await expect(
        service.createSession({
          userId,
          ipAddress: '',
          userAgent: 'Mozilla/5.0',
          deviceName: 'Chrome',
        })
      ).rejects.toThrow('IpAddress is required');
    });
  });

  describe('createRefreshToken()', () => {
    test('should successfully create a new refresh token record', async () => {
      const createSpy = spyOn(mockTokenRepo, 'create');
      const token = await service.createRefreshToken({
        userId,
        sessionId,
        tokenHash: 'tokenHashXYZ',
        jwtId,
        familyId,
      });

      expect(token).toBeDefined();
      expect(token.id).toBe(jwtId);
      expect(token.version).toBe(1);
      expect(token.isUsed).toBe(false);
      expect(createSpy).toHaveBeenCalled();
    });

    test('should throw ValidationError if any required parameter is missing', async () => {
      await expect(
        service.createRefreshToken({
          userId: '',
          sessionId,
          tokenHash: 'hash',
          jwtId,
          familyId,
        })
      ).rejects.toThrow('Missing required properties for refresh token creation');
    });
  });

  describe('rotateRefreshToken()', () => {
    test('should rotate refresh token successfully when valid', async () => {
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => currentToken);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      const updateTokenSpy = spyOn(mockTokenRepo, 'update');
      const createTokenSpy = spyOn(mockTokenRepo, 'create');

      const rotated = await service.rotateRefreshToken({
        oldTokenHash: 'oldHash123',
        newTokenHash: 'newHash456',
        newJwtId,
      });

      expect(rotated).toBeDefined();
      expect(rotated.version).toBe(2);
      expect(rotated.parentId).toBe(currentToken.id);
      expect(rotated.familyId).toBe(currentToken.familyId);
      expect(updateTokenSpy).toHaveBeenCalled();
      expect(createTokenSpy).toHaveBeenCalled();
      expect(currentToken.isUsed).toBe(true);
    });

    test('should throw ValidationError if input properties are missing', async () => {
      await expect(
        service.rotateRefreshToken({
          oldTokenHash: '',
          newTokenHash: 'hash',
          newJwtId,
        })
      ).rejects.toThrow('Missing required parameters for token rotation');
    });

    test('should throw AuthenticationError if old token does not exist', async () => {
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => null);

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'invalidHash',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow(AuthenticationError);
    });

    test('should throw AuthenticationError if token has expired', async () => {
      const expiredToken = {
        ...currentToken,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => expiredToken);

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'oldHash123',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow(AuthenticationError);
    });

    test('should trigger replay protection and revoke family & session & all session tokens if token is already used', async () => {
      const usedToken = { ...currentToken, isUsed: true };
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => usedToken);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);

      const revokeFamilySpy = spyOn(mockTokenRepo, 'revokeFamily');
      const revokeAllSessionTokensSpy = spyOn(mockTokenRepo, 'revokeAllSessionTokens');
      const updateSessionSpy = spyOn(mockSessionRepo, 'update');

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'oldHash123',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow(AuthenticationError);

      expect(revokeFamilySpy).toHaveBeenCalledWith(familyId, undefined);
      expect(revokeAllSessionTokensSpy).toHaveBeenCalledWith(sessionId, undefined);
      expect(updateSessionSpy).toHaveBeenCalled();
      expect(currentSession.isRevoked).toBe(true);
      expect(currentSession.revokedReason).toBe('replay_attack');
    });

    test('should trigger replay protection if token is already revoked', async () => {
      const revokedToken = { ...currentToken, isRevoked: true };
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => revokedToken);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);

      const revokeFamilySpy = spyOn(mockTokenRepo, 'revokeFamily');
      const updateSessionSpy = spyOn(mockSessionRepo, 'update');

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'oldHash123',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow(AuthenticationError);

      expect(revokeFamilySpy).toHaveBeenCalledWith(familyId, undefined);
      expect(updateSessionSpy).toHaveBeenCalled();
    });

    test('should throw AuthenticationError if parent session is revoked', async () => {
      const revokedSession = { ...currentSession, isRevoked: true };
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => currentToken);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => revokedSession);

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'oldHash123',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow(AuthenticationError);
    });

    test('should throw AuthenticationError if parent session expired', async () => {
      const expiredSession = {
        ...currentSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => currentToken);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => expiredSession);

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'oldHash123',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('revokeSession()', () => {
    test('should successfully revoke session and all its tokens', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      const updateSpy = spyOn(mockSessionRepo, 'update');
      const revokeTokensSpy = spyOn(mockTokenRepo, 'revokeAllSessionTokens');

      await service.revokeSession(sessionId, 'logout');

      expect(currentSession.isRevoked).toBe(true);
      expect(currentSession.revokedReason).toBe('logout');
      expect(updateSpy).toHaveBeenCalled();
      expect(revokeTokensSpy).toHaveBeenCalledWith(sessionId, undefined);
    });

    test('should not call session update if already revoked but still call token revoke', async () => {
      currentSession.isRevoked = true;
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      const updateSpy = spyOn(mockSessionRepo, 'update');
      const revokeTokensSpy = spyOn(mockTokenRepo, 'revokeAllSessionTokens');

      await service.revokeSession(sessionId, 'logout');

      expect(updateSpy).not.toHaveBeenCalled();
      expect(revokeTokensSpy).toHaveBeenCalledWith(sessionId, undefined);
    });

    test('should throw ValidationError if sessionId is empty', async () => {
      await expect(service.revokeSession('')).rejects.toThrow('SessionId is required');
    });

    test('should throw NotFoundError if session is not found', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => null);

      await expect(service.revokeSession(sessionId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('revokeAllSessions()', () => {
    test('should successfully revoke all sessions and tokens for user', async () => {
      const revokeSessionsSpy = spyOn(mockSessionRepo, 'revokeAllUserSessions');
      const revokeTokensSpy = spyOn(mockTokenRepo, 'revokeAllUserTokens');

      await service.revokeAllSessions(userId, 'logout_all');

      // tx is undefined when revokeAllSessions is called without a transaction context
      expect(revokeSessionsSpy).toHaveBeenCalledWith(userId, 'logout_all', undefined);
      expect(revokeTokensSpy).toHaveBeenCalledWith(userId, undefined);
    });

    test('should throw ValidationError if userId is empty', async () => {
      await expect(service.revokeAllSessions('')).rejects.toThrow('UserId is required');
    });
  });

  describe('isSessionActive()', () => {
    test('should return true for active session', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);

      const isActive = await service.isSessionActive(sessionId);
      expect(isActive).toBe(true);
    });

    test('should return false if session is revoked', async () => {
      const revokedSession = { ...currentSession, isRevoked: true };
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => revokedSession);

      const isActive = await service.isSessionActive(sessionId);
      expect(isActive).toBe(false);
    });

    test('should return false if session is expired', async () => {
      const expiredSession = {
        ...currentSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => expiredSession);

      const isActive = await service.isSessionActive(sessionId);
      expect(isActive).toBe(false);
    });

    test('should return false if session is not found', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => null);

      const isActive = await service.isSessionActive(sessionId);
      expect(isActive).toBe(false);
    });

    test('should return false if sessionId is empty or invalid UUID format', async () => {
      expect(await service.isSessionActive('')).toBe(false);
      expect(await service.isSessionActive('invalid-uuid')).toBe(false);
    });
  });

  describe('touchSession()', () => {
    test('should touch session only when threshold limit is met', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      const updateSpy = spyOn(mockSessionRepo, 'update');

      let fakeTime = 1000000000 * 1000; // ms
      Date.now = () => fakeTime;

      // Setup initial touch state
      currentSession.lastActivityAt = new Date(fakeTime - 120_000); // 2 minutes ago (meets threshold of 1 minute)

      // First Touch: meets threshold -> should update DB
      await service.touchSession(sessionId);
      expect(updateSpy).toHaveBeenCalledTimes(1);

      // Second Touch immediately after: does NOT meet threshold -> should bypass DB write
      currentSession.lastActivityAt = new Date(fakeTime); // Update state to mimic DB updated value
      await service.touchSession(sessionId);
      expect(updateSpy).toHaveBeenCalledTimes(1); // Call count remains 1

      // Third Touch (advance time by 2 minutes): meets threshold -> should update DB
      fakeTime += 120_000;
      Date.now = () => fakeTime;
      await service.touchSession(sessionId);
      expect(updateSpy).toHaveBeenCalledTimes(2); // Call count increments to 2
    });

    test('should throw NotFoundError if session is not found', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => null);
      await expect(service.touchSession(sessionId)).rejects.toThrow(NotFoundError);
    });

    test('should throw ValidationError if session is revoked', async () => {
      currentSession.isRevoked = true;
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      await expect(service.touchSession(sessionId)).rejects.toThrow(
        'Cannot touch an inactive session'
      );
    });

    test('should throw ValidationError if session is expired', async () => {
      currentSession.expiresAt = new Date(Date.now() - 1000);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      await expect(service.touchSession(sessionId)).rejects.toThrow(
        'Cannot touch an inactive session'
      );
    });

    test('should throw ValidationError if sessionId is empty', async () => {
      await expect(service.touchSession('')).rejects.toThrow('SessionId is required');
    });
  });

  describe('Exception Propagation', () => {
    test('should propagate errors thrown by repositories in createSession', async () => {
      spyOn(mockSessionRepo, 'create').mockImplementation(async () => {
        throw new Error('Database connection failed');
      });

      await expect(
        service.createSession({
          userId,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          deviceName: 'Chrome',
        })
      ).rejects.toThrow('Database connection failed');
    });

    test('should propagate errors thrown by repositories in rotateRefreshToken', async () => {
      spyOn(mockTokenRepo, 'findByHash').mockImplementation(async () => currentToken);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      spyOn(mockTokenRepo, 'update').mockImplementation(async () => {
        throw new Error('Lock timeout');
      });

      await expect(
        service.rotateRefreshToken({
          oldTokenHash: 'oldHash123',
          newTokenHash: 'newHash456',
          newJwtId,
        })
      ).rejects.toThrow('Lock timeout');
    });

    test('should propagate errors thrown by repositories in revokeSession', async () => {
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      spyOn(mockSessionRepo, 'update').mockImplementation(async () => {
        throw new Error('Update failed');
      });

      await expect(service.revokeSession(sessionId)).rejects.toThrow('Update failed');
    });

    test('should propagate errors thrown by repositories in touchSession', async () => {
      // Setup time so threshold passes
      currentSession.lastActivityAt = new Date(Date.now() - 120_000);
      spyOn(mockSessionRepo, 'findById').mockImplementation(async () => currentSession);
      spyOn(mockSessionRepo, 'update').mockImplementation(async () => {
        throw new Error('Touch failed');
      });

      await expect(service.touchSession(sessionId)).rejects.toThrow('Touch failed');
    });
  });
});
