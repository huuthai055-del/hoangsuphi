import { ConflictError, NotFoundError, ValidationError } from '@/common/errors/http.errors';
import { slugify } from '@/common/utils/slug';
import { generateUuidV7 } from '@/common/utils/uuid';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import type { IRegionsRepository } from '@/modules/regions/repository/regions-repository.interface';
import { Attraction } from '../domain/attraction.entity';
import type {
  IAttractionsRepository,
  ListAttractionsOptions,
} from '../repository/attractions-repository.interface';

export interface CreateAttractionCommand {
  id?: string;
  regionId: string;
  categoryId: string;
  name: string;
  slug?: string;
  location: { lng: number; lat: number };
  description?: string | null;
  coverUrl?: string | null;
}

export interface UpdateAttractionCommand {
  regionId?: string;
  categoryId?: string;
  name?: string;
  slug?: string;
  location?: { lng: number; lat: number };
  description?: string | null;
  coverUrl?: string | null;
  status?: 'active' | 'inactive';
}

export class AttractionsService {
  constructor(
    private readonly regionsRepo: IRegionsRepository,
    private readonly attractionsRepo: IAttractionsRepository
  ) {}

  public async getAttractionById(id: string): Promise<Attraction> {
    const attraction = await this.attractionsRepo.findById(id);
    if (!attraction) {
      throw new NotFoundError(`Attraction not found: ${id}`);
    }
    return attraction;
  }

  public async getAttractionBySlug(slug: string): Promise<Attraction> {
    const attraction = await this.attractionsRepo.findBySlug(slug);
    if (!attraction) {
      throw new NotFoundError(`Attraction not found with slug: ${slug}`);
    }
    return attraction;
  }

  public async listAttractions(
    options: ListAttractionsOptions
  ): Promise<{ items: Attraction[]; total: number }> {
    const [items, total] = await Promise.all([
      this.attractionsRepo.list(options),
      this.attractionsRepo.count(options),
    ]);
    return { items, total };
  }

