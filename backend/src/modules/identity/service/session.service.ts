import { env } from '@/config/env';
import { parseDurationToSeconds } from '@/common/utils/duration';
import { ValidationError, AuthenticationError, NotFoundError } from '@/common/errors/http.errors';
import { generateUuidV7, isValidUuid } from '@/common/utils/uuid';

export interface UserSessionModel {
  id: string;
  userId: string;
  deviceName: string | null;
  ipAddress: string;
  userAgent: string | null;
  expiresAt: Date;
  lastActivityAt: Date;
  isRevoked: boolean;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenModel {
  id: string; // Used as both Primary Key and JWT ID (jti) since schema does not have a separate jti column.
  userId: string;
  sessionId: string;
  tokenHash: string;
  parentId: string | null;
  familyId: string;
  version: number;
  isUsed: boolean;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  ipAddress: string;
  userAgent: string | null;
  deviceName: string | null;
}

export interface CreateRefreshTokenInput {
  userId: string;
  sessionId: string;
  tokenHash: string;
  jwtId: string;
  familyId: string;
}

export interface RotateTokenInput {
  oldTokenHash: string;
  newTokenHash: string;
  newJwtId: string;
}

export interface IUserSessionRepository {
  create(session: UserSessionModel, tx?: unknown): Promise<void>;
  findById(id: string, tx?: unknown): Promise<UserSessionModel | null>;
  update(session: UserSessionModel, tx?: unknown): Promise<void>;
  revokeAllUserSessions(userId: string, reason: string, tx?: unknown): Promise<void>;
}

export interface IRefreshTokenRepository {
  create(token: RefreshTokenModel, tx?: unknown): Promise<void>;
  findById(id: string, tx?: unknown): Promise<RefreshTokenModel | null>;
  // Expects a unique hash constraint (enforced by unique index on `token_hash` in DB schema).
  // CRITICAL PRODUCTION REQUIREMENT: The implementation MUST use row locking (e.g. `SELECT ... FOR UPDATE`)
  // to prevent race conditions when concurrent refresh requests arrive.
  findByHash(hash: string, tx?: unknown): Promise<RefreshTokenModel | null>;
  update(token: RefreshTokenModel, tx?: unknown): Promise<void>;
  revokeFamily(familyId: string, tx?: unknown): Promise<void>;
  revokeAllUserTokens(userId: string, tx?: unknown): Promise<void>;
  revokeAllSessionTokens(sessionId: string, tx?: unknown): Promise<void>;
}

export interface ISessionService {
  createSession(input: CreateSessionInput, tx?: unknown): Promise<UserSessionModel>;
  createRefreshToken(input: CreateRefreshTokenInput, tx?: unknown): Promise<RefreshTokenModel>;
  rotateRefreshToken(input: RotateTokenInput, tx?: unknown): Promise<RefreshTokenModel>;
  revokeSession(sessionId: string, reason?: string, tx?: unknown): Promise<void>;
  revokeAllSessions(userId: string, reason?: string, tx?: unknown): Promise<void>;
  isSessionActive(sessionId: string): Promise<boolean>;
  touchSession(sessionId: string, tx?: unknown): Promise<void>;
}

export class SessionService implements ISessionService {
  private readonly refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN;
  // Threshold to avoid continuous DB writes on every HTTP request.
  // We only update lastActivityAt if at least 1 minute (60,000ms) has passed since the last update.
  private readonly touchThresholdMs = 60_000;

  constructor(
    private readonly sessionRepo: IUserSessionRepository,
    private readonly tokenRepo: IRefreshTokenRepository
  ) {}

  private validateUuid(value: string, fieldName: string): void {
    if (!isValidUuid(value)) {
      throw new ValidationError(`Invalid ${fieldName} format`);
    }
  }

  private getRefreshExpiry(): Date {
    return new Date(Date.now() + parseDurationToSeconds(this.refreshExpiresIn) * 1000);
  }

