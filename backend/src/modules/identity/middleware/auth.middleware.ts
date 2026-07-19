import { AuthenticationError } from '@/common/errors/http.errors';
import { isValidUuid } from '@/common/utils/uuid';
import { logger } from '@/lib/logger';
import { createMiddleware } from 'hono/factory';
import type { IPermissionRepository } from '../repository/permissions-repository.interface';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { ISessionService } from '../service/session.service';
import type { ITokenService } from '../service/token.service';
import type { AuthenticatedUser } from './identity.context';

export const USER_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted',
  SUSPENDED: 'suspended',
  LOCKED: 'locked',
} as const;

export const AUTH_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
} as const;

/**
 * Authentication Middleware for Hono.
 * - Extracts access token from Authorization Header.
 * - Verifies token signature, expiration and payload structure.
 * - Extracts and validates the active sessionId directly from the JWT payload.
 * - Verifies session status from Database first (credential verification).
 * - Resolves the corresponding User and verifies account status and permissionsVersion.
 * - Resolves permissions to prevent excessive downstream DB queries.
 * - Auto-touches the session to maintain activity (logs failure safely).
 * - Sets the authenticated user info with loaded permissions in Hono context.
 */
export function authMiddleware(
  tokenService: ITokenService,
  sessionService: ISessionService,
  userRepo: IUserRepository,
  permissionRepo: IPermissionRepository
) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Auth failed: Missing or invalid Authorization header');
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.substring(7).trim();
    const payload = await tokenService.verifyAccessToken(token);
    if (!payload) {
      logger.warn('Auth failed: Invalid or expired access token');
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    if (!payload.sid) {
      logger.warn({ userId: payload.sub }, 'Auth failed: Missing sid in JWT payload');
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    const sessionId = payload.sid;
    if (!isValidUuid(sessionId)) {
      logger.warn({ userId: payload.sub, sessionId }, 'Auth failed: Invalid session UUID format');
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    // Step 2: Session active verification (performed first to bypass User query on revoked sessions)
    const isSessionActive = await sessionService.isSessionActive(sessionId);
    if (!isSessionActive) {
      logger.warn(
        { userId: payload.sub, sessionId },
        'Auth failed: Session is inactive or expired'
      );
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    // Step 3: User lookup
    const user = await userRepo.findById(payload.sub);
    if (!user) {
      logger.warn({ userId: payload.sub, sessionId }, 'Auth failed: User not found in database');
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    // Step 4: User account status check
    switch (user.status) {
      case USER_STATUS.ACTIVE:
        break;
      case USER_STATUS.DELETED:
        logger.warn({ userId: user.id, sessionId }, 'Auth failed: User account is deleted');
        throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
      case USER_STATUS.SUSPENDED:
        logger.warn({ userId: user.id, sessionId }, 'Auth failed: User account is suspended');
        throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
      case USER_STATUS.LOCKED:
        logger.warn({ userId: user.id, sessionId }, 'Auth failed: User account is locked');
        throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
      default:
        logger.warn(
          { userId: user.id, sessionId, status: user.status },
          'Auth failed: User account status is inactive'
        );
        throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    // Step 5: Permissions version check
    if (user.permissionsVersion !== payload.permissionsVersion) {
      logger.warn(
        {
          userId: user.id,
          sessionId,
          userVersion: user.permissionsVersion,
          tokenVersion: payload.permissionsVersion,
        },
        'Auth failed: permissionsVersion mismatch'
      );
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    // Step 5.5: Load permissions and roles to optimise downstream DB queries
    const permissions = await permissionRepo.findByUserId(user.id);
    const roles = await permissionRepo.findRolesByUserId(user.id);

    // Step 6: Touch session activity (failure should not halt user request but must be logged)
    try {
      await sessionService.touchSession(sessionId);
    } catch (err) {
      logger.warn({ err, sessionId }, 'Failed to touch session activity');
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      sessionId,
      permissionsVersion: user.permissionsVersion,
      permissions,
      roles,
    };

    c.set('user', authUser);

    await next();
  });
}
