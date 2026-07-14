import { createMiddleware } from 'hono/factory';
import type { ITokenService } from '../service/token.service';
import type { ISessionService } from '../service/session.service';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { IPermissionRepository } from '../repository/permissions-repository.interface';
import type { AuthenticatedUser } from './identity.context';

/**
 * Optional Authentication Middleware for Hono.
 * - Extracts and verifies token if available.
 * - Extracts and validates the active sessionId directly from the JWT payload.
 * - If validation fails or token is missing, bypasses silently and calls next().
 * - Does not throw AuthenticationError.
 */
export function optionalAuthMiddleware(
  tokenService: ITokenService,
  sessionService: ISessionService,
  userRepo: IUserRepository,
  permissionRepo: IPermissionRepository
) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7).trim();
    try {
      const payload = await tokenService.verifyAccessToken(token);
      if (!payload) return next();

      if (!payload.sid) return next();
      const sessionId = payload.sid;

      const isSessionActive = await sessionService.isSessionActive(sessionId);
      if (!isSessionActive) return next();

      const user = await userRepo.findById(payload.sub);
      if (!user || user.status !== 'active') return next();

      if (user.permissionsVersion !== payload.permissionsVersion) return next();

      // Touch session activity silently (ignore db hiccups)
      try {
        await sessionService.touchSession(sessionId);
      } catch {}

      const permissions = await permissionRepo.findByUserId(user.id);
      const roles = await permissionRepo.findRolesByUserId(user.id);

      const authUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        sessionId,
        permissionsVersion: user.permissionsVersion,
        permissions,
        roles,
      };

      c.set('user', authUser);
    } catch {
      // Catch and ignore all verification errors for optional auth
    }

    await next();
  });
}