  public async createSession(input: CreateSessionInput, tx?: unknown): Promise<UserSessionModel> {
    if (!input.userId) {
      throw new ValidationError('UserId is required');
    }
    this.validateUuid(input.userId, 'userId');

    if (!input.ipAddress || !input.ipAddress.trim()) {
      throw new ValidationError('IpAddress is required');
    }

    const now = new Date();
    const expiresAt = this.getRefreshExpiry();
    const session: UserSessionModel = {
      id: generateUuidV7(),
      userId: input.userId,
      deviceName: input.deviceName,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt,
      lastActivityAt: now,
      isRevoked: false,
      revokedReason: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.sessionRepo.create(session, tx);
    return session;
  }

  public async createRefreshToken(input: CreateRefreshTokenInput, tx?: unknown): Promise<RefreshTokenModel> {
    if (!input.userId || !input.sessionId || !input.tokenHash || !input.jwtId || !input.familyId) {
      throw new ValidationError('Missing required properties for refresh token creation');
    }
    this.validateUuid(input.userId, 'userId');
    this.validateUuid(input.sessionId, 'sessionId');
    this.validateUuid(input.jwtId, 'jwtId');
    // Note: familyId is validated as UUID because in DB schema `family_id` column uses the UUID type.
    this.validateUuid(input.familyId, 'familyId');

    const now = new Date();
    const expiresAt = this.getRefreshExpiry();
    const token: RefreshTokenModel = {
      id: input.jwtId,
      userId: input.userId,
      sessionId: input.sessionId,
      tokenHash: input.tokenHash,
      parentId: null,
      familyId: input.familyId,
      version: 1,
      isUsed: false,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.tokenRepo.create(token, tx);
    return token;
  }

  /**
   * TRANSACTION BOUNDARY & CONCURRENCY CONTROL INSTRUCTION:
   * This method MUST be executed inside a single database transaction.
   * To prevent token replay race conditions (e.g., duplicate concurrent requests),
   * the underlying tokenRepository.findByHash() MUST lock the target row (using `FOR UPDATE`
   * or the transaction must be run with SERIALIZABLE isolation level).
   *
   * Step 1: Update old token (mark isUsed = true)
   * Step 2: Create new token (insert record)
   *
   * The transaction boundary and error handling/rollback logic must be
   * managed at the caller level (AuthService layer) that coordinates database transactions.
   */
  public async rotateRefreshToken(input: RotateTokenInput, tx?: unknown): Promise<RefreshTokenModel> {
    if (!input.oldTokenHash || !input.newTokenHash || !input.newJwtId) {
      throw new ValidationError('Missing required parameters for token rotation');
    }
    this.validateUuid(input.newJwtId, 'newJwtId');

    const oldToken = await this.tokenRepo.findByHash(input.oldTokenHash, tx);
    if (!oldToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if token has expired
    if (oldToken.expiresAt.getTime() < Date.now()) {
      throw new AuthenticationError('Refresh token has expired');
    }

    // Replay Attack Detection: If token is already used or revoked
    if (oldToken.isUsed || oldToken.isRevoked) {
      // 1. Revoke the entire token family
      await this.tokenRepo.revokeFamily(oldToken.familyId, tx);

      // 2. Revoke all active tokens of the parent session for maximum consistency
      await this.tokenRepo.revokeAllSessionTokens(oldToken.sessionId, tx);

      // 3. Revoke the corresponding session
      const session = await this.sessionRepo.findById(oldToken.sessionId, tx);
      if (session) {
        const now = new Date();
        session.isRevoked = true;
        session.revokedReason = 'replay_attack';
        session.updatedAt = now;
        await this.sessionRepo.update(session, tx);
      }

      throw new AuthenticationError('Token reuse detected. Session revoked.');
    }

    // Check if parent session is active
    const session = await this.sessionRepo.findById(oldToken.sessionId, tx);
    if (!session || session.isRevoked || session.expiresAt.getTime() < Date.now()) {
      throw new AuthenticationError('Session is no longer active');
    }

    const now = new Date();
    oldToken.isUsed = true;
    oldToken.updatedAt = now;
    await this.tokenRepo.update(oldToken, tx);

    const expiresAt = this.getRefreshExpiry();
    const newToken: RefreshTokenModel = {
      id: input.newJwtId,
      userId: oldToken.userId,
      sessionId: oldToken.sessionId,
      tokenHash: input.newTokenHash,
      parentId: oldToken.id,
      familyId: oldToken.familyId,
      version: oldToken.version + 1,
      isUsed: false,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.tokenRepo.create(newToken, tx);
    return newToken;
  }

  public async revokeSession(sessionId: string, reason = 'logout', tx?: unknown): Promise<void> {
    if (!sessionId) {
      throw new ValidationError('SessionId is required');
    }
    this.validateUuid(sessionId, 'sessionId');

    const session = await this.sessionRepo.findById(sessionId, tx);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (!session.isRevoked) {
      const now = new Date();
      session.isRevoked = true;
      session.revokedReason = reason;
      session.updatedAt = now;
      await this.sessionRepo.update(session, tx);
    }

    // Single Device Logout Consistency: Also revoke all refresh tokens of this session
    await this.tokenRepo.revokeAllSessionTokens(sessionId, tx);
  }

  public async revokeAllSessions(userId: string, reason = 'logout_all', tx?: unknown): Promise<void> {
    if (!userId) {
      throw new ValidationError('UserId is required');
    }
    this.validateUuid(userId, 'userId');

    // Revoke all sessions in database
    await this.sessionRepo.revokeAllUserSessions(userId, reason, tx);
    // Revoke all refresh tokens in database
    await this.tokenRepo.revokeAllUserTokens(userId, tx);
  }

  public async isSessionActive(sessionId: string): Promise<boolean> {
    if (!sessionId) {
      return false;
    }
    if (!isValidUuid(sessionId)) {
      return false;
    }
    try {
      const session = await this.sessionRepo.findById(sessionId);
      if (!session) {
        return false;
      }
      return !session.isRevoked && session.expiresAt.getTime() > Date.now();
    } catch {
      return false;
    }
  }

  public async touchSession(sessionId: string, tx?: unknown): Promise<void> {
    if (!sessionId) {
      throw new ValidationError('SessionId is required');
    }
    this.validateUuid(sessionId, 'sessionId');

    const session = await this.sessionRepo.findById(sessionId, tx);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.isRevoked || session.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('Cannot touch an inactive session');
    }

    // Performance Optimization: Only update DB lastActivityAt if threshold is met
    const now = Date.now();
    const timeSinceLastTouch = now - session.lastActivityAt.getTime();
    if (timeSinceLastTouch < this.touchThresholdMs) {
      return; // Bypass write update
    }

    const nowTime = new Date();
    session.lastActivityAt = nowTime;
    session.updatedAt = nowTime;
    await this.sessionRepo.update(session, tx);
  }
}
