import { sign, verify, decode } from 'hono/jwt';
import { env } from '@/config/env';
import { parseDurationToSeconds } from '@/common/utils/duration';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  sid: string;
  permissionsVersion: number;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface GenerateAccessTokenInput {
  userId: string;
  email: string;
  sessionId: string;
  permissionsVersion: number;
}

export interface GenerateRefreshTokenInput {
  userId: string;
  sessionId: string;
  jwtId: string;
}

export interface ITokenService {
  generateAccessToken(payload: GenerateAccessTokenInput): Promise<string>;
  generateRefreshToken(payload: GenerateRefreshTokenInput): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload | null>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
  decode<T>(token: string): T | null;
}

export class TokenService implements ITokenService {
  private readonly accessSecret = env.JWT_ACCESS_SECRET;
  private readonly refreshSecret = env.JWT_REFRESH_SECRET;
  private readonly accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN;
  private readonly refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN;
  private readonly algorithm = 'HS256' as const;

  private getIssuedAt(): number {
    return Math.floor(Date.now() / 1000);
  }

  private isAccessPayload(payload: Record<string, unknown>): payload is AccessTokenPayload {
    return (
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.sid === 'string' &&
      typeof payload.permissionsVersion === 'number' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    );
  }

  private isRefreshPayload(payload: Record<string, unknown>): payload is RefreshTokenPayload {
    return (
      typeof payload.sub === 'string' &&
      typeof payload.sid === 'string' &&
      typeof payload.jti === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    );
  }

  public async generateAccessToken(payload: GenerateAccessTokenInput): Promise<string> {
    const iat = this.getIssuedAt();
    const exp = iat + parseDurationToSeconds(this.accessExpiresIn);

    const tokenPayload = {
      sub: payload.userId,
      email: payload.email,
      sid: payload.sessionId,
      permissionsVersion: payload.permissionsVersion,
      iat,
      exp,
    };

    return sign(tokenPayload, this.accessSecret, this.algorithm);
  }

  public async generateRefreshToken(payload: GenerateRefreshTokenInput): Promise<string> {
    const iat = this.getIssuedAt();
    const exp = iat + parseDurationToSeconds(this.refreshExpiresIn);

    const tokenPayload = {
      sub: payload.userId,
      sid: payload.sessionId,
      jti: payload.jwtId,
      iat,
      exp,
    };

    return sign(tokenPayload, this.refreshSecret, this.algorithm);
  }

  public async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    if (!token) return null;
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    try {
      const verified = (await verify(cleanToken, this.accessSecret, this.algorithm)) as Record<
        string,
        unknown
      >;
      if (!this.isAccessPayload(verified)) {
        return null;
      }
      return verified;
    } catch {
      return null;
    }
  }

  public async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    if (!token) return null;
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    try {
      const verified = (await verify(cleanToken, this.refreshSecret, this.algorithm)) as Record<
        string,
        unknown
      >;
      if (!this.isRefreshPayload(verified)) {
        return null;
      }
      return verified;
    } catch {
      return null;
    }
  }

  /**
   * decode() DOES NOT VERIFY SIGNATURE.
   * Only decodes and parses the token's JSON payload. Use with caution.
   */
  public decode<T>(token: string): T | null {
    if (!token) return null;
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    try {
      const { payload } = decode(cleanToken);
      return payload as T;
    } catch {
      return null;
    }
  }
}
