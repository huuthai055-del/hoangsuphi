import type { IRedisStore } from './redis-store.interface';

interface FakeRecord {
  value: string;
  expiresAt: number | null; // epoch ms
}

export class FakeRedisStore implements IRedisStore {
  private store = new Map<string, FakeRecord>();

  private isExpired(record: FakeRecord): boolean {
    if (record.expiresAt === null) return false;
    return Date.now() > record.expiresAt;
  }

  async get(key: string): Promise<string | null> {
    const record = this.store.get(key);
    if (!record) return null;
    if (this.isExpired(record)) {
      this.store.delete(key);
      return null;
    }
    return record.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    const record = this.store.get(key);
    if (record && !this.isExpired(record)) {
      return false; // already exists and active
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be positive');
    }
    const record = this.store.get(key);
    let count = 1;

    if (record && !this.isExpired(record)) {
      count = Number.parseInt(record.value, 10) + 1;
      if (Number.isNaN(count)) {
        count = 1;
      }
    }

    const expiresAt =
      record && !this.isExpired(record) && record.expiresAt !== null
        ? record.expiresAt // keep existing expiry
        : Date.now() + ttlSeconds * 1000;

    this.store.set(key, {
      value: count.toString(),
      expiresAt,
    });

    return count;
  }

  async ttl(key: string): Promise<number> {
    const record = this.store.get(key);
    if (!record || this.isExpired(record)) {
      if (record) this.store.delete(key);
      return -2;
    }
    if (record.expiresAt === null) return -1;
    return Math.ceil((record.expiresAt - Date.now()) / 1000);
  }

  // Testing utility
  clear(): void {
    this.store.clear();
  }
}
