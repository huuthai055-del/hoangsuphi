import { Region, type RegionLevel } from '../domain/region.aggregate';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';

export const RegionMapper = {
  toDomain(raw: {
    id: string;
    parentId: string | null;
    name: string;
    slug: string;
    level: number;
    path: string;
    latitude: string | null;
    longitude: string | null;
    geom: { lng: number; lat: number } | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): Region {
    const geom = raw.geom ? new GPSLocation(Number(raw.geom.lng), Number(raw.geom.lat)) : null;
    return Region.rehydrate({
      id: raw.id,
      parentId: raw.parentId,
      name: raw.name,
      slug: raw.slug,
      level: raw.level as RegionLevel,
      path: new LtreePath(raw.path),
      latitude: raw.latitude ? Number(raw.latitude) : null,
      longitude: raw.longitude ? Number(raw.longitude) : null,
      geom,
      description: raw.description,
      status: raw.deletedAt ? 'inactive' : 'active',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(region: Region) {
    return {
      id: region.id,
      parentId: region.parentId,
      name: region.name,
      slug: region.slug,
      level: region.level,
      path: region.path.getValue(),
      latitude: region.latitude?.toString() || null,
      longitude: region.longitude?.toString() || null,
      geom: region.geom ? { lng: region.geom.lng, lat: region.geom.lat } : null,
      description: region.description,
      createdAt: region.createdAt,
      updatedAt: region.updatedAt,
      deletedAt: region.deletedAt,
    };
  },
};
