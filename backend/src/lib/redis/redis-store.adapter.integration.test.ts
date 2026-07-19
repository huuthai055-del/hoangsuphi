import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { RedisStoreAdapter } from './redis-store.adapter';

describe('RedisStoreAdapter Live Integration Tests', () => {
  let adapter: RedisStoreAdapter;
  const REDIS_TEST_URL = process.env.REDIS_TEST_URL || 'redis://localhost:6379';

  beforeAll(async () => {
    adapter = new RedisStoreAdapter(REDIS_TEST_URL);
    await adapter.waitUntilReady();
    // Ensure redis is up and clean test keys
    await adapter.delete('test_integration_lock');
    await adapter.delete('test_integration_counter');
  });

  afterAll(async () => {
    try {
      await adapter.delete('test_integration_lock');
      await adapter.delete('test_integration_counter');
    } finally {
      adapter.disconnect();
    }
  });

  it('should successfully execute atomic setIfAbsent (SET NX)', async () => {
    const key = 'test_integration_lock';
    
    // First acquisition should succeed
    const acquired1 = await adapter.setIfAbsent(key, 'PROCESSING', 10);
    expect(acquired1).toBe(true);

    // Second acquisition should fail because it already exists
    const acquired2 = await adapter.setIfAbsent(key, 'PROCESSING', 10);
    expect(acquired2).toBe(false);

    const val = await adapter.get(key);
    expect(val).toBe('PROCESSING');
  });

  it('should increment values and maintain rate limit window', async () => {
    const key = 'test_integration_counter';

    const count1 = await adapter.increment(key, 60);
    expect(count1).toBe(1);

    const count2 = await adapter.increment(key, 60);
    expect(count2).toBe(2);

    const ttl = await adapter.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('should assign a TTL atomically when incrementing a legacy key without expiry', async () => {
    const key = `test_integration_legacy_counter_${Date.now()}`;

    try {
      // This simulates a key that could have been left behind by an older deployment.
      await (adapter as unknown as { client: { set: (key: string, value: string) => Promise<unknown> } })
        .client.set(key, '4');
      expect(await adapter.ttl(key)).toBe(-1);

      expect(await adapter.increment(key, 60)).toBe(5);
      expect(await adapter.ttl(key)).toBeGreaterThan(0);
    } finally {
      await adapter.delete(key);
    }
  });

  it('should only allow exactly one concurrent request to acquire idempotency lock', async () => {
    const key = `test_integration_concurrent_lock_${Date.now()}`;
    
    // Fire 50 concurrent lock attempts
    const promises = Array.from({ length: 50 }).map(() =>
      adapter.setIfAbsent(key, 'PROCESSING', 10)
    );
    
    const results = await Promise.all(promises);
    
    // Exactly one should be true, all others should be false
    const successCount = results.filter((res) => res === true).length;
    expect(successCount).toBe(1);
    
    const falseCount = results.filter((res) => res === false).length;
    expect(falseCount).toBe(49);
    
    await adapter.delete(key);
  });
});
