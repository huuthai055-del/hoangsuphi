import { Region, type RegionLevel } from '../domain/region.aggregate';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';

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
    return new Region(
      raw.id,
      raw.parentId,
      raw.name,
      raw.slug,
      raw.level as RegionLevel,
      new LtreePath(raw.path),
      raw.latitude ? Number(raw.latitude) : null,
      raw.longitude ? Number(raw.longitude) : null,
      geom,
      raw.description,
      raw.deletedAt ? 'inactive' : 'active',
      raw.createdAt,
      raw.updatedAt,
      raw.deletedAt
    );
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
