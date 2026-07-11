import { Business } from '../domain/business.entity';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';

export const BusinessMapper = {
  toDomain(
    raw: {
      id: string;
      regionId: string;
      businessTypeId: string;
      name: string;
      slug: string;
      location: { lng: number; lat: number };
      description: string | null;
      coverUrl: string | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    },
    amenityIds: string[]
  ): Business {
    return new Business(
      raw.id,
      raw.regionId,
      raw.businessTypeId,
      raw.name,
      raw.slug,
      new GPSLocation(Number(raw.location.lng), Number(raw.location.lat)),
      raw.description,
      raw.coverUrl,
      raw.deletedAt ? 'inactive' : (raw.status as 'active' | 'inactive'),
      amenityIds,
      raw.createdAt,
      raw.updatedAt,
      raw.deletedAt
    );
  },

  toPersistence(business: Business) {
    return {
      id: business.id,
      regionId: business.regionId,
      businessTypeId: business.businessTypeId,
      name: business.name,
      slug: business.slug,
      location: { lng: business.location.lng, lat: business.location.lat },
      description: business.description,
      coverUrl: business.coverUrl,
      status: business.status,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      deletedAt: business.deletedAt,
    };
  },
};
export type BusinessPersistence = ReturnType<typeof BusinessMapper.toPersistence>;
