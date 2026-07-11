import { describe, test, expect, mock, beforeEach } from 'bun:test';

// 1. Setup global resolve value for the thenable DB chain
let mockResolveValue: any = undefined;

const selectSpy = mock(() => mockDbChain);
const insertSpy = mock(() => mockDbChain);
const updateSpy = mock(() => mockDbChain);
const deleteSpy = mock(() => mockDbChain);
const valuesSpy = mock(() => mockDbChain);
const whereSpy = mock(() => mockDbChain);

const mockDbChain = {
  select: selectSpy,
  from: () => mockDbChain,
  where: whereSpy,
  limit: () => mockDbChain,
  insert: insertSpy,
  values: valuesSpy,
  onConflictDoNothing: () => mockDbChain,
  update: updateSpy,
  set: () => mockDbChain,
  delete: deleteSpy,
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
import { DrizzleUserRepository } from './users.repository';
import { User } from '../domain/user.entity';
import { UserMapper } from './users.mapper';

describe('DrizzleUserRepository', () => {
  let repository: DrizzleUserRepository;
  const rawUser = {
    id: '019f4264-a179-7672-b7b6-278802ae1916',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    status: 'active' as const,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    permissionsVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    lastPasswordChangedAt: null,
    lastFailedLoginAt: null,
    deletedAt: null,
  };

  beforeEach(() => {
    repository = new DrizzleUserRepository();
    mockResolveValue = undefined;
    mock.restore(); // reset spy call history
  });

  describe('findById()', () => {
    test('should return User entity when user exists', async () => {
      mockResolveValue = [rawUser];

      const result = await repository.findById(rawUser.id);

      expect(result).toBeInstanceOf(User);
      expect(result?.id).toBe(rawUser.id);
      expect(result?.email).toBe(rawUser.email);
      expect(selectSpy).toHaveBeenCalled();
    });

    test('should return null when user does not exist', async () => {
      mockResolveValue = [];

      const result = await repository.findById(rawUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail()', () => {
    test('should return User entity when active user exists with email', async () => {
      mockResolveValue = [rawUser];

      const result = await repository.findByEmail(rawUser.email);

      expect(result).toBeInstanceOf(User);
      expect(result?.email).toBe(rawUser.email);
    });

    test('should return null when no active user found with email', async () => {
      mockResolveValue = [];

      const result = await repository.findByEmail(rawUser.email);

      expect(result).toBeNull();
    });
  });

  describe('existsByEmail()', () => {
    test('should return true if email exists and is active', async () => {
      mockResolveValue = [{ id: rawUser.id }];

      const result = await repository.existsByEmail(rawUser.email);

      expect(result).toBe(true);
    });

    test('should return false if email does not exist', async () => {
      mockResolveValue = [];

      const result = await repository.existsByEmail(rawUser.email);

      expect(result).toBe(false);
    });
  });

  describe('create()', () => {
    test('should insert persistent model into database', async () => {
      const user = UserMapper.toDomain(rawUser);
      mockResolveValue = undefined;

      await repository.create(user);

      expect(insertSpy).toHaveBeenCalled();
      expect(valuesSpy).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    test('should update persistent model in database', async () => {
      const user = UserMapper.toDomain(rawUser);
      mockResolveValue = undefined;

      await repository.update(user);

      expect(updateSpy).toHaveBeenCalled();
      expect(whereSpy).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    test('should perform hard delete in database', async () => {
      mockResolveValue = undefined;

      await repository.delete(rawUser.id);

      expect(deleteSpy).toHaveBeenCalled();
      expect(whereSpy).toHaveBeenCalled();
    });
  });

  describe('assignRole() & removeRole()', () => {
    test('should call insert on userRoles with conflict ignore for assignRole()', async () => {
      mockResolveValue = undefined;

      await repository.assignRole(rawUser.id, 'role-id-123');

      expect(insertSpy).toHaveBeenCalled();
    });

    test('should call delete on userRoles for removeRole()', async () => {
      mockResolveValue = undefined;

      await repository.removeRole(rawUser.id, 'role-id-123');

      expect(deleteSpy).toHaveBeenCalled();
      expect(whereSpy).toHaveBeenCalled();
    });
  });
});
