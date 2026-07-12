import type { Tag } from '../../domain/tag.entity';
import type { TagResponseDto } from '../../dto/tags.dto';

export function mapTagToResponse(tag: Tag): TagResponseDto {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    isFeatured: tag.isFeatured,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}
