import { AuthenticationError, AuthorizationError } from '@/common/errors/http.errors';
import { createMiddleware } from 'hono/factory';
import { AUTH_MESSAGES } from './auth.middleware';

export const PERMISSION_MESSAGES = {
  PERMISSION_DENIED: 'Permission denied',
} as const;

/**
 * Ensures user is authenticated (c.get('user') is set).
 */
export const requireAuthenticated = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
  }
  await next();
});

/**
 * Ensures user has the specific permission code.
 */
export function requirePermission(permission: string) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    if (!permission || !permission.trim()) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    if (!user.permissions || !user.permissions.includes(permission)) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    await next();
  });
}

/**
 * Ensures user has ALL of the specified permission codes.
 */
export function requireAllPermissions(permissions: string[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    if (!permissions || permissions.length === 0) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    const userPermissions = user.permissions || [];
    const hasAll = permissions.every((p) => {
      if (!p || !p.trim()) return false;
      return userPermissions.includes(p);
    });

    if (!hasAll) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    await next();
  });
}

/**
 * Ensures user has AT LEAST ONE of the specified permission codes.
 */
export function requireAnyPermission(permissions: string[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    if (!permissions || permissions.length === 0) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    const userPermissions = user.permissions || [];
    const hasAny = permissions.some((p) => {
      if (!p || !p.trim()) return false;
      return userPermissions.includes(p);
    });

    if (!hasAny) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    await next();
  });
}

/**
 * Ensures user has the allowed role(s).
 */
export function requireRole(allowedRoles: string | string[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new AuthenticationError(AUTH_MESSAGES.UNAUTHORIZED);
    }

    const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (rolesToCheck.length === 0) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    const userRolesList = user.roles || [];
    const hasRole = rolesToCheck.some((r) => {
      if (!r || !r.trim()) return false;
      return userRolesList.includes(r);
    });

    if (!hasRole) {
      throw new AuthorizationError(PERMISSION_MESSAGES.PERMISSION_DENIED);
    }

    await next();
  });
}

/**
 * Ensures user has AT LEAST ONE of the specified roles.
 */
export function requireAnyRole(allowedRoles: string[]) {
  return requireRole(allowedRoles);
}
