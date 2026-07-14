import { runInTransaction } from '@/lib/database/client';
import type {
  IRegionsRepository,
  ListRegionsOptions,
} from '../repository/regions-repository.interface';
import type { ITouristPlacesRepository } from '../repository/places-repository.interface';
import { Region, type RegionLevel } from '../domain/region.aggregate';
import { LtreePath } from '../domain/value-objects/ltree-path.vo';
import { GPSLocation } from '../domain/value-objects/gps-location.vo';
import { generateUuidV7 } from '@/common/utils/uuid';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import { NotFoundError, ConflictError, ValidationError } from '@/common/errors/http.errors';

export interface CreateRegionCommand {
  id?: string;
  parentId?: string | null;
  name: string;
  slug: string;
  level: number;
  latitude?: number | null;
  longitude?: number | null;
  center?: { lng: number; lat: number } | null;
  description?: string | null;
}

export interface UpdateRegionCommand {
  parentId?: string | null;
  name?: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  center?: { lng: number; lat: number } | null;
  status?: 'active' | 'inactive';
}

export class RegionsService {
  constructor(
    private readonly regionsRepo: IRegionsRepository,
    private readonly placesRepo: ITouristPlacesRepository
  ) {}

  public async createRegion(command: CreateRegionCommand): Promise<Region> {
    const store = requestStore.getStore();

    if (command.level < 1 || command.level > 5) {
      throw new ValidationError('Level must be between 1 and 5');
    }

    const slug = command.slug.toLowerCase().trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      throw new ValidationError('Invalid slug format');
    }

