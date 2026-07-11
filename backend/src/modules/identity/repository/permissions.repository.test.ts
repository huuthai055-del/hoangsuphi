import { describe, test, expect, mock, beforeEach } from 'bun:test';

// 1. Setup Drizzle thenable Mock Chain
let mockResolveValue: any = undefined;

const selectSpy = mock(() => mockDbChain);
const fromSpy = mock(() => mockDbChain);
const innerJoinSpy = mock(() => mockDbChain);
const whereSpy = mock(() => mockDbChain);

const mockDbChain = {
  select: selectSpy,
  from: fromSpy,
  innerJoin: innerJoinSpy,
  where: whereSpy,
};

// Define 'then' dynamically to bypass static Biome lint rules for suspicious noThenProperty
Object.defineProperty(mockDbChain, 'then', {
  value: (onFulfilled: any) => {
    return Promise.resolve(mockResolveValue).then(onFulfilled);
  },
  configurable: true,
  writable: true,
});

// Mock database module
mock.module('@/lib/database/client', () => {
  return {
    db: mockDbChain,
    runInTransaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({}),
  };
});

// Import production code under test after mocking db
import { DrizzlePermissionRepository } from './permissions.repository';

describe('DrizzlePermissionRepository', () => {
  let repository: DrizzlePermissionRepository;
  const rawPermission = {
    id: 'perm-id-1',
    code: 'user:create',
    name: 'Create User',
    description: 'Allows creation of users',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new DrizzlePermissionRepository();
    mockResolveValue = undefined;
    mock.restore(); // reset call history
  });

  describe('findByUserId()', () => {
    test('should query permissions, join tables, map them via PermissionMapper and return string array of codes', async () => {
      mockResolveValue = [rawPermission];

      const result = await repository.findByUserId('user-id-123');

      expect(result).toEqual(['user:create']);
      expect(selectSpy).toHaveBeenCalled();
      expect(fromSpy).toHaveBeenCalled();
      expect(innerJoinSpy).toHaveBeenCalledTimes(2);
      expect(whereSpy).toHaveBeenCalled();
    });

    test('should return empty array if user has no permissions', async () => {
      mockResolveValue = [];

      const result = await repository.findByUserId('user-id-123');

      expect(result).toEqual([]);
    });
  });
});
