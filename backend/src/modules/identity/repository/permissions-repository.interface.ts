export interface IPermissionRepository {
  findByUserId(userId: string): Promise<string[]>;
  findRolesByUserId(userId: string): Promise<string[]>;
}