    const existingSlug = await this.regionsRepo.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictError(`Slug already exists: ${slug}`);
    }

    let parent: Region | null = null;
    let pathValue = slug;

    if (command.parentId) {
      parent = await this.regionsRepo.findById(command.parentId);
      if (!parent) {
        throw new NotFoundError(`Parent region not found: ${command.parentId}`);
      }
      if (parent.deletedAt) {
        throw new ValidationError(`Parent region has been soft-deleted: ${command.parentId}`);
      }
      if (command.level <= parent.level) {
        throw new ValidationError(
          `Child level (${command.level}) must be greater than parent level (${parent.level})`
        );
      }
      pathValue = `${parent.path.getValue()}.${slug}`;
    } else {
      if (command.level !== 1) {
        throw new ValidationError('Parent ID is required for sub-regions (level > 1)');
      }
    }

    const id = command.id ?? generateUuidV7();
    const geom = command.center ? new GPSLocation(command.center.lng, command.center.lat) : null;
    const path = new LtreePath(pathValue);

    const region = new Region(
      id,
      command.parentId ?? null,
      command.name.trim(),
      slug,
      command.level as RegionLevel,
      path,
      command.latitude ?? null,
      command.longitude ?? null,
      geom,
      command.description ?? null,
      'active',
      new Date(),
      new Date(),
      null
    );

    await this.regionsRepo.save(region);

    logger.info(
      {
        traceId: store?.requestId,
        regionId: region.id,
        action: 'create_region',
      },
      `Region created successfully: ${region.name} (${region.id})`
    );

    return region;
  }

  public async updateRegion(id: string, command: UpdateRegionCommand): Promise<Region> {
    const store = requestStore.getStore();

    const region = await this.regionsRepo.findById(id);
    if (!region) {
      throw new NotFoundError(`Region not found: ${id}`);
    }
    if (region.deletedAt) {
      throw new ValidationError('Cannot update a soft-deleted region');
    }

    if (command.name !== undefined) {
      region.rename(command.name.trim(), region.slug);
    }
    if (command.description !== undefined) {
      region.changeDescription(command.description);
    }
    if (command.center !== undefined) {
      region.updateLocation(command.center ? new GPSLocation(command.center.lng, command.center.lat) : null);
    } else if (command.latitude !== undefined || command.longitude !== undefined) {
      const lat = command.latitude !== undefined ? command.latitude : region.latitude;
      const lng = command.longitude !== undefined ? command.longitude : region.longitude;
      region.updateLocation(lat !== null && lng !== null ? new GPSLocation(lng, lat) : null);
    }
    if (command.status !== undefined) {
      if (command.status === 'active') {
        region.activate();
      } else {
        region.deactivate();
      }
    }

    const isParentChanging = command.parentId !== undefined && command.parentId !== region.parentId;

    if (isParentChanging) {
      if (command.parentId === region.id) {
        throw new ValidationError('Region cannot be its own parent');
      }

      let newPathValue = region.slug;
      let newLevel: RegionLevel = region.level;

      if (command.parentId) {
        const newParent = await this.regionsRepo.findById(command.parentId);
        if (!newParent) {
          throw new NotFoundError(`New parent region not found: ${command.parentId}`);
        }
        if (newParent.deletedAt) {
          throw new ValidationError('New parent region has been soft-deleted');
        }

        if (newParent.path.getValue().startsWith(`${region.path.getValue()}.`)) {
          throw new ValidationError('Cannot move region under its own subtree');
        }

        newLevel = (newParent.level + 1) as RegionLevel;
        newPathValue = `${newParent.path.getValue()}.${region.slug}`;
      } else {
        newLevel = 1;
      }

      const oldPath = region.path.getValue();
      const newPath = newPathValue;
      const oldLevel = region.level;

      await runInTransaction(async (tx) => {
        // Read subtree INSIDE the transaction with FOR UPDATE lock so concurrent
        // moves of overlapping subtrees serialize rather than racing (lost-update fix).
        const descendants = await this.regionsRepo.findSubtree(oldPath, tx);

        region.move(command.parentId ?? null, new LtreePath(newPath), newLevel);

        await this.regionsRepo.update(region, tx);

        const levelDiff = newLevel - oldLevel;
        for (const desc of descendants) {
          if (desc.id === region.id) continue;

          const descPathVal = desc.path.getValue();
          const relativePath = descPathVal.substring(oldPath.length);
          const updatedDescPath = newPath + relativePath;

          desc.move(desc.parentId, new LtreePath(updatedDescPath), (desc.level + levelDiff) as RegionLevel);

          await this.regionsRepo.update(desc, tx);
        }
      });
    } else {
      await this.regionsRepo.update(region);
    }

    logger.info(
      {
        traceId: store?.requestId,
        regionId: region.id,
        action: 'update_region',
      },
      `Region updated successfully: ${region.name} (${region.id})`
    );

    return region;
  }

  public async deleteRegion(id: string): Promise<void> {
    const store = requestStore.getStore();

    const region = await this.regionsRepo.findById(id);
    if (!region) {
      throw new NotFoundError(`Region not found: ${id}`);
    }
    if (region.deletedAt) {
      throw new ValidationError('Region is already deleted');
    }

    const children = await this.regionsRepo.findChildren(id, { limit: 1 });
    if (children.length > 0) {
      throw new ValidationError('Cannot delete a region that contains child sub-regions');
    }

    const places = await this.placesRepo.findByRegionId(id, { limit: 1 });
    if (places.length > 0) {
      throw new ValidationError('Cannot delete a region that contains tourist places');
    }

    await this.regionsRepo.softDelete(id);

    logger.info(
      {
        traceId: store?.requestId,
        regionId: id,
        action: 'delete_region',
      },
      `Region deleted successfully (soft delete): ${region.name} (${region.id})`
    );
  }

  public async activateRegion(id: string): Promise<Region> {
    const store = requestStore.getStore();

    const region = await this.regionsRepo.findById(id);
    if (!region) {
      throw new NotFoundError(`Region not found: ${id}`);
    }
    if (region.deletedAt) {
      throw new ValidationError('Cannot activate a soft-deleted region');
    }

    region.activate();
    await this.regionsRepo.update(region);

    logger.info(
      {
        traceId: store?.requestId,
        regionId: id,
        action: 'activate_region',
      },
      `Region activated successfully: ${region.name}`
    );

    return region;
  }

  public async deactivateRegion(id: string): Promise<Region> {
    const store = requestStore.getStore();

    const region = await this.regionsRepo.findById(id);
    if (!region) {
      throw new NotFoundError(`Region not found: ${id}`);
    }
    if (region.deletedAt) {
      throw new ValidationError('Cannot deactivate a soft-deleted region');
    }

    region.deactivate();
    await this.regionsRepo.update(region);

    logger.info(
      {
        traceId: store?.requestId,
        regionId: id,
        action: 'deactivate_region',
      },
      `Region deactivated successfully: ${region.name}`
    );

    return region;
  }

  public async getRegionDetail(idOrSlug: string): Promise<Region> {
    let region: Region | null = null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      region = await this.regionsRepo.findById(idOrSlug);
    } else {
      region = await this.regionsRepo.findBySlug(idOrSlug);
    }

    if (!region) {
      throw new NotFoundError(`Region not found with: ${idOrSlug}`);
    }

    return region;
  }

  public async listRegions(options: ListRegionsOptions): Promise<{ items: Region[]; total: number }> {
    const [items, total] = await Promise.all([
      this.regionsRepo.list(options),
      this.regionsRepo.count(options),
    ]);
    return { items, total };
  }
}
