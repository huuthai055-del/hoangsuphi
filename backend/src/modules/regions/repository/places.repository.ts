import type { ITouristPlacesRepository, ListPlacesOptions } from './places-repository.interface';
import type { TouristPlace } from '../domain/place.entity';
import { db } from '@/lib/database/client';
import { touristPlaces } from '@/lib/database/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { TouristPlaceMapper } from './places.mapper';

export class DrizzleTouristPlacesRepository implements ITouristPlacesRepository {
  public async findById(id: string): Promise<TouristPlace | null> {
    const [raw] = await db
      .select()
      .from(touristPlaces)
      .where(and(eq(touristPlaces.id, id), isNull(touristPlaces.deletedAt)))
      .limit(1);

    return raw ? TouristPlaceMapper.toDomain(raw) : null;
  }

  public async findBySlug(slug: string): Promise<TouristPlace | null> {
    const [raw] = await db
      .select()
      .from(touristPlaces)
      .where(and(eq(touristPlaces.slug, slug), isNull(touristPlaces.deletedAt)))
      .limit(1);

    return raw ? TouristPlaceMapper.toDomain(raw) : null;
  }

  public async findByRegionId(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<TouristPlace[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(touristPlaces)
      .where(and(eq(touristPlaces.regionId, regionId), isNull(touristPlaces.deletedAt)))
      .limit(limit)
      .offset(offset);

    return results.map((row) => TouristPlaceMapper.toDomain(row));
  }

  public async list(options: ListPlacesOptions): Promise<TouristPlace[]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [isNull(touristPlaces.deletedAt)];

    if (options.regionId) {
      conditions.push(eq(touristPlaces.regionId, options.regionId));
    }

    const results = await db
      .select()
      .from(touristPlaces)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return results.map((row) => TouristPlaceMapper.toDomain(row));
  }

  public async count(options: ListPlacesOptions): Promise<number> {
    const conditions = [isNull(touristPlaces.deletedAt)];

    if (options.regionId) {
      conditions.push(eq(touristPlaces.regionId, options.regionId));
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(touristPlaces)
      .where(and(...conditions));

    return result ? Number(result.count) : 0;
  }

  public async findNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<TouristPlace[]> {
    const queryLimit = limit ?? 20;

    // PostgreSQL PostGIS geography distance validation: ST_DWithin
    // ST_DWithin checks if two points are within the specified radius (in meters).
    // ST_MakePoint and geography cast calculate the shortest distance along the earth's curved surface.
    // It utilizes the GIST spatial index on the location column.
    const results = await db
      .select()
      .from(touristPlaces)
      .where(
        and(
          sql`ST_DWithin(${touristPlaces.location}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
          isNull(touristPlaces.deletedAt)
        )
      )
      .limit(queryLimit);

    return results.map((row) => TouristPlaceMapper.toDomain(row));
  }

  public async save(place: TouristPlace): Promise<void> {
    const data = TouristPlaceMapper.toPersistence(place);
    await db.insert(touristPlaces).values(data);
  }

  public async update(place: TouristPlace): Promise<void> {
    const data = TouristPlaceMapper.toPersistence(place);
    await db
      .update(touristPlaces)
      .set({
        regionId: data.regionId,
        name: data.name,
        slug: data.slug,
        location: data.location,
        description: data.description,
        coverUrl: data.coverUrl,
        updatedAt: new Date(),
        deletedAt: data.deletedAt,
      })
      .where(eq(touristPlaces.id, data.id));
  }

  public async softDelete(id: string): Promise<void> {
    await db
      .update(touristPlaces)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(touristPlaces.id, id));
  }
}