  public async listAttractionsByRegion(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Attraction[]> {
    return this.attractionsRepo.findByRegionId(regionId, options);
  }

  public async searchNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<Attraction[]> {
    return this.attractionsRepo.findNearby(lng, lat, radiusMeters, limit);
  }

  public async createAttraction(command: CreateAttractionCommand): Promise<Attraction> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    await this.verifyRegionExists(command.regionId);
    await this.verifyCategoryExists(command.categoryId);

    const slug = this.resolveSlug(command.slug, command.name);
    await this.verifySlugUnique(slug);

    const location = this.parseLocation(command.location);

    const id = command.id ?? generateUuidV7();

    const attraction = Attraction.create({
      id,
      regionId: command.regionId,
      categoryId: command.categoryId,
      name: command.name.trim(),
      slug,
      location,
      description: command.description ?? null,
      coverUrl: command.coverUrl ?? null,
      status: 'active',
    });

    await this.attractionsRepo.save(attraction);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        attractionId: attraction.id,
        regionId: attraction.regionId,
        categoryId: attraction.categoryId,
        executionTime,
        action: 'create_attraction',
      },
      `Attraction created successfully: ${attraction.name} (${attraction.id})`
    );

    return attraction;
  }

  public async updateAttraction(id: string, command: UpdateAttractionCommand): Promise<Attraction> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const attraction = await this.attractionsRepo.findById(id);
    if (!attraction) {
      throw new NotFoundError(`Attraction not found: ${id}`);
    }
    if (attraction.isDeleted) {
      throw new ValidationError('Cannot update a soft-deleted attraction');
    }

    const updateProps: Parameters<Attraction['update']>[0] = {};

    if (command.regionId !== undefined && command.regionId !== attraction.regionId) {
      await this.verifyRegionExists(command.regionId);
      updateProps.regionId = command.regionId;
    }

    if (command.categoryId !== undefined && command.categoryId !== attraction.categoryId) {
      await this.verifyCategoryExists(command.categoryId);
      updateProps.categoryId = command.categoryId;
    }

    if (command.name !== undefined) {
      updateProps.name = command.name.trim();
    }

    if (command.slug !== undefined) {
      const slug = this.resolveSlug(command.slug);
      if (slug !== attraction.slug) {
        await this.verifySlugUnique(slug);
        updateProps.slug = slug;
      }
    }

    if (command.location !== undefined) {
      updateProps.location = this.parseLocation(command.location);
    }

    if (command.description !== undefined) {
      updateProps.description = command.description;
    }

    if (command.coverUrl !== undefined) {
      updateProps.coverUrl = command.coverUrl;
    }

    if (command.status !== undefined) {
      updateProps.status = command.status;
    }

    attraction.update(updateProps);

    await this.attractionsRepo.update(attraction);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        attractionId: attraction.id,
        regionId: attraction.regionId,
        executionTime,
        action: 'update_attraction',
      },
      `Attraction updated successfully: ${attraction.name} (${attraction.id})`
    );

    return attraction;
  }

  public async deleteAttraction(id: string): Promise<void> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const attraction = await this.attractionsRepo.findById(id);
    if (!attraction) {
      throw new NotFoundError(`Attraction not found: ${id}`);
    }
    if (attraction.isDeleted) {
      throw new ValidationError('Attraction is already deleted');
    }

    await this.attractionsRepo.softDelete(id);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        attractionId: id,
        regionId: attraction.regionId,
        executionTime,
        action: 'delete_attraction',
      },
      `Attraction deleted successfully (soft delete): ${attraction.name} (${attraction.id})`
    );
  }

  public async activateAttraction(id: string): Promise<Attraction> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const attraction = await this.attractionsRepo.findById(id);
    if (!attraction) {
      throw new NotFoundError(`Attraction not found: ${id}`);
    }
    if (attraction.isDeleted) {
      throw new ValidationError('Cannot activate a soft-deleted attraction');
    }

    attraction.activate();
    await this.attractionsRepo.update(attraction);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        attractionId: attraction.id,
        regionId: attraction.regionId,
        executionTime,
        action: 'activate_attraction',
      },
      `Attraction activated successfully: ${attraction.name}`
    );

    return attraction;
  }

  public async deactivateAttraction(id: string): Promise<Attraction> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const attraction = await this.attractionsRepo.findById(id);
    if (!attraction) {
      throw new NotFoundError(`Attraction not found: ${id}`);
    }
    if (attraction.isDeleted) {
      throw new ValidationError('Cannot deactivate a soft-deleted attraction');
    }

    attraction.deactivate();
    await this.attractionsRepo.update(attraction);

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        attractionId: attraction.id,
        regionId: attraction.regionId,
        executionTime,
        action: 'deactivate_attraction',
      },
      `Attraction deactivated successfully: ${attraction.name}`
    );

    return attraction;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async verifyRegionExists(regionId: string): Promise<void> {
    const region = await this.regionsRepo.findById(regionId);
    if (!region) {
      throw new NotFoundError(`Region not found: ${regionId}`);
    }
    if (region.deletedAt) {
      throw new ValidationError(`Region has been soft-deleted: ${regionId}`);
    }
  }

  private async verifyCategoryExists(categoryId: string): Promise<void> {
    const category = await this.attractionsRepo.findCategoryById(categoryId);
    if (!category) {
      throw new NotFoundError(`Attraction category not found: ${categoryId}`);
    }
  }

  private resolveSlug(slug?: string, fallbackName?: string): string {
    const source = slug || fallbackName;
    if (!source) {
      throw new ValidationError('Could not generate a valid slug: no slug or name provided');
    }
    const resolved = slugify(source);
    if (!resolved) {
      throw new ValidationError('Could not generate a valid slug from the provided input');
    }
    return resolved;
  }

  private async verifySlugUnique(slug: string): Promise<void> {
    const existing = await this.attractionsRepo.findBySlug(slug, true);
    if (existing) {
      throw new ConflictError(`Slug already exists: ${slug}`);
    }
  }

  private parseLocation(coords: { lng: number; lat: number }): GPSLocation {
    try {
      return new GPSLocation(coords.lng, coords.lat);
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Invalid GPS coordinates');
    }
  }
}
