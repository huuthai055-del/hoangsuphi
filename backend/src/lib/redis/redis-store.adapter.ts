import { createHash } from 'node:crypto';
import { ExternalServiceError } from '@/common/errors/http.errors';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';
import type { IRedisStore } from './redis-store.interface';

export class RedisStoreAdapter implements IRedisStore {
  private client: Redis;

  private static readonly incrementWithTtlScript = `
    local count = redis.call('INCR', KEYS[1])
    if redis.call('TTL', KEYS[1]) < 0 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return count
  `;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // stop retrying
        }
        return Math.min(times * 50, 2000);
      },
    });

    this.client.on('error', (err) => {
      logger.error({ errorType: err.name }, 'Redis Client Error');
    });
  }

  /** Waits for a usable Redis connection without weakening normal fail-closed operations. */
  async waitUntilReady(timeoutMs = 5_000): Promise<void> {
    if (this.client.status === 'ready') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Redis did not become ready within ${timeoutMs}ms`));
      }, timeoutMs);
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onEnd = () => {
        cleanup();
        reject(new Error('Redis connection closed before becoming ready'));
      };
      const cleanup = () => {
        clearTimeout(timeout);
        this.client.off('ready', onReady);
        this.client.off('end', onEnd);
      };

      this.client.once('ready', onReady);
      this.client.once('end', onEnd);
    });
  }

  /** Releases the client for test teardown or application shutdown. */
  disconnect(): void {
    this.client.disconnect();
  }

  private handleError(operation: string, key: string, err: unknown): never {
    const keyHash = createHash('sha256').update(key).digest('hex');
    logger.error(
      {
        operation,
        keyHash,
        errorType: err instanceof Error ? err.name : 'UnknownError',
      },
      'Redis operation failed'
    );
    throw new ExternalServiceError(
      'Dịch vụ lưu trữ tạm thời không khả dụng',
      { operation },
      err instanceof Error ? err : new Error(String(err))
    );
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      this.handleError('get', key, err);
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch (err) {
      this.handleError('set', key, err);
    }
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    try {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      this.handleError('setIfAbsent', key, err);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const deletedCount = await this.client.del(key);
      return deletedCount > 0;
    } catch (err) {
      this.handleError('delete', key, err);
    }
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    try {
      const result = await this.client.eval(
        RedisStoreAdapter.incrementWithTtlScript,
        1,
        key,
        ttlSeconds
      );
      if (typeof result !== 'number') {
        throw new Error('Redis increment script returned an invalid result');
      }
      return result;
    } catch (err) {
      this.handleError('increment', key, err);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (err) {
      this.handleError('ttl', key, err);
    }
  }
}
