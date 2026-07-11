import type { Attraction } from '../domain/attraction.entity';
import type { TransactionClient } from '@/lib/database/client';

export interface ListAttractionsOptions {
  page?: number;
  limit?: number;
  regionId?: string;
  categoryId?: string;
  status?: string;
}

export interface IAttractionsRepository {
  findById(id: string): Promise<Attraction | null>;
  findBySlug(slug: string, includeDeleted?: boolean): Promise<Attraction | null>;
  findByRegionId(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Attraction[]>;
  list(options: ListAttractionsOptions): Promise<Attraction[]>;
  findNearby(lng: number, lat: number, radiusMeters: number, limit?: number): Promise<Attraction[]>;
  save(attraction: Attraction, tx?: TransactionClient): Promise<void>;
  update(attraction: Attraction, tx?: TransactionClient): Promise<void>;
  softDelete(id: string, tx?: TransactionClient): Promise<void>;
  findCategoryById(id: string): Promise<{ id: string; isUtility: boolean } | null>;
}
