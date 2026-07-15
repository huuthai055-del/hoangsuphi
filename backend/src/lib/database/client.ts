import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, isDev } from '@/config/env';
import { logger } from '@/lib/logger';
import * as schema from './schema';

class DrizzlePinoLogger {
  logQuery(query: string, params: unknown[]): void {
    if (isDev) {
      logger.debug({ query, params }, '🔌 Database Query');
    }
  }
}

const queryClient = postgres(env.DATABASE_URL, {
  max: env.DATABASE_POOL_MAX,
  idle_timeout: env.DATABASE_IDLE_TIMEOUT_MS / 1000,
  connect_timeout: env.DATABASE_CONNECT_TIMEOUT_MS / 1000,
  max_lifetime: 1800,
});

export const db = drizzle(queryClient, {
  schema,
  logger: isDev ? new DrizzlePinoLogger() : false,
});

export type Database = typeof db;
export type TransactionClient = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function dbHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    await queryClient`SELECT 1`;
    const latencyMs = Math.round(performance.now() - start);
    return { status: 'healthy', latencyMs };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ error: error.message }, '❌ Database health check failed');
    return {
      status: 'unhealthy',
      latencyMs: Math.round(performance.now() - start),
      error: error.message,
    };
  }
}

export async function runInTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      logger.error({ error }, '🔌 Database Transaction rollback');
      throw error;
    }
  });
}
