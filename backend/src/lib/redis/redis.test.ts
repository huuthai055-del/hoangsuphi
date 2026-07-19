import { describe, expect, it, beforeEach } from 'bun:test';
import { FakeRedisStore } from './fake-redis-store';

describe('FakeRedisStore (IRedisStore)', () => {
  let store: FakeRedisStore;

  beforeEach(() => {
    store = new FakeRedisStore();
  });

  it('should set and get values with TTL', async () => {
    await store.set('test_key', 'hello', 60);
    const val = await store.get('test_key');
    expect(val).toBe('hello');
  });

  it('should throw error when setting value with non-positive TTL', async () => {
    await expect(store.set('no_expiry', 'value', 0)).rejects.toThrow('TTL must be positive');
    await expect(store.set('no_expiry', 'value', -10)).rejects.toThrow('TTL must be positive');
  });

  it('should return null for non-existent key', async () => {
    const val = await store.get('missing');
    expect(val).toBeNull();
  });

  it('should delete keys', async () => {
    await store.set('to_delete', '123', 60);
    await store.delete('to_delete');
    const val = await store.get('to_delete');
    expect(val).toBeNull();
  });

  it('should handle TTL and expire keys', async () => {
    await store.set('expire_key', 'value', 1); // 1 second TTL
    
    let ttl = await store.ttl('expire_key');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(1);

    await new Promise((r) => setTimeout(r, 1100));

    const val = await store.get('expire_key');
    expect(val).toBeNull();

    ttl = await store.ttl('expire_key');
    expect(ttl).toBe(-2);
  });

  it('should execute setIfAbsent correctly (Atomic lock behavior)', async () => {
    const success1 = await store.setIfAbsent('lock_key', 'locked', 10);
    expect(success1).toBe(true);

    const success2 = await store.setIfAbsent('lock_key', 'locked2', 10);
    expect(success2).toBe(false);

    const val = await store.get('lock_key');
    expect(val).toBe('locked');
  });

  it('should increment values with required TTL', async () => {
    const inc1 = await store.increment('counter', 60);
    expect(inc1).toBe(1);

    const inc2 = await store.increment('counter', 60);
    expect(inc2).toBe(2);
  });

  it('should increment and maintain/set TTL correctly', async () => {
    await store.increment('ttl_counter', 10);
    const ttl = await store.ttl('ttl_counter');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10);
  });
});

