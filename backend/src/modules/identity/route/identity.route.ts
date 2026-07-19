import { container } from '@/common/di/container';
import { rateLimit } from '@/middleware/rate-limit';
import { validateBody } from '@/middleware/validator';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { EmailVerificationConstants } from '../constants/email-verification.constants';
import {
  ConfirmVerificationRequestSchema,
  ResendVerificationRequestSchema,
} from '../dto/email-verification.dto';
import {
  ChangePasswordRequestSchema,
  LoginRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
} from '../dto/identity.dto';
import {
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
} from '../dto/password-recovery.dto';
import { PasswordRecoveryConstants } from '../constants/password-recovery.constants';
import type { AuthService } from '../service/auth.service';
import type { EmailVerificationController } from './email-verification.controller';
import type { IdentityController } from './identity.controller';
import type { PasswordRecoveryController } from './password-recovery.controller';

const identityRouter = new Hono();

// Dependency Injection Setup
const authGuard: MiddlewareHandler = (c, next) =>
  container.resolve<MiddlewareHandler>('AuthGuard')(c, next);
const getController = (): IdentityController =>
  container.resolve<IdentityController>('IdentityController');
const getEmailVerificationController = (): EmailVerificationController =>
  container.resolve<EmailVerificationController>('EmailVerificationController');
const getPasswordRecoveryController = (): PasswordRecoveryController =>
  container.resolve<PasswordRecoveryController>('PasswordRecoveryController');

// Public Routes — rate-limited by IP to mitigate brute-force and enumeration.
// Account-level lockout in User domain is kept as an independent second layer.
identityRouter.post(
  '/register',
  rateLimit('identity-register', 5),
  validateBody(RegisterRequestSchema),
  (c) => getController().register(c)
);

identityRouter.post(
  '/login',
  rateLimit('identity-login', 10),
  validateBody(LoginRequestSchema),
  (c) => getController().login(c)
);

identityRouter.post(
  '/refresh',
  rateLimit('identity-refresh', 20),
  validateBody(RefreshRequestSchema),
  (c) => getController().refresh(c)
);

identityRouter.post(
  '/email-verification/resend',
  rateLimit(
    'email-verification/resend-ip',
    EmailVerificationConstants.RATE_LIMIT_IP_MAX,
    EmailVerificationConstants.RATE_LIMIT_WINDOW_MS
  ),
  validateBody(ResendVerificationRequestSchema),
  (c) => getEmailVerificationController().resend(c)
);

identityRouter.post(
  '/email-verification/confirm',
  rateLimit(
    'email-verification/confirm-ip',
    EmailVerificationConstants.RATE_LIMIT_CONFIRM_IP_MAX,
    EmailVerificationConstants.RATE_LIMIT_WINDOW_MS
  ),
  validateBody(ConfirmVerificationRequestSchema),
  (c) => getEmailVerificationController().confirm(c)
);

identityRouter.post(
  '/password/forgot',
  rateLimit(
    'password/forgot-ip',
    PasswordRecoveryConstants.RATE_LIMIT_FORGOT_IP_MAX,
    PasswordRecoveryConstants.RATE_LIMIT_WINDOW_MS
  ),
  validateBody(ForgotPasswordRequestSchema),
  (c) => getPasswordRecoveryController().forgot(c)
);

identityRouter.post(
  '/password/reset',
  rateLimit(
    'password/reset-ip',
    PasswordRecoveryConstants.RATE_LIMIT_RESET_IP_MAX,
    PasswordRecoveryConstants.RATE_LIMIT_WINDOW_MS
  ),
  validateBody(ResetPasswordRequestSchema),
  (c) => getPasswordRecoveryController().reset(c)
);

// Protected Routes
identityRouter.post('/logout', authGuard, (c) => getController().logout(c));

identityRouter.post('/logout-all', authGuard, (c) => getController().logoutAll(c));

identityRouter.post('/change-password', authGuard, validateBody(ChangePasswordRequestSchema), (c) =>
  getController().changePassword(c)
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
      '/auth/email-verification/resend': {
        post: {
          summary: 'Resend email verification link',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                  },
                  required: ['email'],
                },
              },
            },
          },
          responses: {
            202: {
              description: 'Verification email accepted and will be sent if account exists',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation failed' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/auth/email-verification/confirm': {
        post: {
          summary: 'Confirm email address with token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', example: 'raw-token-string' },
                  },
                  required: ['token'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Email verification successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Token invalid or expired' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/auth/password/forgot': {
        post: {
          summary: 'Request a password-reset link without disclosing account state',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                  },
                  required: ['email'],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            202: {
              description: 'Generic reset-link request acceptance',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation failed' },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/auth/password/reset': {
        post: {
          summary: 'Reset password with a one-time password-reset token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', example: 'raw-token-string' },
                    newPassword: { type: 'string', format: 'password' },
                  },
                  required: ['token', 'newPassword'],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Password reset successful; existing sessions are revoked',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation failed or token invalid/expired' },
            429: { description: 'Rate limit exceeded' },
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
