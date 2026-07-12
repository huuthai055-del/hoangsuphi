import type { Category } from '../../domain/category.entity';
import type { CategoryResponseDto } from '../../dto/categories.dto';

export function mapCategoryToResponse(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
