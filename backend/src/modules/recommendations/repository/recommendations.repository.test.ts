import { describe, expect, test } from 'bun:test';
import type { Database } from '@/lib/database/client';
import {
  DrizzleRecommendationsRepository,
  RecommendationsRepositoryOperationError,
} from './recommendations.repository';

describe('DrizzleRecommendationsRepository', () => {
  test('wraps database failures without exposing the raw database message', async () => {
    const database = {
      execute: async () => {
        throw new Error('postgres://secret-user:secret-password@db.internal/recommendations');
      },
    } as unknown as Database;
    const repository = new DrizzleRecommendationsRepository(database);

    try {
      await repository.findNewest({ limit: 6 });
      throw new Error('Expected repository call to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RecommendationsRepositoryOperationError);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Recommendations repository newest recommendations failed');
      expect((error as Error).message).not.toContain('secret-password');
    }
  });
});
