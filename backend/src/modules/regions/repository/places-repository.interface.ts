import type { TouristPlace } from '../domain/place.entity';

export interface ListPlacesOptions {
  page?: number;
  limit?: number;
  regionId?: string;
  status?: string;
}

export interface ITouristPlacesRepository {
  findById(id: string): Promise<TouristPlace | null>;
  findBySlug(slug: string): Promise<TouristPlace | null>;
  findByRegionId(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<TouristPlace[]>;
  list(options: ListPlacesOptions): Promise<TouristPlace[]>;
  count(options: ListPlacesOptions): Promise<number>;
  findNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<TouristPlace[]>;
  save(place: TouristPlace): Promise<void>;
  update(place: TouristPlace): Promise<void>;
  softDelete(id: string): Promise<void>;
}
