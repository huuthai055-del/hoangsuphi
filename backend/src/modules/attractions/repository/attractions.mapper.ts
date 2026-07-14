import { Attraction } from '../domain/attraction.entity';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';

export const AttractionMapper = {
  toDomain(raw: {
    id: string;
    regionId: string;
    categoryId: string;
    name: string;
    slug: string;
    location: { lng: number; lat: number };
    description: string | null;
    coverUrl: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Attraction {
    return Attraction.rehydrate({
      id: raw.id,
      regionId: raw.regionId,
      categoryId: raw.categoryId,
      name: raw.name,
      slug: raw.slug,
      location: new GPSLocation(Number(raw.location.lng), Number(raw.location.lat)),
      description: raw.description,
      coverUrl: raw.coverUrl,
      status: raw.deletedAt ? 'inactive' : (raw.status as 'active' | 'inactive'),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(attraction: Attraction) {
    return {
      id: attraction.id,
      regionId: attraction.regionId,
      categoryId: attraction.categoryId,
      name: attraction.name,
      slug: attraction.slug,
      location: { lng: attraction.location.lng, lat: attraction.location.lat },
      description: attraction.description,
      coverUrl: attraction.coverUrl,
      status: attraction.status,
      createdAt: attraction.createdAt,
      updatedAt: attraction.updatedAt,
      deletedAt: attraction.deletedAt,
    };
  },
};

export type AttractionPersistence = ReturnType<typeof AttractionMapper.toPersistence>;
