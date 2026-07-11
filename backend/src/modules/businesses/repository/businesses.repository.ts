import type {
  IBusinessesRepository,
  ListBusinessesOptions,
} from './businesses-repository.interface';
import type { Business } from '../domain/business.entity';
import { db, type TransactionClient } from '@/lib/database/client';
import { businesses, businessAmenities, amenities } from '@/lib/database/schema';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { BusinessMapper } from './businesses.mapper';

export class DrizzleBusinessesRepository implements IBusinessesRepository {
  public async findById(id: string): Promise<Business | null> {
    const [raw] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.id, id), isNull(businesses.deletedAt)))
      .limit(1);

    if (!raw) return null;

    const relations = await db
      .select()
      .from(businessAmenities)
      .where(eq(businessAmenities.businessId, id));

    const amenityIds = relations.map((r) => r.amenityId);
    return BusinessMapper.toDomain(raw, amenityIds);
  }

  public async findBySlug(slug: string): Promise<Business | null> {
    const [raw] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.slug, slug), isNull(businesses.deletedAt)))
      .limit(1);

    if (!raw) return null;

    const relations = await db
      .select()
      .from(businessAmenities)
      .where(eq(businessAmenities.businessId, raw.id));

    const amenityIds = relations.map((r) => r.amenityId);
    return BusinessMapper.toDomain(raw, amenityIds);
  }

  public async findByRegionId(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Business[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    const results = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.regionId, regionId), isNull(businesses.deletedAt)))
      .limit(limit)
      .offset(offset);

    if (results.length === 0) return [];

    return this.populateAmenities(results);
  }

  public async list(options: ListBusinessesOptions): Promise<Business[]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [isNull(businesses.deletedAt)];

    if (options.regionId) {
      conditions.push(eq(businesses.regionId, options.regionId));
    }
    if (options.businessTypeId) {
      conditions.push(eq(businesses.businessTypeId, options.businessTypeId));
    }
    if (options.status) {
      conditions.push(eq(businesses.status, options.status));
    }

    const results = await db
      .select()
      .from(businesses)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    if (results.length === 0) return [];

    return this.populateAmenities(results);
  }

  public async findNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<Business[]> {
    const queryLimit = limit ?? 20;

    const results = await db
      .select()
      .from(businesses)
      .where(
        and(
          sql`ST_DWithin(${businesses.location}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})`,
          isNull(businesses.deletedAt)
        )
      )
      .limit(queryLimit);

    if (results.length === 0) return [];

    return this.populateAmenities(results);
  }

  public async save(business: Business, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    const data = BusinessMapper.toPersistence(business);

    await client.insert(businesses).values(data);

    if (business.amenityIds.length > 0) {
      const relationRows = business.amenityIds.map((amenityId) => ({
        businessId: business.id,
        amenityId,
      }));
      await client.insert(businessAmenities).values(relationRows);
    }
  }

  public async update(business: Business, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    const data = BusinessMapper.toPersistence(business);

    await client
      .update(businesses)
      .set({
        regionId: data.regionId,
        businessTypeId: data.businessTypeId,
        name: data.name,
        slug: data.slug,
        location: data.location,
        description: data.description,
        coverUrl: data.coverUrl,
        status: data.status,
        updatedAt: new Date(),
        deletedAt: data.deletedAt,
      })
      .where(eq(businesses.id, data.id));

    // Refresh amenities relations
    await client.delete(businessAmenities).where(eq(businessAmenities.businessId, business.id));

    if (business.amenityIds.length > 0) {
      const relationRows = business.amenityIds.map((amenityId) => ({
        businessId: business.id,
        amenityId,
      }));
      await client.insert(businessAmenities).values(relationRows);
    }
  }

  public async softDelete(id: string, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    await client
      .update(businesses)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, id));
  }

  public async findAmenitiesByIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const results = await db
      .select({ id: amenities.id })
      .from(amenities)
      .where(inArray(amenities.id, ids));
    return results.map((r) => r.id);
  }

  public async findBusinessTypeById(id: string): Promise<{ id: string; isActive: boolean } | null> {
    const [raw] = await db
      .select({ id: businessTypes.id, isActive: businessTypes.isActive })
      .from(businessTypes)
      .where(eq(businessTypes.id, id))
      .limit(1);
    return raw || null;
  }

  private async populateAmenities(
    results: (typeof businesses.$inferSelect)[]
  ): Promise<Business[]> {
    const ids = results.map((r) => r.id);
    const relations = await db
      .select()
      .from(businessAmenities)
      .where(inArray(businessAmenities.businessId, ids));

    const relationMap = relations.reduce(
      (acc, rel) => {
        if (!acc[rel.businessId]) acc[rel.businessId] = [];
        acc[rel.businessId].push(rel.amenityId);
        return acc;
      },
      {} as Record<string, string[]>
    );

    return results.map((row) => BusinessMapper.toDomain(row, relationMap[row.id] ?? []));
  }
}
