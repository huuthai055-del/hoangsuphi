import type { IRegionsRepository } from '@/modules/regions/repository/regions-repository.interface';
import type {
  IBusinessesRepository,
  ListBusinessesOptions,
} from '../repository/businesses-repository.interface';
import { Business } from '../domain/business.entity';
import { GPSLocation } from '@/modules/regions/domain/value-objects/gps-location.vo';
import { generateUuidV7 } from '@/common/utils/uuid';
import { slugify } from '@/common/utils/slug';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';
import { runInTransaction } from '@/lib/database/client';

export interface CreateBusinessCommand {
  id?: string;
  regionId: string;
  businessTypeId: string;
  name: string;
  slug?: string;
  location: { lng: number; lat: number };
  description?: string | null;
  coverUrl?: string | null;
  amenityIds: string[];
}

export interface UpdateBusinessCommand {
  regionId?: string;
  businessTypeId?: string;
  name?: string;
  slug?: string;
  location?: { lng: number; lat: number };
  description?: string | null;
  coverUrl?: string | null;
  amenityIds?: string[];
  status?: 'active' | 'inactive';
}

export class BusinessesService {
  constructor(
    private readonly regionsRepo: IRegionsRepository,
    private readonly businessesRepo: IBusinessesRepository
  ) {}

  public async getBusinessById(id: string): Promise<Business> {
    const business = await this.businessesRepo.findById(id);
    if (!business) {
      throw new NotFoundError(`Business not found: ${id}`);
    }
    return business;
  }

  public async getBusinessBySlug(slug: string): Promise<Business> {
    const business = await this.businessesRepo.findBySlug(slug);
    if (!business) {
      throw new NotFoundError(`Business not found with slug: ${slug}`);
    }
    return business;
  }

  public async listBusinesses(options: ListBusinessesOptions): Promise<{ items: Business[]; total: number }> {
    const [items, total] = await Promise.all([
      this.businessesRepo.list(options),
      this.businessesRepo.count(options),
    ]);
    return { items, total };
  }

