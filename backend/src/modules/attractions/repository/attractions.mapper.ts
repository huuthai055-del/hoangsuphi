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
    return new Attraction(
      raw.id,
      raw.regionId,
      raw.categoryId,
      raw.name,
      raw.slug,
      new GPSLocation(Number(raw.location.lng), Number(raw.location.lat)),
      raw.description,
      raw.coverUrl,
      raw.deletedAt ? 'inactive' : (raw.status as 'active' | 'inactive'),
      raw.createdAt,
      raw.updatedAt,
      raw.deletedAt
    );
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
