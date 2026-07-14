import type { User } from '../domain/user.entity';

export interface IUserRepository {
  findById(id: string, tx?: unknown): Promise<User | null>;
  findByEmail(email: string, tx?: unknown): Promise<User | null>;
  existsByEmail(email: string, tx?: unknown): Promise<boolean>;
  create(user: User, tx?: unknown): Promise<void>;
  update(user: User, tx?: unknown): Promise<void>;
  delete(id: string, tx?: unknown): Promise<void>;
  assignRole(userId: string, roleId: string, tx?: unknown): Promise<void>;
  removeRole(userId: string, roleId: string, tx?: unknown): Promise<void>;
}