  public async listBusinessesByRegion(
    regionId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Business[]> {
    return this.businessesRepo.findByRegionId(regionId, options);
  }

  public async searchNearby(
    lng: number,
    lat: number,
    radiusMeters: number,
    limit?: number
  ): Promise<Business[]> {
    return this.businessesRepo.findNearby(lng, lat, radiusMeters, limit);
  }

  public async createBusiness(command: CreateBusinessCommand): Promise<Business> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    // 1. Verify Region
    const region = await this.regionsRepo.findById(command.regionId);
    if (!region) {
      throw new NotFoundError(`Region not found: ${command.regionId}`);
    }
    if (region.deletedAt) {
      throw new ValidationError(`Region has been soft-deleted: ${command.regionId}`);
    }

    // 2. Verify Business Type
    const bType = await this.businessesRepo.findBusinessTypeById(command.businessTypeId);
    if (!bType) {
      throw new NotFoundError(`Business Type not found: ${command.businessTypeId}`);
    }
    if (!bType.isActive) {
      throw new ValidationError(`Business Type is inactive: ${command.businessTypeId}`);
    }

    // 3. Verify Amenities
    if (command.amenityIds.length > 0) {
      const existingAmenityIds = await this.businessesRepo.findAmenitiesByIds(command.amenityIds);
      if (existingAmenityIds.length !== command.amenityIds.length) {
        throw new ValidationError('One or more amenity IDs are invalid');
      }
    }

    // 4. Slugify and verify uniqueness
    const slug = slugify(command.slug || command.name);
    if (!slug) {
      throw new ValidationError('Could not generate a valid slug from the provided name or slug');
    }

    const existingSlug = await this.businessesRepo.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Slug already exists: ${slug}`);
    }

    // 5. GPS verification
    let location: GPSLocation;
    try {
      location = new GPSLocation(command.location.lng, command.location.lat);
    } catch (err) {
      throw new ValidationError(err instanceof Error ? err.message : 'Invalid GPS coordinates');
    }

    const id = command.id ?? generateUuidV7();
    const business = Business.create({
      id,
      regionId: command.regionId,
      businessTypeId: command.businessTypeId,
      name: command.name.trim(),
      slug,
      location,
      description: command.description ?? null,
      coverUrl: command.coverUrl ?? null,
      status: 'active',
      amenityIds: command.amenityIds,
    });

    // Save in transaction since it writes to both businesses and business_amenities
    await runInTransaction(async (tx) => {
      await this.businessesRepo.save(business, tx);
    });

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        businessId: business.id,
        regionId: business.regionId,
        executionTime,
        action: 'create_business',
      },
      `Business created successfully: ${business.name} (${business.id})`
    );

    return business;
  }

  public async updateBusiness(id: string, command: UpdateBusinessCommand): Promise<Business> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const business = await this.businessesRepo.findById(id);
    if (!business) {
      throw new NotFoundError(`Business not found: ${id}`);
    }
    if (business.deletedAt) {
      throw new ValidationError('Cannot update a soft-deleted business');
    }

    const updateProps: any = {};

    // 1. Verify Region if changing
    if (command.regionId !== undefined && command.regionId !== business.regionId) {
      const region = await this.regionsRepo.findById(command.regionId);
      if (!region) {
        throw new NotFoundError(`Region not found: ${command.regionId}`);
      }
      if (region.deletedAt) {
        throw new ValidationError(`Region has been soft-deleted: ${command.regionId}`);
      }
      updateProps.regionId = command.regionId;
    }

    // 2. Verify Business Type if changing
    if (
      command.businessTypeId !== undefined &&
      command.businessTypeId !== business.businessTypeId
    ) {
      const bType = await this.businessesRepo.findBusinessTypeById(command.businessTypeId);
      if (!bType) {
        throw new NotFoundError(`Business Type not found: ${command.businessTypeId}`);
      }
      if (!bType.isActive) {
        throw new ValidationError(`Business Type is inactive: ${command.businessTypeId}`);
      }
      updateProps.businessTypeId = command.businessTypeId;
    }

    // 3. Verify Amenities if changing
    if (command.amenityIds !== undefined) {
      if (command.amenityIds.length > 0) {
        const existingAmenityIds = await this.businessesRepo.findAmenitiesByIds(command.amenityIds);
        if (existingAmenityIds.length !== command.amenityIds.length) {
          throw new ValidationError('One or more amenity IDs are invalid');
        }
      }
      updateProps.amenityIds = command.amenityIds;
    }

    if (command.name !== undefined) {
      updateProps.name = command.name.trim();
    }

    // 4. Slug check if changing
    if (command.slug !== undefined) {
      const slug = slugify(command.slug);
      if (!slug) {
        throw new ValidationError('Could not generate a valid slug from the provided slug');
      }
      if (slug !== business.slug) {
        const existingSlug = await this.businessesRepo.findBySlug(slug);
        if (existingSlug) {
          throw new ConflictError(`Slug already exists: ${slug}`);
        }
        updateProps.slug = slug;
      }
    }

    // 5. GPS check if changing
    if (command.location !== undefined) {
      try {
        updateProps.location = new GPSLocation(command.location.lng, command.location.lat);
      } catch (err) {
        throw new ValidationError(err instanceof Error ? err.message : 'Invalid GPS coordinates');
      }
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

    business.update(updateProps);

    // Save update in transaction
    await runInTransaction(async (tx) => {
      await this.businessesRepo.update(business, tx);
    });

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        businessId: business.id,
        regionId: business.regionId,
        executionTime,
        action: 'update_business',
      },
      `Business updated successfully: ${business.name} (${business.id})`
    );

    return business;
  }

  public async deleteBusiness(id: string): Promise<void> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const business = await this.businessesRepo.findById(id);
    if (!business) {
      throw new NotFoundError(`Business not found: ${id}`);
    }
    if (business.deletedAt) {
      throw new ValidationError('Business is already deleted');
    }

    // Save delete in transaction
    await runInTransaction(async (tx) => {
      await this.businessesRepo.softDelete(id, tx);
    });

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        businessId: id,
        regionId: business.regionId,
        executionTime,
        action: 'delete_business',
      },
      `Business deleted successfully (soft delete): ${business.name} (${business.id})`
    );
  }

  public async activateBusiness(id: string): Promise<Business> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const business = await this.businessesRepo.findById(id);
    if (!business) {
      throw new NotFoundError(`Business not found: ${id}`);
    }
    if (business.deletedAt) {
      throw new ValidationError('Cannot activate a soft-deleted business');
    }

    business.activate();
    await runInTransaction(async (tx) => {
      await this.businessesRepo.update(business, tx);
    });

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        businessId: business.id,
        regionId: business.regionId,
        executionTime,
        action: 'activate_business',
      },
      `Business activated successfully: ${business.name}`
    );

    return business;
  }

  public async deactivateBusiness(id: string): Promise<Business> {
    const startTime = performance.now();
    const store = requestStore.getStore();

    const business = await this.businessesRepo.findById(id);
    if (!business) {
      throw new NotFoundError(`Business not found: ${id}`);
    }
    if (business.deletedAt) {
      throw new ValidationError('Cannot deactivate a soft-deleted business');
    }

    business.deactivate();
    await runInTransaction(async (tx) => {
      await this.businessesRepo.update(business, tx);
    });

    const executionTime = Math.round(performance.now() - startTime);
    logger.info(
      {
        traceId: store?.requestId,
        businessId: business.id,
        regionId: business.regionId,
        executionTime,
        action: 'deactivate_business',
      },
      `Business deactivated successfully: ${business.name}`
    );

    return business;
  }
}
