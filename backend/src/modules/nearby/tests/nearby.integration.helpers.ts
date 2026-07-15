import { container } from '@/common/di/container';
import * as schema from '@/lib/database/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Hono } from 'hono';
import postgres from 'postgres';
import { createApp } from '../../../app';
import { DrizzleNearbyRepository } from '../repository/nearby.repository';

export function getTestDatabaseUrl(): string {
  const url = process.env.SEARCH_TEST_DATABASE_URL;
  if (!url) {
    throw new Error('SEARCH_TEST_DATABASE_URL env var is not set');
  }
  return url;
}

export function setupTestApp(testDatabaseUrl: string): {
  app: Hono;
  sqlClient: ReturnType<typeof postgres>;
} {
  const sqlClient = postgres(testDatabaseUrl, { max: 5, prepare: false });
  const testDb = drizzle(sqlClient, { schema });
  const realRepository = new DrizzleNearbyRepository(testDb);

  // Reset the DI container and register the real repository connected to the test database
  container.reset();
  container.register('NearbyRepository', realRepository);

  const app = createApp();

  return { app, sqlClient };
}

export function getParamErrorReason(invalidParams: unknown, name: string): string | undefined {
  if (!Array.isArray(invalidParams)) return undefined;
  const param = invalidParams.find(
    (p): p is { name: string; reason: string } =>
      p && typeof p === 'object' && 'name' in p && p.name === name
  );
  return param ? param.reason : undefined;
}
