import { createHash } from 'node:crypto';
import { generateUuidV7 } from '../../../common/utils/uuid';
import type { IRedisStore } from '../../../lib/redis/redis-store.interface';
import { auditLogger, logger } from '../../../lib/logger';
import { Redirect, type RedirectStatusCode, type RedirectUpdateProps } from '../domain/redirect.entity';
import {
  RedirectNotFoundError,
  RedirectSelfError,
} from '../domain/redirect.errors';
import type {
  CreateRedirectDto,
  ListRedirectsQueryDto,
  UpdateRedirectDto,
} from '../dto/redirects.dto';
import type { IRedirectsRepository } from '../repository/redirects.repository.interface';
import { decodeRedirectCursor, encodeRedirectCursor } from './redirect-cursor.codec';
import { normalizeRedirectPath, validateRedirectSourcePath } from './redirect-path-normalizer';

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'redirect:resolution:';

export interface RedirectResolution {
  targetPath: string;
  statusCode: RedirectStatusCode;
}

export interface IRedirectsService {
  resolveRedirect(sourcePath: string): Promise<RedirectResolution | null>;
  createRedirect(dto: CreateRedirectDto, adminId: string): Promise<Redirect>;
  updateRedirect(id: string, dto: UpdateRedirectDto, adminId: string): Promise<Redirect>;
  deleteRedirect(id: string, adminId: string): Promise<void>;
  listRedirects(query: ListRedirectsQueryDto): Promise<{
    items: Redirect[];
    nextCursor: string | null;
  }>;
  getRedirectById(id: string): Promise<Redirect>;
}

export class RedirectsService implements IRedirectsService {
  constructor(
    private readonly repository: IRedirectsRepository,
    private readonly redis: IRedisStore
  ) {}

  async resolveRedirect(sourcePath: string): Promise<RedirectResolution | null> {
    const normalizedSource = normalizeRedirectPath(sourcePath, 'loose');
    const cacheKey = this.getCacheKey(normalizedSource);
    const cached = await this.readCachedResolution(cacheKey);
    if (cached) {
      return cached;
    }

    const redirect = await this.repository.findBySource(normalizedSource);
    if (!redirect?.isActive) {
      return null;
    }

    const resolution = this.toResolution(redirect);
    await this.cacheResolution(cacheKey, resolution);
    return resolution;
  }

  async createRedirect(dto: CreateRedirectDto, adminId: string): Promise<Redirect> {
    const sourcePath = normalizeRedirectPath(dto.sourcePath, 'strict');
    const targetPath = normalizeRedirectPath(dto.targetPath, 'strict');
    validateRedirectSourcePath(sourcePath);
    this.assertNotSelfRedirect(sourcePath, targetPath);

    const redirect = Redirect.create({
      id: generateUuidV7(),
      sourcePath,
      targetPath,
      statusCode: dto.statusCode ?? 301,
      isActive: dto.isActive ?? true,
      createdBy: adminId,
    });
    await this.repository.create(redirect);
    await this.refreshActiveRedirectCache(redirect);
    this.writeAuditEvent('redirect.create', adminId, redirect);
    return redirect;
  }

  async updateRedirect(id: string, dto: UpdateRedirectDto, adminId: string): Promise<Redirect> {
    const existing = await this.getRedirectById(id);
    const updates: RedirectUpdateProps = {};

    if (dto.sourcePath !== undefined) {
      updates.sourcePath = normalizeRedirectPath(dto.sourcePath, 'strict');
      validateRedirectSourcePath(updates.sourcePath);
    }
    if (dto.targetPath !== undefined) {
      updates.targetPath = normalizeRedirectPath(dto.targetPath, 'strict');
    }
    if (dto.statusCode !== undefined) {
      updates.statusCode = dto.statusCode;
    }
    if (dto.isActive !== undefined) {
      updates.isActive = dto.isActive;
    }

    const sourcePath = updates.sourcePath ?? existing.sourcePath;
    const targetPath = updates.targetPath ?? existing.targetPath;
    this.assertNotSelfRedirect(sourcePath, targetPath);

    const previousSourcePath = existing.sourcePath;
    existing.update(updates);
    await this.repository.update(existing);

    await this.invalidateCache(previousSourcePath);
    if (sourcePath !== previousSourcePath) {
      await this.invalidateCache(sourcePath);
    }
    await this.refreshActiveRedirectCache(existing);
    this.writeAuditEvent('redirect.update', adminId, existing);
    return existing;
  }

