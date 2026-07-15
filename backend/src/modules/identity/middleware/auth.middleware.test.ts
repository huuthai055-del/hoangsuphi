import { expect, test, describe, beforeEach, afterEach, spyOn } from 'bun:test';
import { authMiddleware } from './auth.middleware';
import { optionalAuthMiddleware } from './optional-auth.middleware';
import {
  requireAuthenticated,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  requireRole,
  requireAnyRole,
} from './permission.middleware';
import { User } from '../domain/user.entity';
import type { ITokenService, AccessTokenPayload } from '../service/token.service';
import type { ISessionService } from '../service/session.service';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { IPermissionRepository } from '../repository/permissions-repository.interface';

describe('Identity Middlewares', () => {
  let mockTokenService: ITokenService;
  let mockSessionService: ISessionService;
  let mockUserRepo: IUserRepository;
  let mockPermissionRepo: IPermissionRepository;
  const originalNow = Date.now;

  const userId = '019f4264-a179-7672-b7b6-278802ae1916';
  const email = 'test@example.com';
  const sessionId = '019f4264-a179-7672-b7b6-278802ae1917';
  const validToken = 'valid.token.string';

  let testUser: User;
  let userProps: any;
  let validPayload: AccessTokenPayload;

  const createMockContext = (
    headers: Record<string, string> = {},
    contextVars: Record<string, any> = {}
  ) => {
    const store = new Map<string, any>(Object.entries(contextVars));
    return {
      req: {
        header: (name: string) => {
          const lowerName = name.toLowerCase();
          return headers[lowerName] || headers[name] || null;
        },
      },
      get: (key: string) => store.get(key),
      set: (key: string, value: any) => {
        store.set(key, value);
      },
    } as any;
  };

  beforeEach(() => {
    userProps = {
      id: userId,
      email,
      passwordHash: '$2y$10$hash',
      status: 'active' as const,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      permissionsVersion: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      lastPasswordChangedAt: null,
      lastFailedLoginAt: null,
      deletedAt: null,
    };

    testUser = User.rehydrate(userProps);

    validPayload = {
      sub: userId,
      email,
      sid: sessionId,
      permissionsVersion: 2,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    mockTokenService = {
      generateAccessToken: async () => 'access',
      generateRefreshToken: async () => 'refresh',
      verifyAccessToken: async () => validPayload,
      verifyRefreshToken: async () => null,
      decode: () => null,
    };

    mockSessionService = {
      createSession: async () => ({}) as any,
      createRefreshToken: async () => ({}) as any,
      rotateRefreshToken: async () => ({}) as any,
      revokeSession: async () => {},
      revokeAllSessions: async () => {},
      isSessionActive: async () => true,
      touchSession: async () => {},
    };

    mockUserRepo = {
      findById: async () => testUser,
      findByEmail: async () => null,
      existsByEmail: async () => false,
      create: async () => {},
      update: async () => {},
      delete: async () => {},
      assignRole: async () => {},
      removeRole: async () => {},
      findRoleByCode: async () => null,
    };

    mockPermissionRepo = {
      findByUserId: async () => ['regions:create', 'regions:update'],
      findRolesByUserId: async () => ['user'],
    };
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  describe('authMiddleware', () => {
    test('should set context user successfully for a valid token and active session', async () => {
      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      const touchSpy = spyOn(mockSessionService, 'touchSession');

      await middleware(c, next);

      expect(nextCalled).toBe(true);
      expect(touchSpy).toHaveBeenCalledWith(sessionId);

      const userInContext = c.get('user');
      expect(userInContext).toBeDefined();
      expect(userInContext.id).toBe(userId);
      expect(userInContext.email).toBe(email);
      expect(userInContext.sessionId).toBe(sessionId);
      expect(userInContext.permissionsVersion).toBe(2);
    });

    test('should throw AuthenticationError if Authorization header is missing', async () => {
      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({}, {});

      await expect(middleware(c, async () => {})).rejects.toThrow(
        'Unauthorized'
      );
    });

    test('should throw AuthenticationError if Authorization header has wrong bearer format', async () => {
      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: 'Basic abc' });

      await expect(middleware(c, async () => {})).rejects.toThrow(
        'Unauthorized'
      );
    });

    test('should throw AuthenticationError for malformed or invalid token signature', async () => {
      spyOn(mockTokenService, 'verifyAccessToken').mockImplementation(async () => null);
      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: 'Bearer invalid' });

      await expect(middleware(c, async () => {})).rejects.toThrow(
        'Unauthorized'
      );
    });

    test('should throw AuthenticationError if user is not found in database', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => null);
      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if user is inactive', async () => {
      const inactiveUser = User.rehydrate({
        ...userProps,
        status: 'inactive',
      });
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => inactiveUser);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if permissionsVersion mismatch', async () => {
      const userWithOldVersion = User.rehydrate({
        ...userProps,
        permissionsVersion: 3, // Token has 2
      });
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => userWithOldVersion);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if session identifier (sid) is missing in JWT payload', async () => {
      const payloadWithoutSid = { ...validPayload };
      (payloadWithoutSid as any).sid = undefined;
      spyOn(mockTokenService, 'verifyAccessToken').mockImplementation(async () => payloadWithoutSid as any);
      
      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: `Bearer ${validToken}` });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if session identifier (sid) in JWT is not a valid UUID', async () => {
      const payloadWithBadSid = { ...validPayload, sid: 'not-a-uuid' };
      spyOn(mockTokenService, 'verifyAccessToken').mockImplementation(async () => payloadWithBadSid as any);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: `Bearer ${validToken}` });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if session is inactive or expired', async () => {
      spyOn(mockSessionService, 'isSessionActive').mockImplementation(async () => false);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should continue request normally even if session touch fails', async () => {
      spyOn(mockSessionService, 'touchSession').mockImplementation(async () => {
        throw new Error('Touch failed');
      });

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeDefined();
    });

    test('should throw AuthenticationError if user status is suspended', async () => {
      const suspendedUser = User.rehydrate({
        ...userProps,
        status: 'suspended',
      });
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => suspendedUser);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if user status is deleted', async () => {
      const deletedUser = User.rehydrate({
        ...userProps,
        status: 'deleted',
        deletedAt: new Date(),
      });
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => deletedUser);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should throw AuthenticationError if user status is locked', async () => {
      const lockedUser = User.rehydrate({
        ...userProps,
        status: 'locked',
        lockoutUntil: new Date(Date.now() + 60000),
      });
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => lockedUser);

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
    });

    test('should propagate repository exceptions on findById', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => {
        throw new Error('Database connection failed');
      });

      const middleware = authMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      await expect(middleware(c, async () => {})).rejects.toThrow('Database connection failed');
    });
  });

  describe('optionalAuthMiddleware', () => {
    test('should bypass silently and call next() if no token header is provided', async () => {
      const middleware = optionalAuthMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({}, {});

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeUndefined();
    });

    test('should set context user if a valid token is provided', async () => {
      const middleware = optionalAuthMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeDefined();
      expect(c.get('user').id).toBe(userId);
    });

    test('should bypass silently and call next() if token signature is invalid', async () => {
      spyOn(mockTokenService, 'verifyAccessToken').mockImplementation(async () => null);
      const middleware = optionalAuthMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: 'Bearer invalid' });

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeUndefined();
    });

    test('should bypass silently if user not found or inactive', async () => {
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => null);
      const middleware = optionalAuthMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: `Bearer ${validToken}` });

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeUndefined();
    });

    test('should bypass silently if session is inactive', async () => {
      spyOn(mockSessionService, 'isSessionActive').mockImplementation(async () => false);
      const middleware = optionalAuthMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({
        authorization: `Bearer ${validToken}`,
        'x-session-id': sessionId,
      });

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeUndefined();
    });

    test('should bypass silently if permissionsVersion mismatches', async () => {
      const mismatchedUser = User.rehydrate({
        ...userProps,
        permissionsVersion: 9,
      });
      spyOn(mockUserRepo, 'findById').mockImplementation(async () => mismatchedUser);

      const middleware = optionalAuthMiddleware(mockTokenService, mockSessionService, mockUserRepo, mockPermissionRepo);
      const c = createMockContext({ authorization: `Bearer ${validToken}` });

      let nextCalled = false;
      await middleware(c, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(c.get('user')).toBeUndefined();
    });
  });

  describe('permission.middleware', () => {
    const authUser = {
      id: userId,
      email,
      sessionId,
      permissionsVersion: 2,
      permissions: ['regions:create', 'regions:update'],
      roles: ['admin'],
    };

    describe('requireAuthenticated', () => {
      test('should call next() if user exists in context', async () => {
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await requireAuthenticated(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });

      test('should throw AuthenticationError if user is missing in context', async () => {
        const c = createMockContext({}, {});
        await expect(requireAuthenticated(c, async () => {})).rejects.toThrow(
          'Unauthorized'
        );
      });
    });

    describe('requirePermission', () => {
      test('should call next() if user has the permission', async () => {
        const middleware = requirePermission('regions:create');
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await middleware(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });

      test('should throw AuthorizationError if user lacks the permission', async () => {
        const middleware = requirePermission('admin:all');
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });

      test('should throw AuthenticationError if user is not in context', async () => {
        const middleware = requirePermission('regions:create');
        const c = createMockContext({}, {});

        await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
      });

      test('should throw AuthorizationError if permission is empty or whitespace', async () => {
        const middleware = requirePermission('   ');
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });
    });

    describe('requireAllPermissions', () => {
      test('should call next() if user has all of the permissions', async () => {
        const middleware = requireAllPermissions(['regions:create', 'regions:update']);
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await middleware(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });

      test('should throw AuthorizationError if user is missing any permission', async () => {
        const middleware = requireAllPermissions(['regions:create', 'regions:delete']);
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });

      test('should throw AuthenticationError if user is missing in context', async () => {
        const middleware = requireAllPermissions(['regions:create']);
        const c = createMockContext({}, {});

        await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
      });

      test('should throw AuthorizationError if permissions list is empty', async () => {
        const middleware = requireAllPermissions([]);
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });
    });

    describe('requireAnyPermission', () => {
      test('should call next() if user has at least one of the permissions', async () => {
        const middleware = requireAnyPermission(['regions:create', 'regions:delete']);
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await middleware(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });

      test('should throw AuthorizationError if user lacks all permissions', async () => {
        const middleware = requireAnyPermission(['regions:delete', 'regions:publish']);
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });

      test('should throw AuthenticationError if user is missing in context', async () => {
        const middleware = requireAnyPermission(['regions:create']);
        const c = createMockContext({}, {});

        await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
      });

      test('should throw AuthorizationError if permissions list is empty', async () => {
        const middleware = requireAnyPermission([]);
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });
    });

    describe('requireRole', () => {
      test('should call next() if user has the allowed role', async () => {
        const middleware = requireRole('admin');
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await middleware(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });

      test('should call next() if user has any role from lists', async () => {
        const middleware = requireRole(['editor', 'admin']);
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await middleware(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });

      test('should throw AuthorizationError if user lacks the role', async () => {
        const middleware = requireRole('editor');
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });

      test('should throw AuthenticationError if user is missing in context', async () => {
        const middleware = requireRole('admin');
        const c = createMockContext({}, {});

        await expect(middleware(c, async () => {})).rejects.toThrow('Unauthorized');
      });

      test('should throw AuthorizationError if allowedRoles is empty array', async () => {
        const middleware = requireRole([]);
        const c = createMockContext({}, { user: authUser });

        await expect(middleware(c, async () => {})).rejects.toThrow('Permission denied');
      });
    });

    describe('requireAnyRole', () => {
      test('should call next() if user has any role', async () => {
        const middleware = requireAnyRole(['viewer', 'admin']);
        const c = createMockContext({}, { user: authUser });
        let nextCalled = false;

        await middleware(c, async () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      });
    });
  });
});
