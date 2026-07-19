import { describe, expect, it } from 'bun:test';
import { ExternalServiceError } from '@/common/errors/http.errors';
import { RedisStoreAdapter } from './redis-store.adapter';

describe('RedisStoreAdapter Fail-Closed & Error Mapping (SYS_005)', () => {
  it('should throw ExternalServiceError (SYS_005) when operations fail or Redis is disconnected', async () => {
    // Connect to an invalid port where no Redis server exists
    const adapter = new RedisStoreAdapter('redis://127.0.0.1:19999');

    // Because enableOfflineQueue is false and the server is disconnected,
    // calls should immediately reject wrapped in ExternalServiceError
    await expect(adapter.get('test_key')).rejects.toThrow(ExternalServiceError);
    await expect(adapter.set('test_key', 'val', 60)).rejects.toThrow(ExternalServiceError);
    await expect(adapter.setIfAbsent('test_key', 'val', 60)).rejects.toThrow(ExternalServiceError);
    await expect(adapter.delete('test_key')).rejects.toThrow(ExternalServiceError);
    await expect(adapter.increment('test_key', 60)).rejects.toThrow(ExternalServiceError);
    await expect(adapter.ttl('test_key')).rejects.toThrow(ExternalServiceError);

    try {
      await adapter.get('test_key');
    } catch (err) {
      expect(err instanceof ExternalServiceError).toBe(true);
      if (err instanceof ExternalServiceError) {
        expect(err.errorCode).toBe('SYS_005');
        expect(err.statusCode).toBe(502);
        expect(err.details).toEqual({ operation: 'get' });
        expect((err.details as any)?.key).toBeUndefined();
      }
    } finally {
      adapter.disconnect();
    }
  });

  it('should reject non-positive TTLs with standard error before calling Redis', async () => {
    const adapter = new RedisStoreAdapter('redis://127.0.0.1:19999');
    await expect(adapter.set('test_key', 'val', 0)).rejects.toThrow('TTL must be positive');
    await expect(adapter.setIfAbsent('test_key', 'val', -5)).rejects.toThrow('TTL must be positive');
    await expect(adapter.increment('test_key', 0)).rejects.toThrow('TTL must be positive');
    adapter.disconnect();
  });
});
