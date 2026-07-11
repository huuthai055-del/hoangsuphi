import { Hono } from 'hono';
import { IdentityController } from './identity.controller';
import { AuthService } from '../service/auth.service';
import { PasswordService } from '../service/password.service';
import { TokenService } from '../service/token.service';
import { SessionService } from '../service/session.service';
import { DrizzleUserRepository } from '../repository/users.repository';
import { DrizzleSessionRepository } from '../repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '../repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '../repository/permissions.repository';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  ChangePasswordRequestSchema,
} from '../dto/identity.dto';
import { validateBody } from '@/middleware/validator';

const identityRouter = new Hono();

// Dependency Injection Setup
const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();
const tokenRepo = new DrizzleRefreshTokenRepository();
const permissionRepo = new DrizzlePermissionRepository();

const passwordService = new PasswordService();
const tokenService = new TokenService();
const sessionService = new SessionService(sessionRepo, tokenRepo);
const authService = new AuthService(passwordService, tokenService, sessionService, userRepo);

const controller = new IdentityController(authService);
const authGuard = authMiddleware(tokenService, sessionService, userRepo, permissionRepo);

// Public Routes
identityRouter.post('/register', validateBody(RegisterRequestSchema), controller.register);

identityRouter.post('/login', validateBody(LoginRequestSchema), controller.login);

identityRouter.post('/refresh', validateBody(RefreshRequestSchema), controller.refresh);

// Protected Routes
identityRouter.post('/logout', authGuard, controller.logout);

identityRouter.post('/logout-all', authGuard, controller.logoutAll);

identityRouter.post(
  '/change-password',
  authGuard,
  validateBody(ChangePasswordRequestSchema),
  controller.changePassword
);

// OpenAPI Spec endpoint for Identity Module
identityRouter.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.3',
    info: {
      title: 'Hoang Su Phi Tourism Portal - Identity & Authentication API',
      version: '1.0.0',
      description:
        'API endpoints for user authentication, registration, password management and session control.',
    },
    paths: {
      '/auth/register': {
        post: {
          summary: 'Register a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'P@ssword123' },
                    displayName: { type: 'string', example: 'John Doe' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string', format: 'email' },
                      permissionsVersion: { type: 'integer' },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation failed' },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Log in to user account and start session',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'P@ssword123' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Successful login',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      session: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          userId: { type: 'string', format: 'uuid' },
                          ipAddress: { type: 'string' },
                          userAgent: { type: 'string', nullable: true },
                          deviceName: { type: 'string', nullable: true },
                          isRevoked: { type: 'boolean' },
                          expiresAt: { type: 'string', format: 'date-time' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          email: { type: 'string', format: 'email' },
                          permissionsVersion: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation failed' },
            401: { description: 'Invalid credentials or account locked' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          summary: 'Rotate Access Token and Refresh Token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                  required: ['refreshToken'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Tokens rotated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation failed' },
            401: {
              description:
                'Invalid, expired, or revoked refresh token (replay attack triggers session revocation)',
            },
          },
        },
      },
      '/auth/logout': {
        post: {
          summary: 'Revoke current session and refresh token',
          security: [{ BearerAuth: [] }],
          responses: {
            204: { description: 'Logged out successfully' },
            401: { description: 'Unauthorized / Invalid Session' },
          },
        },
      },
      '/auth/logout-all': {
        post: {
          summary: 'Revoke all sessions and refresh tokens for user',
          security: [{ BearerAuth: [] }],
          responses: {
            204: { description: 'Logged out of all devices successfully' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/auth/change-password': {
        post: {
          summary: 'Change account password, revoking other device sessions',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string' },
                  },
                  required: ['currentPassword', 'newPassword'],
                },
              },
            },
          },
          responses: {
            204: { description: 'Password changed successfully' },
            400: { description: 'Validation failed / Weak new password' },
            401: { description: 'Unauthorized / Current password verification failed' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  });
});

export { identityRouter };
export type { IdentityController };
export type { AuthService };
