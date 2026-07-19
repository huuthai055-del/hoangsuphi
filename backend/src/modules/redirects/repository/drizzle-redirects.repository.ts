import { and, desc, eq, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { Database, TransactionClient } from '../../../lib/database/client';
import * as schema from '../../../lib/database/schema';
import { DatabaseError } from '../../../common/errors/http.errors';
import type { Redirect } from '../domain/redirect.entity';
import {
  RedirectChainError,
  RedirectDuplicateError,
  RedirectNotFoundError,
} from '../domain/redirect.errors';
import type {
  IRedirectsRepository,
  ListRedirectsParams,
  ListRedirectsResult,
} from './redirects.repository.interface';
import { toRedirectDomain, toRedirectPersistence } from './redirects.mapper';

const redirectColumns = {
  id: schema.redirects.id,
  sourcePath: schema.redirects.sourcePath,
  targetPath: schema.redirects.targetPath,
  statusCode: schema.redirects.statusCode,
  isActive: schema.redirects.isActive,
  createdBy: schema.redirects.createdBy,
  createdAt: schema.redirects.createdAt,
  updatedAt: schema.redirects.updatedAt,
  deletedAt: schema.redirects.deletedAt,
};

export class DrizzleRedirectsRepository implements IRedirectsRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Redirect | null> {
    try {
      const [result] = await this.db
        .select(redirectColumns)
        .from(schema.redirects)
        .where(and(eq(schema.redirects.id, id), isNull(schema.redirects.deletedAt)))
        .limit(1);
      return result ? toRedirectDomain(result) : null;
    } catch (error) {
      throw new DatabaseError('Failed to find redirect by id', undefined, toError(error));
    }
  }

  async findBySource(sourcePath: string): Promise<Redirect | null> {
    try {
      const [result] = await this.db
        .select(redirectColumns)
        .from(schema.redirects)
        .where(
          and(
            eq(schema.redirects.sourcePath, sourcePath),
            eq(schema.redirects.isActive, true),
            isNull(schema.redirects.deletedAt)
          )
        )
        .limit(1);
      return result ? toRedirectDomain(result) : null;
    } catch (error) {
      throw new DatabaseError('Failed to find active redirect by source', undefined, toError(error));
    }
  }

  private async inGraphTransaction<T>(operation: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Redirect writes are rare. A transaction-scoped lock prevents two concurrent
      // writes from independently passing graph checks and creating a chain/cycle.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('redirects:active-graph'))`);
      return await operation(tx);
    });
  }

  private async findActiveBySource(
    tx: TransactionClient,
    sourcePath: string,
    excludeId?: string
  ): Promise<{ id: string } | undefined> {
    const where = excludeId
      ? and(
          eq(schema.redirects.sourcePath, sourcePath),
          eq(schema.redirects.isActive, true),
          isNull(schema.redirects.deletedAt),
          ne(schema.redirects.id, excludeId)
        )
      : and(
          eq(schema.redirects.sourcePath, sourcePath),
          eq(schema.redirects.isActive, true),
          isNull(schema.redirects.deletedAt)
        );
    const [result] = await tx
      .select({ id: schema.redirects.id })
      .from(schema.redirects)
      .where(where)
      .limit(1);
    return result;
  }

  private async checkGraphConflict(
    tx: TransactionClient,
    sourcePath: string,
    targetPath: string,
    excludeId?: string
  ): Promise<void> {
    const targetIsSource = await this.findActiveBySource(tx, targetPath, excludeId);
    if (targetIsSource) {
      throw new RedirectChainError();
    }

    const sourceIsTargetWhere = excludeId
      ? and(
          eq(schema.redirects.targetPath, sourcePath),
          eq(schema.redirects.isActive, true),
          isNull(schema.redirects.deletedAt),
          ne(schema.redirects.id, excludeId)
        )
      : and(
          eq(schema.redirects.targetPath, sourcePath),
          eq(schema.redirects.isActive, true),
          isNull(schema.redirects.deletedAt)
        );
    const [sourceIsTarget] = await tx
      .select({ id: schema.redirects.id })
      .from(schema.redirects)
      .where(sourceIsTargetWhere)
      .limit(1);
    if (sourceIsTarget) {
      throw new RedirectChainError();
    }
  }

  async create(redirect: Redirect): Promise<void> {
    try {
      await this.inGraphTransaction(async (tx) => {
        if (redirect.isActive) {
          const existing = await this.findActiveBySource(tx, redirect.sourcePath);
          if (existing) {
            throw new RedirectDuplicateError();
          }
          await this.checkGraphConflict(tx, redirect.sourcePath, redirect.targetPath);
        }
        await tx.insert(schema.redirects).values(toRedirectPersistence(redirect));
      });
    } catch (error) {
      rethrowBusinessError(error);
      if (isUniqueViolation(error)) {
        throw new RedirectDuplicateError();
      }
      throw new DatabaseError('Failed to create redirect', undefined, toError(error));
    }
  }

  async update(redirect: Redirect): Promise<void> {
    try {
      await this.inGraphTransaction(async (tx) => {
        if (redirect.isActive) {
          const existing = await this.findActiveBySource(tx, redirect.sourcePath, redirect.id);
          if (existing) {
            throw new RedirectDuplicateError();
          }
          await this.checkGraphConflict(tx, redirect.sourcePath, redirect.targetPath, redirect.id);
        }

        const updated = await tx
          .update(schema.redirects)
          .set(toRedirectPersistence(redirect))
          .where(and(eq(schema.redirects.id, redirect.id), isNull(schema.redirects.deletedAt)))
          .returning({ id: schema.redirects.id });
        if (updated.length !== 1) {
          throw new RedirectNotFoundError(redirect.id);
        }
      });
    } catch (error) {
      rethrowBusinessError(error);
      if (isUniqueViolation(error)) {
        throw new RedirectDuplicateError();
      }
      throw new DatabaseError('Failed to update redirect', undefined, toError(error));
    }
  }

  async softDelete(redirect: Redirect): Promise<void> {
    try {
      await this.inGraphTransaction(async (tx) => {
        const updated = await tx
          .update(schema.redirects)
          .set(toRedirectPersistence(redirect))
          .where(and(eq(schema.redirects.id, redirect.id), isNull(schema.redirects.deletedAt)))
          .returning({ id: schema.redirects.id });
        if (updated.length !== 1) {
          throw new RedirectNotFoundError(redirect.id);
        }
      });
    } catch (error) {
      rethrowBusinessError(error);
      throw new DatabaseError('Failed to delete redirect', undefined, toError(error));
    }
  }

  async list(params: ListRedirectsParams): Promise<ListRedirectsResult> {
    try {
      const where = params.cursor
        ? and(
            isNull(schema.redirects.deletedAt),
            or(
              lt(schema.redirects.createdAt, new Date(params.cursor.createdAt)),
              and(
                eq(schema.redirects.createdAt, new Date(params.cursor.createdAt)),
                lt(schema.redirects.id, params.cursor.id)
              )
            )
          )
        : isNull(schema.redirects.deletedAt);
      const results = await this.db
        .select(redirectColumns)
        .from(schema.redirects)
        .where(where)
        .orderBy(desc(schema.redirects.createdAt), desc(schema.redirects.id))
        .limit(params.limit + 1);
      const pageRows = results.slice(0, params.limit);
      const lastPageRow = pageRows.at(-1);

      return {
        items: pageRows.map(toRedirectDomain),
        nextCursor:
          results.length > params.limit && lastPageRow
            ? { createdAt: lastPageRow.createdAt.toISOString(), id: lastPageRow.id }
            : null,
      };
    } catch (error) {
      throw new DatabaseError('Failed to list redirects', undefined, toError(error));
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function rethrowBusinessError(error: unknown): void {
  const visited = new Set<unknown>();
  let candidate: unknown = error;

  while (candidate && typeof candidate === 'object' && !visited.has(candidate)) {
    if (
      candidate instanceof RedirectDuplicateError ||
      candidate instanceof RedirectChainError ||
      candidate instanceof RedirectNotFoundError
    ) {
      throw candidate;
    }
    visited.add(candidate);
    candidate = 'cause' in candidate ? candidate.cause : undefined;
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
