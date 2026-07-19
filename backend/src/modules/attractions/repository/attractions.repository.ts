import { type TransactionClient, db } from '@/lib/database/client';
import { attractionCategories, attractions } from '@/lib/database/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Attraction } from '../domain/attraction.entity';
import type {
  IAttractionsRepository,
  ListAttractionsOptions,
} from './attractions-repository.interface';
import { AttractionMapper } from './attractions.mapper';

export class DrizzleAttractionsRepository implements IAttractionsRepository {
  public async findById(id: string): Promise<Attraction | null> {
    const [raw] = await db
      .select()
      .from(attractions)
      .where(and(eq(attractions.id, id), isNull(attractions.deletedAt)))
      .limit(1);

    if (!raw) return null;
    return AttractionMapper.toDomain(raw);
  }

  public async findBySlug(slug: string, includeDeleted = false): Promise<Attraction | null> {
    const conditions = [eq(attractions.slug, slug)];
    if (!includeDeleted) {
      conditions.push(isNull(attractions.deletedAt));
    }

    const [raw] = await db
      .select()
      .from(attractions)
      .where(and(...conditions))
      .limit(1);

    if (!raw) return null;
    return AttractionMapper.toDomain(raw);
  }

  public async findByRegionId(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Attraction[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(attractions)
      .where(and(eq(attractions.regionId, regionId), isNull(attractions.deletedAt)))
      .limit(limit)
      .offset(offset);

    return results.map((row) => AttractionMapper.toDomain(row));
  }

  public async list(options: ListAttractionsOptions): Promise<Attraction[]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [isNull(attractions.deletedAt)];

    if (options.regionId) {
      conditions.push(eq(attractions.regionId, options.regionId));
    }
    if (options.categoryId) {
      conditions.push(eq(attractions.categoryId, options.categoryId));
    }
    if (options.status) {
      conditions.push(eq(attractions.status, options.status));
    }

    const results = await db
      .select()
      .from(attractions)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return results.map((row) => AttractionMapper.toDomain(row));
  }

  public async count(options: ListAttractionsOptions): Promise<number> {
    const conditions = [isNull(attractions.deletedAt)];

    if (options.regionId) {
      conditions.push(eq(attractions.regionId, options.regionId));
    }
    if (options.categoryId) {
      conditions.push(eq(attractions.categoryId, options.categoryId));
    }
    if (options.status) {
      conditions.push(eq(attractions.status, options.status));
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attractions)
      .where(and(...conditions));

    return result ? Number(result.count) : 0;
  }

  public async findNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<Attraction[]> {
    const queryLimit = limit ?? 20;

    const results = await db
      .select()
      .from(attractions)
      .where(
        and(
          sql`ST_DWithin(${attractions.location}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
          isNull(attractions.deletedAt)
        )
      )
      .limit(queryLimit);

    return results.map((row) => AttractionMapper.toDomain(row));
  }

  public async save(attraction: Attraction, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    const data = AttractionMapper.toPersistence(attraction);
    await client.insert(attractions).values(data);
  }

  public async update(attraction: Attraction, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    const data = AttractionMapper.toPersistence(attraction);
    await client
      .update(attractions)
      .set({
        regionId: data.regionId,
        categoryId: data.categoryId,
        name: data.name,
        slug: data.slug,
        location: data.location,
        description: data.description,
        coverUrl: data.coverUrl,
        status: data.status,
        updatedAt: new Date(),
        deletedAt: data.deletedAt,
      })
      .where(eq(attractions.id, data.id));
  }

  public async softDelete(id: string, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    await client
      .update(attractions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(attractions.id, id));
  }

  public async findCategoryById(id: string): Promise<{ id: string; isUtility: boolean } | null> {
    const [raw] = await db
      .select({ id: attractionCategories.id, isUtility: attractionCategories.isUtility })
      .from(attractionCategories)
      .where(eq(attractionCategories.id, id))
      .limit(1);
    return raw || null;
  }
}
