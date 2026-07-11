import { describe, test, expect } from 'bun:test';
import { UserMapper } from './users.mapper';
import { User } from '../domain/user.entity';

describe('UserMapper', () => {
  const dbModel = {
    id: '019f4264-a179-7672-b7b6-278802ae1916',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    status: 'active' as const,
    failedLoginAttempts: 0,
    lockoutUntil: new Date('2026-07-09T12:00:00.000Z'),
    permissionsVersion: 2,
    createdAt: new Date('2026-07-08T00:00:00.000Z'),
    updatedAt: new Date('2026-07-09T00:00:00.000Z'),
    lastLoginAt: new Date('2026-07-09T10:00:00.000Z'),
    lastPasswordChangedAt: null,
    lastFailedLoginAt: null,
    deletedAt: null,
  };

  test('should map Database Model to Domain Entity correctly via toDomain()', () => {
    const domain = UserMapper.toDomain(dbModel);

    expect(domain.id).toBe(dbModel.id);
    expect(domain.email).toBe(dbModel.email);
    expect(domain.passwordHash).toBe(dbModel.passwordHash);
    expect(domain.status).toBe(dbModel.status);
    expect(domain.failedLoginAttempts).toBe(dbModel.failedLoginAttempts);
    expect(domain.lockoutUntil).toEqual(dbModel.lockoutUntil);
    expect(domain.permissionsVersion).toBe(dbModel.permissionsVersion);
    expect(domain.createdAt).toEqual(dbModel.createdAt);
    expect(domain.updatedAt).toEqual(dbModel.updatedAt);
    expect(domain.lastLoginAt).toEqual(dbModel.lastLoginAt);
  });

  test('should map Domain Entity to Database Model correctly via toPersistence()', () => {
    const domain = User.rehydrate({
      id: dbModel.id,
      email: dbModel.email,
      passwordHash: dbModel.passwordHash,
      status: dbModel.status,
      failedLoginAttempts: dbModel.failedLoginAttempts,
      lockoutUntil: dbModel.lockoutUntil,
      permissionsVersion: dbModel.permissionsVersion,
      createdAt: dbModel.createdAt,
      updatedAt: dbModel.updatedAt,
      lastLoginAt: dbModel.lastLoginAt,
      lastPasswordChangedAt: dbModel.lastPasswordChangedAt,
      lastFailedLoginAt: dbModel.lastFailedLoginAt,
      deletedAt: dbModel.deletedAt,
    });

    const mappedDb = UserMapper.toPersistence(domain);

    expect(mappedDb).toEqual(dbModel);
  });

  test('should satisfy round-trip equality (DB -> Domain -> DB)', () => {
    const domain = UserMapper.toDomain(dbModel);
    const result = UserMapper.toPersistence(domain);

    expect(result).toEqual(dbModel);
  });
});
