import { expect, test, describe, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { AuthService } from './auth.service';
import { hashToken } from '@/common/utils/token-hash';
import { User } from '../domain/user.entity';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '@/common/errors/http.errors';
import type { IPasswordService } from './password.service';
import type { ITokenService } from './token.service';
import type { ISessionService, UserSessionModel } from './session.service';
import type { IUserRepository } from '../repository/users-repository.interface';

// Mock database client exports explicitly to prevent circular dependencies
mock.module('@/lib/database/client', () => {
  return {
    db: {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
      execute: async () => {},
    },
    dbHealthCheck: async () => ({ status: 'healthy', latencyMs: 1 }),
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let mockPasswordService: IPasswordService;
  let mockTokenService: ITokenService;
  let mockSessionService: ISessionService;
  let mockUserRepo: IUserRepository;
  const originalNow = Date.now;

  const userId = '019f4264-a179-7672-b7b6-278802ae1916';
  const email = 'test@example.com';
  const password = 'Password123!';
  const passwordHash = '$2y$10$mockPasswordHashXYZ';
  const sessionId = '019f4264-a179-7672-b7b6-278802ae1917';
  const jwtId = '019f4264-a179-7672-b7b6-278802ae1918';
  const familyId = '019f4264-a179-7672-b7b6-278802ae1919';

  let currentSession: UserSessionModel;
  let testUser: User;

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

    testUser = User.rehydrate({
      id: userId,
      email,
      passwordHash,
      status: 'active',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      permissionsVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      lastPasswordChangedAt: null,
      lastFailedLoginAt: null,
      deletedAt: null,
    });

    mockPasswordService = {
      hash: async () => passwordHash,
      verify: async () => true,
      validatePolicy: () => {},
    };

    mockTokenService = {
      generateAccessToken: async () => 'mock.access.token',
      generateRefreshToken: async () => 'mock.refresh.token',
      verifyAccessToken: async () => null,
      verifyRefreshToken: async () => null,
      decode: () => null,
    };

    mockSessionService = {
      createSession: async () => currentSession,
      createRefreshToken: async () => ({
        id: jwtId,
        userId,
        sessionId,
        tokenHash: 'tokenHash123',
        parentId: null,
        familyId,
        version: 1,
        isUsed: false,
        isRevoked: false,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      rotateRefreshToken: async () => ({
        id: 'new-jwt-id',
        userId,
        sessionId,
        tokenHash: 'newHashXYZ',
        parentId: jwtId,
        familyId,
        version: 2,
        isUsed: false,
        isRevoked: false,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      revokeSession: async () => {},
      revokeAllSessions: async () => {},
      isSessionActive: async () => true,
      touchSession: async () => {},
    };

    mockUserRepo = {
      findById: async () => null,
      findByEmail: async () => null,
      existsByEmail: async () => false,
      create: async () => {},
      update: async () => {},
      delete: async () => {},
      assignRole: async () => {},
      removeRole: async () => {},
      findRoleByCode: async () => ({ id: 'viewer-role-id' }),
    };

    service = new AuthService(
      mockPasswordService,
      mockTokenService,
      mockSessionService,
      mockUserRepo
    );
  });

  afterEach(() => {
    Date.now = originalNow;
    mock.restore();
  });

  describe('register()', () => {
    test('should successfully register a new user', async () => {
      const validateSpy = spyOn(mockPasswordService, 'validatePolicy');
      const hashSpy = spyOn(mockPasswordService, 'hash');
      const createSpy = spyOn(mockUserRepo, 'create');

      const user = await service.register(email, password, 'Test User');

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBe(passwordHash);
      expect(validateSpy).toHaveBeenCalledWith(password);
      expect(hashSpy).toHaveBeenCalledWith(password);
      expect(createSpy).toHaveBeenCalled();
    });

    test('should throw ValidationError if email or password is empty', async () => {
      await expect(service.register('', password, '')).rejects.toThrow(ValidationError);
      await expect(service.register(email, '', '')).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if email format is invalid', async () => {
      await expect(service.register('invalid-email', password, '')).rejects.toThrow(
        ValidationError
      );
      await expect(service.register('invalid@', password, '')).rejects.toThrow(ValidationError);
      await expect(service.register('invalid@domain', password, '')).rejects.toThrow(
        ValidationError
      );
    });

    test('should throw ValidationError if email or password contains only whitespace, tabs or newlines', async () => {
      await expect(service.register('   ', password, '')).rejects.toThrow(ValidationError);
      await expect(service.register(email, '\n', '')).rejects.toThrow(ValidationError);
      await expect(service.register('\t', '\t', '')).rejects.toThrow(ValidationError);
    });

    test('should normalize email to lowercase and trim spaces', async () => {
      const createSpy = spyOn(mockUserRepo, 'create');
      spyOn(mockUserRepo, 'existsByEmail').mockImplementation(async () => false);

      const user = await service.register('  TEST@Gmail.com  ', password, 'Test User');

      expect(user.email).toBe('test@gmail.com');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@gmail.com',
        }),
        expect.anything()
      );
    });

    test('should throw ConflictError if email exists', async () => {
      spyOn(mockUserRepo, 'existsByEmail').mockImplementation(async () => true);

      await expect(service.register(email, password, '')).rejects.toThrow(ConflictError);
    });

    test('should propagate repository errors and roll back', async () => {
      spyOn(mockUserRepo, 'create').mockImplementation(async () => {
        throw new Error('Database down');
      });

      await expect(service.register(email, password, '')).rejects.toThrow('Database down');
    });

    test('should throw error if default viewer role is not found in database', async () => {
      spyOn(mockUserRepo, 'findRoleByCode').mockImplementation(async () => null);

      await expect(service.register(email, password, '')).rejects.toThrow(
        'Default role "viewer" not found in the database. Please run seeding.'
      );
    });
  });

  describe('login()', () => {
    test('should successfully login and return results', async () => {
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => testUser);
      const verifySpy = spyOn(mockPasswordService, 'verify').mockImplementation(async () => true);
      const createSessionSpy = spyOn(mockSessionService, 'createSession');
      const genAccessSpy = spyOn(mockTokenService, 'generateAccessToken');
      const genRefreshSpy = spyOn(mockTokenService, 'generateRefreshToken');
      const storeRefreshSpy = spyOn(mockSessionService, 'createRefreshToken');
      const result = await service.login(email, password, '127.0.0.1', 'Mozilla', 'Chrome');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock.access.token');
      expect(result.refreshToken).toBe('mock.refresh.token');
      expect(result.session).toBe(currentSession);
      expect(result.user).toEqual({
        id: userId,
        email,
        permissionsVersion: 1,
      });

      expect(verifySpy).toHaveBeenCalledWith(password, passwordHash);
      expect(createSessionSpy).toHaveBeenCalled();
      expect(genAccessSpy).toHaveBeenCalled();
      expect(genRefreshSpy).toHaveBeenCalled();
      expect(storeRefreshSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: hashToken('mock.refresh.token'),
        }),
        expect.anything()
      );
    });

    test('should throw ValidationError if parameters are missing', async () => {
      await expect(service.login('', password, '127.0.0.1', null, null)).rejects.toThrow(
        ValidationError
      );
    });

    test('should throw ValidationError if email format is invalid', async () => {
      await expect(
        service.login('invalid-email', password, '127.0.0.1', null, null)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if email, password or ipAddress contains only whitespace, tabs or newlines', async () => {
      await expect(service.login('   ', password, '127.0.0.1', null, null)).rejects.toThrow(
        ValidationError
      );
      await expect(service.login(email, '\n', '127.0.0.1', null, null)).rejects.toThrow(
        ValidationError
      );
      await expect(service.login(email, password, '\t', null, null)).rejects.toThrow(
        ValidationError
      );
    });

    test('should successfully login and return results with normalized email', async () => {
      const findSpy = spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => testUser);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => true);

      await service.login('  TEST@Gmail.com  ', password, '127.0.0.1', null, null);

      expect(findSpy).toHaveBeenCalledWith('test@gmail.com', expect.anything());
    });

    test('should throw AuthenticationError if user is not found', async () => {
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => null);

      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        AuthenticationError
      );
    });

    test('should throw AuthenticationError if password verification fails', async () => {
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => testUser);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => false);

      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        AuthenticationError
      );
    });

    test('should propagate errors if session creation fails', async () => {
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => testUser);
      spyOn(mockSessionService, 'createSession').mockImplementation(async () => {
        throw new Error('Redis connection lost');
      });

      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        'Redis connection lost'
      );
    });

    test('should propagate errors if token generation fails', async () => {
      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => testUser);
      spyOn(mockTokenService, 'generateAccessToken').mockImplementation(async () => {
        throw new Error('Signing error');
      });

      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        'Signing error'
      );
    });

    test('should throw AuthenticationError if user status is pending_verification or other non-active statuses', async () => {
      const pendingUser = User.rehydrate({
        id: userId,
        email,
        passwordHash,
        status: 'pending_verification',
        failedLoginAttempts: 0,
        lockoutUntil: null,
        permissionsVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        lastPasswordChangedAt: null,
        lastFailedLoginAt: null,
        deletedAt: null,
      });

      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => pendingUser);
      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        AuthenticationError
      );
    });

    test('should throw AuthenticationError if user account is locked', async () => {
      const lockedUser = User.rehydrate({
        id: userId,
        email,
        passwordHash,
        status: 'locked',
        failedLoginAttempts: 0,
        lockoutUntil: new Date(Date.now() + 1000 * 60), // Locked for 1 minute
        permissionsVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        lastPasswordChangedAt: null,
        lastFailedLoginAt: null,
        deletedAt: null,
      });

      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => lockedUser);
      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        AuthenticationError
      );
    });

    test('should auto-unlock and login successfully if lockout has expired', async () => {
      const expiredLockUser = User.rehydrate({
        id: userId,
        email,
        passwordHash,
        status: 'locked',
        failedLoginAttempts: 3,
        lockoutUntil: new Date(Date.now() - 1000 * 60), // Lockout expired 1 minute ago
        permissionsVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        lastPasswordChangedAt: null,
        lastFailedLoginAt: null,
        deletedAt: null,
      });

      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => expiredLockUser);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => true);
      const updateSpy = spyOn(mockUserRepo, 'update');

      const result = await service.login(email, password, '127.0.0.1', null, null);

      expect(result).toBeDefined();
      expect(expiredLockUser.status).toBe('active');
      expect(expiredLockUser.failedLoginAttempts).toBe(0);
      expect(expiredLockUser.lockoutUntil).toBeNull();
      expect(expiredLockUser.lastLoginAt).toBeDefined();
      expect(updateSpy).toHaveBeenCalled();
    });

    test('should increment failed attempts and lockout after 5 consecutive failures', async () => {
      const userToTest = User.rehydrate({
        id: userId,
        email,
        passwordHash,
        status: 'active',
        failedLoginAttempts: 4, // 4 failures already
        lockoutUntil: null,
        permissionsVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        lastPasswordChangedAt: null,
        lastFailedLoginAt: null,
        deletedAt: null,
      });

      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => userToTest);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => false);
      const updateSpy = spyOn(mockUserRepo, 'update');

      await expect(service.login(email, password, '127.0.0.1', null, null)).rejects.toThrow(
        AuthenticationError
      );

      expect(userToTest.failedLoginAttempts).toBe(0); // Reset on lock
      expect(userToTest.status).toBe('locked');
      expect(userToTest.lockoutUntil).not.toBeNull();
      expect(updateSpy).toHaveBeenCalled();
    });

    test('should reset failed login attempts and update lastLoginAt on successful login', async () => {
      const userWithFailedAttempts = User.rehydrate({
        id: userId,
        email,
        passwordHash,
        status: 'active',
        failedLoginAttempts: 3,
        lockoutUntil: null,
        permissionsVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        lastPasswordChangedAt: null,
        lastFailedLoginAt: null,
        deletedAt: null,
      });

      spyOn(mockUserRepo, 'findByEmail').mockImplementation(async () => userWithFailedAttempts);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => true);
      const updateSpy = spyOn(mockUserRepo, 'update');

      await service.login(email, password, '127.0.0.1', null, null);

      expect(userWithFailedAttempts.failedLoginAttempts).toBe(0);
      expect(userWithFailedAttempts.lastLoginAt).not.toBeNull();
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('refreshToken()', () => {
    const validRefreshPayload = {
      sub: userId,
      sid: sessionId,
      jti: jwtId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    test('should successfully rotate tokens', async () => {
      spyOn(mockTokenService, 'verifyRefreshToken').mockImplementation(
        async () => validRefreshPayload
      );
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => testUser);
      const rotateSpy = spyOn(mockSessionService, 'rotateRefreshToken');
      const touchSpy = spyOn(mockSessionService, 'touchSession');
      const genAccessSpy = spyOn(mockTokenService, 'generateAccessToken');
      const genRefreshSpy = spyOn(mockTokenService, 'generateRefreshToken');

      const result = await service.refreshToken('mock.refresh.token');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock.access.token');
      expect(result.refreshToken).toBe('mock.refresh.token');

      expect(rotateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          oldTokenHash: hashToken('mock.refresh.token'),
          newTokenHash: hashToken('mock.refresh.token'),
        }),
        expect.anything()
      );
      expect(touchSpy).toHaveBeenCalledWith(sessionId, expect.anything());
      expect(genAccessSpy).toHaveBeenCalled();
      expect(genRefreshSpy).toHaveBeenCalled();
    });

    test('should throw ValidationError if token parameter is empty', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if token contains only whitespace', async () => {
      await expect(service.refreshToken('   ')).rejects.toThrow(ValidationError);
      await expect(service.refreshToken('\n')).rejects.toThrow(ValidationError);
      await expect(service.refreshToken('\t')).rejects.toThrow(ValidationError);
    });

    test('should throw AuthenticationError if token is invalid or signature verification fails', async () => {
      spyOn(mockTokenService, 'verifyRefreshToken').mockImplementation(async () => null);

      await expect(service.refreshToken('invalid.token')).rejects.toThrow(AuthenticationError);
    });

    test('should propagate rotateRefreshToken exceptions (e.g. replay attack)', async () => {
      spyOn(mockTokenService, 'verifyRefreshToken').mockImplementation(
        async () => validRefreshPayload
      );
      spyOn(mockSessionService, 'rotateRefreshToken').mockImplementation(async () => {
        throw new AuthenticationError('Token reuse detected. Session revoked.');
      });

      await expect(service.refreshToken('mock.refresh.token')).rejects.toThrow(
        'Token reuse detected. Session revoked.'
      );
    });

    test('should throw AuthenticationError if user is not found during access token regeneration', async () => {
      spyOn(mockTokenService, 'verifyRefreshToken').mockImplementation(
        async () => validRefreshPayload
      );
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => null);

      await expect(service.refreshToken('mock.refresh.token')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('logout()', () => {
    test('should successfully revoke session', async () => {
      const revokeSpy = spyOn(mockSessionService, 'revokeSession');
      await service.logout(sessionId);
      expect(revokeSpy).toHaveBeenCalledWith(sessionId, 'logout', expect.anything());
    });

    test('should throw ValidationError if sessionId is empty', async () => {
      await expect(service.logout('')).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if sessionId contains only whitespace', async () => {
      await expect(service.logout('   ')).rejects.toThrow(ValidationError);
      await expect(service.logout('\n')).rejects.toThrow(ValidationError);
      await expect(service.logout('\t')).rejects.toThrow(ValidationError);
    });

    test('should propagate NotFoundError if session not found', async () => {
      spyOn(mockSessionService, 'revokeSession').mockImplementation(async () => {
        throw new NotFoundError('Session not found');
      });

      await expect(service.logout(sessionId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('logoutAllDevices()', () => {
    test('should successfully revoke all sessions for user', async () => {
      const revokeAllSpy = spyOn(mockSessionService, 'revokeAllSessions');
      await service.logoutAllDevices(userId);
      expect(revokeAllSpy).toHaveBeenCalledWith(userId, 'logout_all', expect.anything());
    });

    test('should throw ValidationError if userId is empty', async () => {
      await expect(service.logoutAllDevices('')).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if userId contains only whitespace', async () => {
      await expect(service.logoutAllDevices('   ')).rejects.toThrow(ValidationError);
      await expect(service.logoutAllDevices('\n')).rejects.toThrow(ValidationError);
    });
  });

  describe('changePassword()', () => {
    test('should successfully update password, increment permissions version, and logout other devices', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => testUser);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => true);
      const validatePolicySpy = spyOn(mockPasswordService, 'validatePolicy');
      const hashSpy = spyOn(mockPasswordService, 'hash').mockImplementation(
        async () => 'newPasswordHash123'
      );
      const updateRepoSpy = spyOn(mockUserRepo, 'update');
      const revokeAllSessionsSpy = spyOn(mockSessionService, 'revokeAllSessions');

      const oldVersion = testUser.permissionsVersion;
      await service.changePassword(userId, password, 'NewSecurePassword123!');

      expect(testUser.passwordHash).toBe('newPasswordHash123');
      expect(testUser.permissionsVersion).toBe(oldVersion + 1);
      expect(validatePolicySpy).toHaveBeenCalledWith('NewSecurePassword123!');
      expect(hashSpy).toHaveBeenCalledWith('NewSecurePassword123!');
      expect(updateRepoSpy).toHaveBeenCalledWith(testUser, expect.anything());
      expect(revokeAllSessionsSpy).toHaveBeenCalledWith(userId, 'password_change', expect.anything());
    });

    test('should throw ValidationError if fields are missing', async () => {
      await expect(service.changePassword('', password, 'newpass')).rejects.toThrow(
        ValidationError
      );
    });

    test('should throw ValidationError if fields contain only whitespace', async () => {
      await expect(service.changePassword('   ', password, 'newpass')).rejects.toThrow(
        ValidationError
      );
      await expect(service.changePassword(userId, '\n', 'newpass')).rejects.toThrow(
        ValidationError
      );
      await expect(service.changePassword(userId, password, '\t')).rejects.toThrow(ValidationError);
    });

    test('should throw NotFoundError if user is not found', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => null);

      await expect(service.changePassword(userId, password, 'newpass')).rejects.toThrow(
        NotFoundError
      );
    });

    test('should throw AuthenticationError if current password verification fails', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => testUser);
      spyOn(mockPasswordService, 'verify').mockImplementation(async () => false);

      await expect(service.changePassword(userId, password, 'newpass')).rejects.toThrow(
        AuthenticationError
      );
    });

    test('should propagate repository errors on update', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => testUser);
      spyOn(mockUserRepo, 'update').mockImplementation(async () => {
        throw new Error('Database write error');
      });

      await expect(service.changePassword(userId, password, 'newpass')).rejects.toThrow(
        'Database write error'
      );
    });

    test('should propagate revoke session failures on update', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => testUser);
      spyOn(mockSessionService, 'revokeAllSessions').mockImplementation(async () => {
        throw new Error('Revocation error');
      });

      await expect(service.changePassword(userId, password, 'newpass')).rejects.toThrow(
        'Revocation error'
      );
    });
  });
});
