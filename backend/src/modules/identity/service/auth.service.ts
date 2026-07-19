import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/common/errors/http.errors';
import { hashToken } from '@/common/utils/token-hash';
import { generateUuidV7 } from '@/common/utils/uuid';
import { runInTransaction } from '@/lib/database/client';
import { logger } from '@/lib/logger';
import { User } from '../domain/user.entity';
import type { IUserRepository } from '../repository/users-repository.interface';
import type { IEmailVerificationService } from './email-verification.service';
import type { IPasswordService } from './password.service';
import type { ISessionService, UserSessionModel } from './session.service';
import type { ITokenService } from './token.service';

export interface UserResponseDto {
  id: string;
  email: string;
  permissionsVersion: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  session: UserSessionModel;
  user: UserResponseDto;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthService {
  register(email: string, password: string, displayName: string): Promise<User>;
  login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string | null,
    deviceName: string | null
  ): Promise<LoginResult>;
  refreshToken(refreshToken: string): Promise<RefreshResult>;
  logout(sessionId: string): Promise<void>;
  logoutAllDevices(userId: string): Promise<void>;
  changePassword(userId: string, currentPass: string, newPass: string): Promise<void>;
}

export class AuthService implements IAuthService {
  constructor(
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
    private readonly sessionService: ISessionService,
    private readonly userRepo: IUserRepository,
    private readonly emailVerificationService: IEmailVerificationService
  ) {}

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  public async register(email: string, password: string, _displayName: string): Promise<User> {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!trimmedEmail || !trimmedPassword) {
      throw new ValidationError('Email and password are required');
    }

    this.validateEmail(trimmedEmail);

    const user = await runInTransaction(async (tx) => {
      const exists = await this.userRepo.existsByEmail(trimmedEmail, tx);
      if (exists) {
        throw new ConflictError('Email already exists');
      }

      this.passwordService.validatePolicy(trimmedPassword);
      const passwordHash = await this.passwordService.hash(trimmedPassword);
      const userId = generateUuidV7();

      const newUser = User.create({
        id: userId,
        email: trimmedEmail,
        passwordHash,
      });

      await this.userRepo.create(newUser, tx);

      // Assign default 'viewer' role via user repository
      const role = await this.userRepo.findRoleByCode('viewer', tx);
      if (!role) {
        throw new Error('Default role "viewer" not found in the database. Please run seeding.');
      }

      await this.userRepo.assignRole(userId, role.id, tx);

      return newUser;
    });

    try {
      await this.emailVerificationService.issueAndSendVerificationEmail(user.id, user.email);
    } catch (error) {
      // As per Contract v0.5 Section 3.4:
      // Register (Đăng ký): Nếu gửi email bị lỗi, User vẫn được tạo thành công với trạng thái pending_verification.
      const redactedEmail = user.email.replace(/(?<=^.{1})[^@\n]+(?=@)/, '***');
      logger.error(
        {
          errorCode: error instanceof Error ? error.name : 'UnknownError',
          userId: user.id,
          email: redactedEmail,
        },
        '[AuthService] Error sending verification email during register'
      );
    }

