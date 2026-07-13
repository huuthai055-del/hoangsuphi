import { Itinerary } from '../domain/itinerary.entity';
import type { ItineraryItemProps } from '../domain/itinerary-item.entity';

export interface RawItinerary {
  id: string;
  title: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RawItineraryItem {
  id: string;
  itineraryId: string;
  ownerType: 'PLACE' | 'BUSINESS' | 'ATTRACTION';
  ownerId: string;
  dayNumber: number;
  displayOrder: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ItineraryMapper = {
  toDomain(raw: RawItinerary, rawItems: RawItineraryItem[]): Itinerary {
    return Itinerary.rehydrate({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      visibility: raw.visibility,
      status: raw.status,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
      items: rawItems.map((item) => ({
        id: item.id,
        itineraryId: item.itineraryId,
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        dayNumber: item.dayNumber,
        displayOrder: item.displayOrder,
        note: item.note,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  },

  toPersistence(domain: Itinerary) {
    const persisted = domain.toPersistence();
    const rawItinerary: RawItinerary = {
      id: persisted.id,
      title: persisted.title,
      description: persisted.description,
      visibility: persisted.visibility,
      status: persisted.status,
      createdBy: persisted.createdBy,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
      deletedAt: persisted.deletedAt,
    };

    const rawItems: RawItineraryItem[] = persisted.items.map((item: ItineraryItemProps) => ({
      id: item.id,
      itineraryId: item.itineraryId,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      dayNumber: item.dayNumber,
      displayOrder: item.displayOrder,
      note: item.note,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return { rawItinerary, rawItems };
  },
};
