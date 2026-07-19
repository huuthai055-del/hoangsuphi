import type { TransactionClient } from '@/lib/database/client';
import type { Business } from '../domain/business.entity';

export interface ListBusinessesOptions {
  page?: number;
  limit?: number;
  regionId?: string;
  businessTypeId?: string;
  status?: string;
}

export interface IBusinessesRepository {
  findById(id: string): Promise<Business | null>;
  findBySlug(slug: string): Promise<Business | null>;
  findByRegionId(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Business[]>;
  list(options: ListBusinessesOptions): Promise<Business[]>;
  count(options: ListBusinessesOptions): Promise<number>;
  findNearby(lng: number, lat: number, radiusMeters: number, limit?: number): Promise<Business[]>;
  save(business: Business, tx?: TransactionClient): Promise<void>;
  update(business: Business, tx?: TransactionClient): Promise<void>;
  softDelete(id: string, tx?: TransactionClient): Promise<void>;
  findAmenitiesByIds(ids: string[]): Promise<string[]>;
  findBusinessTypeById(id: string): Promise<{ id: string; isActive: boolean } | null>;
}
