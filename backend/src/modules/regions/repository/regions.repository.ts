import type { IRegionsRepository, ListRegionsOptions } from './regions-repository.interface';
import type { Region } from '../domain/region.aggregate';
import { db, type TransactionClient } from '@/lib/database/client';
import { regions } from '@/lib/database/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { RegionMapper } from './regions.mapper';

export class DrizzleRegionsRepository implements IRegionsRepository {
  public async findById(id: string): Promise<Region | null> {
    const [raw] = await db
      .select()
      .from(regions)
      .where(and(eq(regions.id, id), isNull(regions.deletedAt)))
      .limit(1);

    return raw ? RegionMapper.toDomain(raw) : null;
  }

  public async findBySlug(slug: string): Promise<Region | null> {
    const [raw] = await db
      .select()
      .from(regions)
      .where(and(eq(regions.slug, slug), isNull(regions.deletedAt)))
      .limit(1);

    return raw ? RegionMapper.toDomain(raw) : null;
  }

  public async findChildren(
    parentId: string | null,
    options?: { page?: number; limit?: number }
  ): Promise<Region[]> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const offset = (page - 1) * limit;

    const parentCondition = parentId ? eq(regions.parentId, parentId) : isNull(regions.parentId);

    const results = await db
      .select()
      .from(regions)
      .where(and(parentCondition, isNull(regions.deletedAt)))
      .limit(limit)
      .offset(offset);

    return results.map((row) => RegionMapper.toDomain(row));
  }

  public async findSubtree(parentPath: string): Promise<Region[]> {
    // PostgreSQL ltree operator: <@
    // Lấy toàn bộ descendant node
    const results = await db
      .select()
      .from(regions)
      .where(and(sql`${regions.path} <@ ${parentPath}::ltree`, isNull(regions.deletedAt)));

    return results.map((row) => RegionMapper.toDomain(row));
  }

  public async list(options: ListRegionsOptions): Promise<Region[]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [isNull(regions.deletedAt)];

    if (options.level !== undefined) {
      conditions.push(eq(regions.level, options.level));
    }

    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        conditions.push(isNull(regions.parentId));
      } else {
        conditions.push(eq(regions.parentId, options.parentId));
      }
    }

    const results = await db
      .select()
      .from(regions)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return results.map((row) => RegionMapper.toDomain(row));
  }

  public async save(region: Region): Promise<void> {
    const data = RegionMapper.toPersistence(region);
    await db.insert(regions).values(data);
  }

  public async update(region: Region, tx?: TransactionClient): Promise<void> {
    const client = tx ?? db;
    const data = RegionMapper.toPersistence(region);
    await client
      .update(regions)
      .set({
        parentId: data.parentId,
        name: data.name,
        slug: data.slug,
        level: data.level,
        path: data.path,
        latitude: data.latitude,
        longitude: data.longitude,
        geom: data.geom,
        description: data.description,
        updatedAt: new Date(),
        deletedAt: data.deletedAt,
      })
      .where(eq(regions.id, data.id));
  }

  public async softDelete(id: string): Promise<void> {
    await db
      .update(regions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(regions.id, id));
  }
}