  async deleteRedirect(id: string, adminId: string): Promise<void> {
    const existing = await this.getRedirectById(id);
    existing.softDelete();
    await this.repository.softDelete(existing);
    await this.invalidateCache(existing.sourcePath);
    this.writeAuditEvent('redirect.delete', adminId, existing);
  }

  async listRedirects(query: ListRedirectsQueryDto): Promise<{
    items: Redirect[];
    nextCursor: string | null;
  }> {
    const result = await this.repository.list({
      limit: query.limit,
      cursor: query.cursor ? decodeRedirectCursor(query.cursor) : undefined,
    });
    return {
      items: result.items,
      nextCursor: result.nextCursor ? encodeRedirectCursor(result.nextCursor) : null,
    };
  }

  async getRedirectById(id: string): Promise<Redirect> {
    const redirect = await this.repository.findById(id);
    if (!redirect) {
      throw new RedirectNotFoundError(id);
    }
    return redirect;
  }

  private getCacheKey(sourcePath: string): string {
    return `${CACHE_PREFIX}${sourcePath}`;
  }

  private async readCachedResolution(cacheKey: string): Promise<RedirectResolution | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) {
        return null;
      }
      const parsed: unknown = JSON.parse(cached);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return null;
      }
      const record = parsed as Record<string, unknown>;
      const statusCode = record.statusCode;
      const targetPath = record.targetPath;
      if (!isRedirectStatusCode(statusCode) || typeof targetPath !== 'string') {
        return null;
      }
      const canonicalTarget = normalizeRedirectPath(targetPath, 'strict');
      return canonicalTarget === targetPath
        ? { targetPath: canonicalTarget, statusCode }
        : null;
    } catch (error) {
      logger.warn({ errorType: errorName(error) }, 'Redirect cache read failed; falling back to database');
      return null;
    }
  }

  private async refreshActiveRedirectCache(redirect: Redirect): Promise<void> {
    if (redirect.isActive && !redirect.deletedAt) {
      await this.cacheResolution(this.getCacheKey(redirect.sourcePath), this.toResolution(redirect));
    }
  }

  private async cacheResolution(cacheKey: string, resolution: RedirectResolution): Promise<void> {
    try {
      await this.redis.set(cacheKey, JSON.stringify(resolution), CACHE_TTL_SECONDS);
    } catch (error) {
      logger.warn({ errorType: errorName(error) }, 'Redirect cache write failed after database commit');
    }
  }

  private async invalidateCache(sourcePath: string): Promise<void> {
    try {
      await this.redis.delete(this.getCacheKey(sourcePath));
    } catch (error) {
      logger.warn({ errorType: errorName(error) }, 'Redirect cache invalidation failed after database commit');
    }
  }

  private assertNotSelfRedirect(sourcePath: string, targetPath: string): void {
    if (sourcePath === targetPath) {
      throw new RedirectSelfError();
    }
  }

  private toResolution(redirect: Redirect): RedirectResolution {
    return { targetPath: redirect.targetPath, statusCode: redirect.statusCode };
  }

  private writeAuditEvent(action: string, adminId: string, redirect: Redirect): void {
    auditLogger.info(
      {
        action,
        actorId: adminId,
        redirectId: redirect.id,
        sourcePathHash: createHash('sha256').update(redirect.sourcePath).digest('hex'),
        statusCode: redirect.statusCode,
        isActive: redirect.isActive,
      },
      'Redirect management change'
    );
  }
}

function isRedirectStatusCode(value: unknown): value is RedirectStatusCode {
  return value === 301 || value === 302;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
