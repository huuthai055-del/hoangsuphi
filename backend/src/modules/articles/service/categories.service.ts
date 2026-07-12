import type { ICategoriesRepository } from '../repository/categories-repository.interface';
import type { ILogger, IClock } from './interfaces';
import { Category } from '../domain/category.entity';
import { generateUuidV7 } from '@/common/utils/uuid';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import { DuplicateKeyRepositoryError, EntityNotFoundRepositoryError } from '../repository/repository-errors';
import { CategoryDomainError } from '../domain/article-errors';

export interface CreateCategoryCommand {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface UpdateCategoryCommand {
  name?: string;
  description?: string | null;
}

export class CategoriesService {
  constructor(
    private readonly categoriesRepo: ICategoriesRepository,
    private readonly logger: ILogger,
    private readonly clock: IClock
  ) {}

  private async executeWithLogging<T>(
    action: string,
    context: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const executionTime = Math.round(performance.now() - startTime);
      this.logger.info({
        ...context,
        executionTime,
        action,
      }, `Category action ${action} completed successfully`);
      return result;
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      this.logger.error({
        ...context,
        executionTime,
        action,
        error: error instanceof Error ? error.message : String(error),
      }, `Category action ${action} failed`);
      throw error;
    }
  }

  private mapDomainError(err: unknown): never {
    if (err instanceof CategoryDomainError) {
      throw new ValidationError(err.message);
    }
    throw err;
  }

  private runDomain<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      this.mapDomainError(err);
    }
  }

  public async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoriesRepo.findById(id);
    if (!category) {
      throw new NotFoundError(`Category not found with ID: ${id}`);
    }
    return category;
  }

  public async getCategoryByCode(code: string): Promise<Category> {
    const cleanCode = (code || '').trim().toLowerCase();
    const category = await this.categoriesRepo.findByCode(cleanCode);
    if (!category) {
      throw new NotFoundError(`Category not found with code: ${cleanCode}`);
    }
    return category;
  }

  public async listCategories(): Promise<Category[]> {
    return this.categoriesRepo.findAll();
  }

  public async createCategory(command: CreateCategoryCommand): Promise<Category> {
    return this.executeWithLogging('create_category', { code: command.code }, async () => {
      const code = (command.code || '').trim().toLowerCase();
      if (!code || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) {
        throw new ValidationError('Category code must be a valid SEO slug format');
      }

      const exists = await this.categoriesRepo.existsByCode(code);
      if (exists) {
        throw new ConflictError(`Category code already exists: ${code}`);
      }

      const id = command.id ?? generateUuidV7();
      const category = this.runDomain(() =>
        Category.create(
          id,
          code,
          command.name,
          command.description ?? null,
          this.clock.now()
        )
      );

      try {
        await this.categoriesRepo.save(category);
      } catch (err) {
        if (err instanceof DuplicateKeyRepositoryError) {
          throw new ConflictError(`Category code already exists: ${code}`);
        }
        throw err;
      }

      return category;
    });
  }

  public async updateCategory(id: string, command: UpdateCategoryCommand): Promise<Category> {
    return this.executeWithLogging('update_category', { categoryId: id }, async () => {
      const category = await this.categoriesRepo.findById(id);
      if (!category) {
        throw new NotFoundError(`Category not found with ID: ${id}`);
      }

      const originalName = category.name;
      const originalDescription = category.description;

      this.runDomain(() => {
        if (command.name !== undefined) {
          category.rename(command.name, this.clock.now());
        }

        if (command.description !== undefined) {
          category.changeDescription(command.description, this.clock.now());
        }
      });

      // Tránh DB write thừa nếu không có bất cứ thay đổi nào
      if (category.name === originalName && category.description === originalDescription) {
        return category;
      }

      try {
        await this.categoriesRepo.update(category);
      } catch (err) {
        if (err instanceof EntityNotFoundRepositoryError) {
          throw new NotFoundError(`Category not found with ID: ${id}`);
        }
        throw err;
      }

      return category;
    });
  }

  public async deleteCategory(id: string): Promise<void> {
    await this.executeWithLogging('delete_category', { categoryId: id }, async () => {
      const exists = await this.categoriesRepo.exists(id);
      if (!exists) {
        throw new NotFoundError(`Category not found with ID: ${id}`);
      }

      try {
        await this.categoriesRepo.delete(id);
      } catch (err) {
        if (err instanceof EntityNotFoundRepositoryError) {
          throw new NotFoundError(`Category not found with ID: ${id}`);
        }
        throw err;
      }
    });
  }
}
