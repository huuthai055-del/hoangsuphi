import type { Itinerary } from '../../domain/itinerary.entity';
import type { ItineraryItem } from '../../domain/itinerary-item.entity';
import type { ItineraryResponseDto, ItineraryItemResponseDto } from '../../dto/itineraries.dto';

export function mapItineraryItemToResponse(item: ItineraryItem): ItineraryItemResponseDto {
  return {
    id: item.id,
    itineraryId: item.itineraryId,
    ownerType: item.ownerType,
    ownerId: item.ownerId,
    dayNumber: item.dayNumber,
    displayOrder: item.displayOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function mapItineraryToResponse(itinerary: Itinerary): ItineraryResponseDto {
  return {
    id: itinerary.id,
    title: itinerary.title,
    description: itinerary.description,
    visibility: itinerary.visibility,
    status: itinerary.status,
    createdBy: itinerary.createdBy,
    createdAt: itinerary.createdAt.toISOString(),
    updatedAt: itinerary.updatedAt.toISOString(),
    items: itinerary.items.map(mapItineraryItemToResponse),
  };
}
