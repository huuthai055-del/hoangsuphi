import { db } from '@/lib/database/client';
import { permissions, rolePermissions, roles, userRoles } from '@/lib/database/schema/references';
import { eq } from 'drizzle-orm';
import type { IPermissionRepository } from './permissions-repository.interface';
import { PermissionMapper } from './permissions.mapper';

export class DrizzlePermissionRepository implements IPermissionRepository {
  public async findByUserId(userId: string): Promise<string[]> {
    const results = await db
      .select({
        id: permissions.id,
        code: permissions.code,
        name: permissions.name,
        description: permissions.description,
        createdAt: permissions.createdAt,
        updatedAt: permissions.updatedAt,
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .innerJoin(userRoles, eq(rolePermissions.roleId, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    return results.map((row) => PermissionMapper.toDomain(row)).map((domain) => domain.code);
  }

  public async findRolesByUserId(userId: string): Promise<string[]> {
    const results = await db
      .select({
        code: roles.code,
      })
      .from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    return results.map((row) => row.code);
  }
}
