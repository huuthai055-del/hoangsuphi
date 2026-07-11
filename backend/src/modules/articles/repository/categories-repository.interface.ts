import type { Category } from '../domain/category.entity';
import type { TransactionClient } from '@/lib/database/client';

export interface ICategoriesRepository {
  findById(id: string): Promise<Category | null>;
  findByCode(code: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  exists(id: string): Promise<boolean>;
  existsByCode(code: string): Promise<boolean>;
  save(category: Category, tx?: TransactionClient): Promise<void>;
  update(category: Category, tx?: TransactionClient): Promise<void>;
  delete(id: string, tx?: TransactionClient): Promise<void>;
}
