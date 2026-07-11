export interface IPermissionRepository {
  findByUserId(userId: string): Promise<string[]>;
}
