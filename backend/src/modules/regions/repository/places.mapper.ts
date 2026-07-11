import { TouristPlace } from '../domain/place.entity';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';

export const TouristPlaceMapper = {
  toDomain(raw: {
    id: string;
    regionId: string;
    name: string;
    slug: string;
    geom: { lng: number; lat: number };
    description: string | null;
    coverUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): TouristPlace {
    return new TouristPlace(
      raw.id,
      raw.regionId,
      raw.name,
      raw.slug,
      new GPSLocation(Number(raw.geom.lng), Number(raw.geom.lat)),
      raw.description,
      raw.coverUrl,
      raw.deletedAt ? 'inactive' : 'active',
      raw.createdAt,
      raw.updatedAt,
      raw.deletedAt
    );
  },

  toPersistence(place: TouristPlace) {
    return {
      id: place.id,
      regionId: place.regionId,
      name: place.name,
      slug: place.slug,
      geom: { lng: place.location.lng, lat: place.location.lat },
      description: place.description,
      coverUrl: place.coverUrl,
      createdAt: place.createdAt,
      updatedAt: place.updatedAt,
      deletedAt: place.deletedAt,
    };
  },
};
