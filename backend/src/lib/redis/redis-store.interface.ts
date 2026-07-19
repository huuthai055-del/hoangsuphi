export interface IRedisStore {
  /**
   * Get a value from Redis
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in Redis with required TTL (in seconds)
   */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;

  /**
   * Set a value only if it does not exist. Atomic operation.
   * Useful for Idempotency locks.
   * Returns true if set, false if already exists.
   */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Delete a key from Redis
   */
  delete(key: string): Promise<boolean>;

  /**
   * Increment a key's value by 1. If key doesn't exist, it sets it to 1.
   * Requires TTL in seconds.
   * Returns the new value.
   */
  increment(key: string, ttlSeconds: number): Promise<number>;

  /**
   * Get the remaining TTL of a key in seconds
   * Returns -1 if key exists but has no TTL.
   * Returns -2 if key does not exist.
   */
  ttl(key: string): Promise<number>;
}

