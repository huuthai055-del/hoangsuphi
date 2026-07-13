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
    return TouristPlace.rehydrate({
      id: raw.id,
      regionId: raw.regionId,
      name: raw.name,
      slug: raw.slug,
      location: new GPSLocation(Number(raw.geom.lng), Number(raw.geom.lat)),
      description: raw.description,
      coverUrl: raw.coverUrl,
      status: raw.deletedAt ? 'inactive' : 'active',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
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
