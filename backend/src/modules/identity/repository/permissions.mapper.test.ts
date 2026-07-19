import { describe, expect, test } from 'bun:test';
import { PermissionMapper } from './permissions.mapper';

describe('PermissionMapper', () => {
  const dbModel = {
    id: '019f4264-a179-7672-b7b6-278802ae1916',
    code: 'user:create',
    name: 'Create User',
    description: 'Allows creating users in the system',
    createdAt: new Date('2026-07-08T00:00:00.000Z'),
    updatedAt: new Date('2026-07-09T00:00:00.000Z'),
  };

  test('should map Database Model to Domain Model correctly via toDomain()', () => {
    const domain = PermissionMapper.toDomain(dbModel);

    expect(domain.id).toBe(dbModel.id);
    expect(domain.code).toBe(dbModel.code);
    expect(domain.name).toBe(dbModel.name);
    expect(domain.description).toBe(dbModel.description);
    expect(domain.createdAt).toEqual(dbModel.createdAt);
    expect(domain.updatedAt).toEqual(dbModel.updatedAt);
  });

  test('should map Domain Model to Database Model correctly via toPersistence()', () => {
    const domain = {
      id: dbModel.id,
      code: dbModel.code,
      name: dbModel.name,
      description: dbModel.description,
      createdAt: dbModel.createdAt,
      updatedAt: dbModel.updatedAt,
    };

    const mappedDb = PermissionMapper.toPersistence(domain);

    expect(mappedDb).toEqual(dbModel);
  });

  test('should satisfy round-trip equality (DB -> Domain -> DB)', () => {
    const domain = PermissionMapper.toDomain(dbModel);
    const result = PermissionMapper.toPersistence(domain);

    expect(result).toEqual(dbModel);
  });
});
