import type { TopListItem } from '../../domain/top-list-item.entity';
import type { TopList } from '../../domain/top-list.entity';
import type { TopListItemResponseDto, TopListResponseDto } from '../../dto/top-lists.dto';

export function mapTopListItemToResponse(item: TopListItem): TopListItemResponseDto {
  return {
    id: item.id,
    topListId: item.topListId,
    ownerType: item.ownerType,
    ownerId: item.ownerId,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function mapTopListToResponse(topList: TopList): TopListResponseDto {
  return {
    id: topList.id,
    title: topList.title,
    description: topList.description,
    slug: topList.slug,
    category: topList.category,
    featured: topList.featured,
    status: topList.status,
    createdBy: topList.createdBy,
    createdAt: topList.createdAt.toISOString(),
    updatedAt: topList.updatedAt.toISOString(),
    items: topList.items.map(mapTopListItemToResponse),
  };
}
