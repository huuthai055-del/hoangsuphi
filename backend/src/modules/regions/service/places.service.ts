import { ConflictError, NotFoundError, ValidationError } from '@/common/errors/http.errors';
import { slugify } from '@/common/utils/slug';
import { generateUuidV7 } from '@/common/utils/uuid';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import { TouristPlace } from '../domain/place.entity';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';
import type {
  ITouristPlacesRepository,
  ListPlacesOptions,
} from '../repository/places-repository.interface';
import type { IRegionsRepository } from '../repository/regions-repository.interface';

export interface CreatePlaceCommand {
  id?: string;
  regionId: string;
  name: string;
  slug?: string;
  location: { lng: number; lat: number };
  description?: string | null;
  coverUrl?: string | null;
}

export interface UpdatePlaceCommand {
  regionId?: string;
  name?: string;
  slug?: string;
  location?: { lng: number; lat: number };
  description?: string | null;
  coverUrl?: string | null;
  status?: 'active' | 'inactive';
}

export class PlacesService {
  constructor(
    private readonly regionsRepo: IRegionsRepository,
    private readonly placesRepo: ITouristPlacesRepository
  ) {}

  public async getPlaceById(id: string): Promise<TouristPlace> {
    const place = await this.placesRepo.findById(id);
    if (!place) {
      throw new NotFoundError(`Tourist place not found: ${id}`);
    }
    return place;
  }

  public async getPlaceBySlug(slug: string): Promise<TouristPlace> {
    const place = await this.placesRepo.findBySlug(slug);
    if (!place) {
      throw new NotFoundError(`Tourist place not found with slug: ${slug}`);
    }
    return place;
  }

  public async listPlaces(
    options: ListPlacesOptions
  ): Promise<{ items: TouristPlace[]; total: number }> {
    const [items, total] = await Promise.all([
      this.placesRepo.list(options),
      this.placesRepo.count(options),
    ]);
    return { items, total };
  }

  public async listPlacesByRegion(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<TouristPlace[]> {
    return this.placesRepo.findByRegionId(regionId, options);
  }

  public async searchNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<TouristPlace[]> {
    return this.placesRepo.findNearby(lng, lat, radiusMeters, limit);
  }

  public async createPlace(command: CreatePlaceCommand): Promise<TouristPlace> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const region = await this.regionsRepo.findById(command.regionId);
    if (!region) {
      throw new NotFoundError(`Region not found: ${command.regionId}`);
    }
    if (region.deletedAt) {
      throw new ValidationError(`Region has been soft-deleted: ${command.regionId}`);
    }

    const slug = slugify(command.slug || command.name);
    if (!slug) {
      throw new ValidationError('Could not generate a valid slug from the provided name or slug');
    }

    const existingSlug = await this.placesRepo.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Slug already exists: ${slug}`);
    }

    let location: GPSLocation;
    try {
      location = new GPSLocation(command.location.lng, command.location.lat);
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Invalid GPS coordinates');
    }

    const id = command.id ?? generateUuidV7();
    const place = new TouristPlace(
      id,
      command.regionId,
      command.name.trim(),
      slug,
      location,
      command.description ?? null,
      command.coverUrl ?? null,
      'active',
      new Date(),
      new Date(),
      null
    );

    await this.placesRepo.save(place);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        placeId: place.id,
        regionId: place.regionId,
        executionTime,
        action: 'create_place',
      },
      `Tourist place created successfully: ${place.name} (${place.id})`
    );

    return place;
  }

  public async updatePlace(id: string, command: UpdatePlaceCommand): Promise<TouristPlace> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const place = await this.placesRepo.findById(id);
    if (!place) {
      throw new NotFoundError(`Tourist place not found: ${id}`);
    }
    if (place.deletedAt) {
      throw new ValidationError('Cannot update a soft-deleted tourist place');
    }

    if (command.regionId !== undefined && command.regionId !== place.regionId) {
      const region = await this.regionsRepo.findById(command.regionId);
      if (!region) {
        throw new NotFoundError(`Region not found: ${command.regionId}`);
      }
      if (region.deletedAt) {
        throw new ValidationError(`Region has been soft-deleted: ${command.regionId}`);
      }
      place.changeRegion(command.regionId);
    }

    if (command.name !== undefined || command.slug !== undefined) {
      const newName = command.name !== undefined ? command.name.trim() : place.name;
      let newSlug = place.slug;
      if (command.slug !== undefined) {
        const slug = slugify(command.slug);
        if (!slug) {
          throw new ValidationError('Could not generate a valid slug from the provided slug');
        }
        if (slug !== place.slug) {
          const existingSlug = await this.placesRepo.findBySlug(slug);
          if (existingSlug) {
            throw new ConflictError(`Slug already exists: ${slug}`);
          }
        }
        newSlug = slug;
      }
      place.rename(newName, newSlug);
    }

    if (command.location !== undefined) {
      try {
        place.updateLocation(new GPSLocation(command.location.lng, command.location.lat));
      } catch (err) {
        throw new ValidationError(err instanceof Error ? err.message : 'Invalid GPS coordinates');
      }
    }

    if (command.description !== undefined) {
      place.updateDescription(command.description);
    }

    if (command.coverUrl !== undefined) {
      place.changeCover(command.coverUrl);
    }

    if (command.status !== undefined) {
      if (command.status === 'active') {
        place.activate();
      } else {
        place.deactivate();
      }
    }

    await this.placesRepo.update(place);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        placeId: place.id,
        regionId: place.regionId,
        executionTime,
        action: 'update_place',
      },
      `Tourist place updated successfully: ${place.name} (${place.id})`
    );

    return place;
  }

  public async deletePlace(id: string): Promise<void> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const place = await this.placesRepo.findById(id);
    if (!place) {
      throw new NotFoundError(`Tourist place not found: ${id}`);
    }
    if (place.deletedAt) {
      throw new ValidationError('Tourist place is already deleted');
    }

    await this.placesRepo.softDelete(id);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        placeId: id,
        regionId: place.regionId,
        executionTime,
        action: 'delete_place',
      },
      `Tourist place deleted successfully (soft delete): ${place.name} (${place.id})`
    );
  }

  public async activatePlace(id: string): Promise<TouristPlace> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const place = await this.placesRepo.findById(id);
    if (!place) {
      throw new NotFoundError(`Tourist place not found: ${id}`);
    }
    if (place.deletedAt) {
      throw new ValidationError('Cannot activate a soft-deleted tourist place');
    }

    place.activate();
    await this.placesRepo.update(place);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        placeId: place.id,
        regionId: place.regionId,
        executionTime,
        action: 'activate_place',
      },
      `Tourist place activated successfully: ${place.name}`
    );

    return place;
  }

  public async deactivatePlace(id: string): Promise<TouristPlace> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const place = await this.placesRepo.findById(id);
    if (!place) {
      throw new NotFoundError(`Tourist place not found: ${id}`);
    }
    if (place.deletedAt) {
      throw new ValidationError('Cannot deactivate a soft-deleted tourist place');
    }

    place.deactivate();
    await this.placesRepo.update(place);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        placeId: place.id,
        regionId: place.regionId,
        executionTime,
        action: 'deactivate_place',
      },
      `Tourist place deactivated successfully: ${place.name}`
    );

    return place;
  }
}