    return user;
  }

  public async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string | null,
    deviceName: string | null
  ): Promise<LoginResult> {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();
    const trimmedIp = (ipAddress || '').trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedIp) {
      throw new ValidationError('Email, password, and IP address are required');
    }

    this.validateEmail(trimmedEmail);

    return runInTransaction(async (tx) => {
      const user = await this.userRepo.findByEmail(trimmedEmail, tx);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if account is currently locked out
      if (user.isLocked()) {
        throw new AuthenticationError('Account is temporarily locked. Please try again later.');
      }

      // Auto-unlock if account was locked but lockout timer expired
      if (user.status === 'locked' && !user.isLocked()) {
        user.unlock();
        await this.userRepo.update(user, tx);
      }

      // Verify other account status restrictions
      if (user.status !== 'active') {
        throw new AuthenticationError(`Account is not active (status: ${user.status})`);
      }

      const isPasswordValid = await this.passwordService.verify(trimmedPassword, user.passwordHash);
      if (!isPasswordValid) {
        user.increaseFailedLoginAttempts();
        if (user.failedLoginAttempts >= 5) {
          user.lock(new Date(Date.now() + 15 * 60 * 1000)); // Lockout for 15 minutes
        }
        await this.userRepo.update(user, tx);
        throw new AuthenticationError('Invalid email or password');
      }

      // Record successful login (resets failedLoginAttempts & updates lastLoginAt)
      user.recordLogin();
      await this.userRepo.update(user, tx);

      const session = await this.sessionService.createSession(
        {
          userId: user.id,
          ipAddress: trimmedIp,
          userAgent,
          deviceName,
        },
        tx
      );

      const jwtId = generateUuidV7();
      const familyId = generateUuidV7();

      const accessToken = await this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        sessionId: session.id,
        permissionsVersion: user.permissionsVersion,
      });

      const refreshToken = await this.tokenService.generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
        jwtId,
      });

      const tokenHash = hashToken(refreshToken);

      await this.sessionService.createRefreshToken(
        {
          userId: user.id,
          sessionId: session.id,
          tokenHash,
          jwtId,
          familyId,
        },
        tx
      );

      return {
        accessToken,
        refreshToken,
        session,
        user: {
          id: user.id,
          email: user.email,
          permissionsVersion: user.permissionsVersion,
        },
      };
    });
  }

  public async refreshToken(refreshTokenStr: string): Promise<RefreshResult> {
    const trimmedToken = (refreshTokenStr || '').trim();
    if (!trimmedToken) {
      throw new ValidationError('Refresh token is required');
    }

    const payload = await this.tokenService.verifyRefreshToken(trimmedToken);
    if (!payload) {
      throw new AuthenticationError('Invalid refresh token');
    }

    return runInTransaction(async (tx) => {
      const oldTokenHash = hashToken(trimmedToken);
      const newJwtId = generateUuidV7();

      const newRefreshToken = await this.tokenService.generateRefreshToken({
        userId: payload.sub,
        sessionId: payload.sid,
        jwtId: newJwtId,
      });

      const newTokenHash = hashToken(newRefreshToken);

      await this.sessionService.rotateRefreshToken(
        {
          oldTokenHash,
          newTokenHash,
          newJwtId,
        },
        tx
      );

      // Update session activity on token rotation
      await this.sessionService.touchSession(payload.sid, tx);

      const user = await this.userRepo.findById(payload.sub, tx);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      const newAccessToken = await this.tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        sessionId: payload.sid,
        permissionsVersion: user.permissionsVersion,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    });
  }

  public async logout(sessionId: string): Promise<void> {
    const trimmedSessionId = (sessionId || '').trim();
    if (!trimmedSessionId) {
      throw new ValidationError('SessionId is required');
    }

    await runInTransaction(async (tx) => {
      await this.sessionService.revokeSession(trimmedSessionId, 'logout', tx);
    });
  }

  public async logoutAllDevices(userId: string): Promise<void> {
    const trimmedUserId = (userId || '').trim();
    if (!trimmedUserId) {
      throw new ValidationError('UserId is required');
    }

    await runInTransaction(async (tx) => {
      await this.sessionService.revokeAllSessions(trimmedUserId, 'logout_all', tx);
    });
  }

  public async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const trimmedUserId = (userId || '').trim();
    const trimmedCurrent = (currentPass || '').trim();
    const trimmedNew = (newPass || '').trim();

    if (!trimmedUserId || !trimmedCurrent || !trimmedNew) {
      throw new ValidationError('All fields are required');
    }

    return runInTransaction(async (tx) => {
      const user = await this.userRepo.findById(trimmedUserId, tx);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isCurrentValid = await this.passwordService.verify(trimmedCurrent, user.passwordHash);
      if (!isCurrentValid) {
        throw new AuthenticationError('Invalid current password');
      }

      this.passwordService.validatePolicy(trimmedNew);
      const newPasswordHash = await this.passwordService.hash(trimmedNew);

      user.changePassword(newPasswordHash);
      await this.userRepo.update(user, tx);

      await this.sessionService.revokeAllSessions(trimmedUserId, 'password_change', tx);
    });
  }
}
