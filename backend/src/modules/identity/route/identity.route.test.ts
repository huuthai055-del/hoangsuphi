import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/common/errors/http.errors';
import type { Hono } from 'hono';
import { User } from '../domain/user.entity';
import { DrizzlePermissionRepository } from '../repository/permissions.repository';
import { DrizzleRefreshTokenRepository } from '../repository/refresh-tokens.repository';
import { DrizzleSessionRepository } from '../repository/sessions.repository';
import { DrizzleUserRepository } from '../repository/users.repository';
import { TokenService } from '../service/token.service';

describe('Identity API Routing & Controller', () => {
  let app: Hono;
  const tokenService = new TokenService();

  const userId = '019f4264-a179-7672-b7b6-278802ae1916';
  const email = 'user@example.com';
  const sessionId = '019f4264-a179-7672-b7b6-278802ae1917';
  const passwordHash = '$2a$10$abcdefghijklmnopqrstuv';

  let testUser: User;
  let testUserProps: any;

  // Repository Mocks definitions
  const mockUserFindById = mock((_id: string) => Promise.resolve<User | null>(null));
  const mockUserFindByEmail = mock((_email: string) => Promise.resolve<User | null>(null));
  const mockUserExistsByEmail = mock((_email: string) => Promise.resolve<boolean>(false));
  const mockUserCreate = mock((_user: any) => Promise.resolve());
  const mockUserUpdate = mock((_user: any) => Promise.resolve());
  const mockUserFindRoleByCode = mock((_code: string) =>
    Promise.resolve<any>({ id: 'viewer-role-id' })
  );
  const mockUserAssignRole = mock((_userId: string, _roleId: string) => Promise.resolve());

  const mockSessionCreate = mock((_session: any) => Promise.resolve());
  const mockSessionFindById = mock((_id: string) => Promise.resolve<any>(null));
  const mockSessionUpdate = mock((_session: any) => Promise.resolve());
  const mockSessionRevokeAll = mock((_userId: string, _reason: string) => Promise.resolve());

  const mockTokenCreate = mock((_token: any) => Promise.resolve());
  const mockTokenFindById = mock((_id: string) => Promise.resolve<any>(null));
  const mockTokenFindByHash = mock((_hash: string) => Promise.resolve<any>(null));
  const mockTokenUpdate = mock((_token: any) => Promise.resolve());
  const mockTokenRevokeFamily = mock((_familyId: string) => Promise.resolve());
  const mockTokenRevokeAllUser = mock((_userId: string) => Promise.resolve());
  const mockTokenRevokeAllSession = mock((_sessionId: string) => Promise.resolve());

  const mockPermissionFindByUserId = mock((_userId: string) => Promise.resolve<string[]>([]));
  const mockPermissionFindRolesByUserId = mock((_userId: string) => Promise.resolve<string[]>([]));

  beforeEach(async () => {
    // Reset global repository mocks
    mockUserFindById.mockReset();
    mockUserFindByEmail.mockReset();
    mockUserExistsByEmail.mockReset();
    mockUserCreate.mockReset();
    mockUserUpdate.mockReset();
    mockUserFindRoleByCode.mockReset().mockResolvedValue({ id: 'viewer-role-id' });
    mockUserAssignRole.mockReset().mockResolvedValue(undefined);
    mockSessionCreate.mockReset();
    mockSessionFindById.mockReset();
    mockSessionUpdate.mockReset();
    mockSessionRevokeAll.mockReset();
    mockTokenCreate.mockReset();
    mockTokenFindById.mockReset();
    mockTokenFindByHash.mockReset();
    mockTokenUpdate.mockReset();
    mockTokenRevokeFamily.mockReset();
    mockTokenRevokeAllUser.mockReset();
    mockTokenRevokeAllSession.mockReset();
    mockPermissionFindByUserId.mockReset();
    mockPermissionFindRolesByUserId.mockReset();

    spyOn(DrizzleUserRepository.prototype, 'findById').mockImplementation(mockUserFindById);
    spyOn(DrizzleUserRepository.prototype, 'findByEmail').mockImplementation(mockUserFindByEmail);
    spyOn(DrizzleUserRepository.prototype, 'existsByEmail').mockImplementation(
      mockUserExistsByEmail
    );
    spyOn(DrizzleUserRepository.prototype, 'create').mockImplementation(mockUserCreate);
    spyOn(DrizzleUserRepository.prototype, 'update').mockImplementation(mockUserUpdate);
    spyOn(DrizzleUserRepository.prototype, 'findRoleByCode').mockImplementation(
      mockUserFindRoleByCode
    );
    spyOn(DrizzleUserRepository.prototype, 'assignRole').mockImplementation(mockUserAssignRole);

    spyOn(DrizzleSessionRepository.prototype, 'create').mockImplementation(mockSessionCreate);
    spyOn(DrizzleSessionRepository.prototype, 'findById').mockImplementation(mockSessionFindById);
    spyOn(DrizzleSessionRepository.prototype, 'update').mockImplementation(mockSessionUpdate);
    spyOn(DrizzleSessionRepository.prototype, 'revokeAllUserSessions').mockImplementation(
      mockSessionRevokeAll
    );

    spyOn(DrizzleRefreshTokenRepository.prototype, 'create').mockImplementation(mockTokenCreate);
    spyOn(DrizzleRefreshTokenRepository.prototype, 'findById').mockImplementation(
      mockTokenFindById
    );
    spyOn(DrizzleRefreshTokenRepository.prototype, 'findByHash').mockImplementation(
      mockTokenFindByHash
    );
    spyOn(DrizzleRefreshTokenRepository.prototype, 'update').mockImplementation(mockTokenUpdate);
    spyOn(DrizzleRefreshTokenRepository.prototype, 'revokeFamily').mockImplementation(
      mockTokenRevokeFamily
    );
    spyOn(DrizzleRefreshTokenRepository.prototype, 'revokeAllUserTokens').mockImplementation(
      mockTokenRevokeAllUser
    );
    spyOn(DrizzleRefreshTokenRepository.prototype, 'revokeAllSessionTokens').mockImplementation(
      mockTokenRevokeAllSession
    );

    spyOn(DrizzlePermissionRepository.prototype, 'findByUserId').mockImplementation(
      mockPermissionFindByUserId
    );
    spyOn(DrizzlePermissionRepository.prototype, 'findRolesByUserId').mockImplementation(
      mockPermissionFindRolesByUserId
    );

    testUserProps = {
      id: userId,
      email,
      passwordHash,
      status: 'active' as const,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      permissionsVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      lastPasswordChangedAt: null,
      lastFailedLoginAt: null,
      deletedAt: null,
    };
    testUser = User.rehydrate(testUserProps);

    // Import createApp dynamically after mock setup
    const { createApp } = await import('../../../app');
    app = createApp();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('POST /api/v1/auth/register', () => {
    test('should register successfully and return user response DTO', async () => {
      mockUserExistsByEmail.mockResolvedValue(false);
      mockUserCreate.mockResolvedValue(undefined);

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'P@ssword123',
          displayName: 'John Doe',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.email).toBe('newuser@example.com');
      expect(body.permissionsVersion).toBe(1);

      // Ensure passwordHash is never returned
      expect(body.passwordHash).toBeUndefined();
      expect(body.failedLoginAttempts).toBeUndefined();
    });

    test('should return 400 Bad Request for invalid email format', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VAL_001'); // ValidationError code
      expect(body.invalidParams).toBeDefined();
    });

    test('should return 400 Bad Request for missing password', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      });

      expect(res.status).toBe(400);
    });

    test('should return 400 Bad Request for malformed payload (extra fields strict)', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
          hackerField: 'malicious',
        }),
      });

      expect(res.status).toBe(400);
    });

    test('should return 409 Conflict if email already exists', async () => {
      mockUserExistsByEmail.mockResolvedValue(true);

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('SYS_003'); // ConflictError code
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login successfully and return LoginResponseDto', async () => {
      mockUserFindByEmail.mockResolvedValue(testUser);
      mockSessionCreate.mockResolvedValue(undefined);
      mockTokenCreate.mockResolvedValue(undefined);

      const { PasswordService } = await import('../service/password.service');
      spyOn(PasswordService.prototype, 'verify').mockResolvedValue(true);

      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'TestAgent',
          'x-device-name': 'Macbook Pro',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123', // password hashing mock verified as true
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.session).toBeDefined();
      expect(body.session.ipAddress).toBe('127.0.0.1');
      expect(body.session.userAgent).toBe('TestAgent');
      expect(body.session.deviceName).toBe('Macbook Pro');
      expect(body.user.email).toBe('user@example.com');

      // Ensure passwordHash is never returned
      expect(body.user.passwordHash).toBeUndefined();
      expect(body.session.tokenHash).toBeUndefined();
    });

    test('should return 401 Unauthorized when password verify fails', async () => {
      mockUserFindByEmail.mockResolvedValue(testUser);
      // We spy on verify and mock it returning false
      const { PasswordService } = await import('../service/password.service');
      spyOn(PasswordService.prototype, 'verify').mockResolvedValue(false);

      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    test('should refresh tokens successfully', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken({
        userId,
        sessionId,
        jwtId: 'jwt-token-id',
      });

      mockTokenFindByHash.mockResolvedValue({
        id: 'jwt-token-id',
        userId,
        sessionId,
        tokenHash: 'somehash',
        parentId: null,
        familyId: 'family-id',
        version: 1,
        isUsed: false,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });
      mockUserFindById.mockResolvedValue(testUser);

      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: validRefreshToken,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    test('should return 401 if refresh token is invalid', async () => {
      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'invalid.refresh.token',
        }),
      });

      expect(res.status).toBe(401);
    });

    test('should revoke family and session if refresh token replay (reuse) is detected', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken({
        userId,
        sessionId,
        jwtId: 'jwt-token-id',
      });

      mockTokenFindByHash.mockResolvedValue({
        id: 'jwt-token-id',
        userId,
        sessionId,
        tokenHash: 'somehash',
        parentId: null,
        familyId: 'family-id',
        version: 1,
        isUsed: true, // already used token
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: validRefreshToken,
        }),
      });

      expect(res.status).toBe(401);
      expect(mockTokenRevokeFamily).toHaveBeenCalledWith('family-id', expect.anything());
      expect(mockTokenRevokeAllSession).toHaveBeenCalledWith(sessionId, expect.anything());
      expect(mockSessionUpdate).toHaveBeenCalled();
    });

    test('should reject refresh if parent session is revoked', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken({
        userId,
        sessionId,
        jwtId: 'jwt-token-id',
      });

      mockTokenFindByHash.mockResolvedValue({
        id: 'jwt-token-id',
        userId,
        sessionId,
        tokenHash: 'somehash',
        parentId: null,
        familyId: 'family-id',
        version: 1,
        isUsed: false,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: true, // revoked session
        expiresAt: new Date(Date.now() + 3600 * 1000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: validRefreshToken,
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected Endpoints (authMiddleware)', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      validAccessToken = await tokenService.generateAccessToken({
        userId,
        email,
        sessionId,
        permissionsVersion: 1,
      });
    });

    test('should reject logout request without Authorization header', async () => {
      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(401);
    });

    test('should successfully logout with valid token', async () => {
      mockUserFindById.mockResolvedValue(testUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(204);
      expect(mockSessionUpdate).toHaveBeenCalled();
    });

    test('should successfully logout all devices', async () => {
      mockUserFindById.mockResolvedValue(testUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(204);
      expect(mockSessionRevokeAll).toHaveBeenCalled();
    });

    test('should successfully change password', async () => {
      mockUserFindById.mockResolvedValue(testUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const { PasswordService } = await import('../service/password.service');
      spyOn(PasswordService.prototype, 'verify').mockResolvedValue(true);

      const res = await app.request('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'CurrentPassword123',
          newPassword: 'NewP@ssword12345',
        }),
      });

      expect(res.status).toBe(204);
      expect(mockUserUpdate).toHaveBeenCalled();
    });

    test('should reject request with expired access token', async () => {
      spyOn(tokenService, 'verifyAccessToken').mockResolvedValueOnce(null);

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
    });

    test('should reject request with revoked or inactive session', async () => {
      mockUserFindById.mockResolvedValue(testUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: true, // inactive session
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
    });

    test('should reject request if user is deleted', async () => {
      const deletedUser = User.rehydrate({
        ...testUserProps,
        status: 'deleted',
      });
      mockUserFindById.mockResolvedValue(deletedUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
    });

    test('should reject request if user is suspended', async () => {
      const suspendedUser = User.rehydrate({
        ...testUserProps,
        status: 'suspended',
      });
      mockUserFindById.mockResolvedValue(suspendedUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
    });

    test('should reject request if user is locked', async () => {
      const lockedUser = User.rehydrate({
        ...testUserProps,
        status: 'locked',
      });
      mockUserFindById.mockResolvedValue(lockedUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
    });

    test('should reject request if user permissionsVersion mismatch', async () => {
      const mismatchedUser = User.rehydrate({
        ...testUserProps,
        permissionsVersion: 99, // mismatch, token has 1
      });
      mockUserFindById.mockResolvedValue(mismatchedUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(401);
    });

    test('should allow request and log warning if touchSession fails (graceful degradation)', async () => {
      mockUserFindById.mockResolvedValue(testUser);
      mockSessionFindById.mockResolvedValue({
        id: sessionId,
        userId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 3600000),
        lastActivityAt: new Date(Date.now() - 120000), // past touch threshold
        updatedAt: new Date(),
      });

      spyOn(DrizzleSessionRepository.prototype, 'update').mockRejectedValueOnce(
        new Error('Database is down')
      );

      const res = await app.request('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(res.status).toBe(204);
    });
  });

  describe('HTTP Error Mapping & Exception Propagation', () => {
    test('ValidationError mapping to 400', async () => {
      const { AuthService } = await import('../service/auth.service');
      spyOn(AuthService.prototype, 'register').mockImplementation(() => {
        throw new ValidationError('Custom validation error');
      });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('VAL_001');
    });

    test('AuthenticationError mapping to 401', async () => {
      mockUserFindByEmail.mockResolvedValue(testUser);
      const { PasswordService } = await import('../service/password.service');
      spyOn(PasswordService.prototype, 'verify').mockResolvedValue(false);

      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('AUTH_001');
    });

    test('AuthorizationError mapping to 403', async () => {
      const { AuthService } = await import('../service/auth.service');
      spyOn(AuthService.prototype, 'register').mockImplementation(() => {
        throw new AuthorizationError('Access Forbidden');
      });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('AUTH_002');
    });

    test('NotFoundError mapping to 404', async () => {
      const { AuthService } = await import('../service/auth.service');
      spyOn(AuthService.prototype, 'register').mockImplementation(() => {
        throw new NotFoundError('User not found');
      });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe('SYS_002');
    });

    test('ConflictError mapping to 409', async () => {
      const { AuthService } = await import('../service/auth.service');
      spyOn(AuthService.prototype, 'register').mockImplementation(() => {
        throw new ConflictError('User conflict');
      });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('SYS_003');
    });

    test('Unexpected Error mapping to 500', async () => {
      const { AuthService } = await import('../service/auth.service');
      spyOn(AuthService.prototype, 'register').mockImplementation(() => {
        throw new Error('Some catastrophic disk crash');
      });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123',
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('SYS_001');
    });
  });

  describe('GET /api/v1/auth/openapi.json', () => {
    test('should return OpenAPI documentation with 200', async () => {
      const res = await app.request('/api/v1/auth/openapi.json');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.openapi).toBe('3.0.3');
      expect(body.info.title).toBeDefined();
      expect(body.paths['/auth/register']).toBeDefined();
      expect(body.paths['/auth/login']).toBeDefined();
      expect(body.paths['/auth/refresh']).toBeDefined();
      expect(body.paths['/auth/logout']).toBeDefined();
      expect(body.paths['/auth/logout-all']).toBeDefined();
      expect(body.paths['/auth/change-password']).toBeDefined();
    });
  });
});
