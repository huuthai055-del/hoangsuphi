import { ConflictError, NotFoundError, ValidationError } from '@/common/errors/http.errors';
import { generateUuidV7 } from '@/common/utils/uuid';
import { auditLogger } from '@/lib/logger';
import { db, type Database, type TransactionClient } from '@/lib/database/client';
import type { IRegionsRepository } from '@/modules/regions/repository/regions-repository.interface';
import type { CreateHarvestUpdateType, PatchHarvestUpdateType } from '../dto/harvest-status.dto';
import type { IHarvestMediaOwnershipPort } from '../ports/media-ownership.port';
import type {
  IHarvestStatusRepository,
  PatchHarvestUpdateRecord,
} from '../repository/harvest-status.repository.interface';

export class HarvestStatusService {
  constructor(
    private readonly harvestRepo: IHarvestStatusRepository,
    private readonly mediaPort: IHarvestMediaOwnershipPort,
    private readonly regionsRepo: IRegionsRepository,
    private readonly database: Database = db
  ) {}

  private async validateRegion(regionId: string): Promise<void> {
    const region = await this.regionsRepo.findById(regionId);
    if (!region || (region.level !== 3 && region.level !== 4)) {
      throw new ValidationError('Region is not eligible for harvest updates', {
        code: 'HARVEST_REGION_NOT_ELIGIBLE',
      });
    }
  }

  async create(data: CreateHarvestUpdateType, actorId: string): Promise<{ id: string }> {
    await this.validateRegion(data.regionId);
    const harvestUpdateId = generateUuidV7();

    await this.database.transaction(async (tx) => {
      await this.harvestRepo.create(
        {
          id: harvestUpdateId,
          regionId: data.regionId,
          stage: data.stage,
          observedAt: new Date(data.observedAt),
          title: data.title,
          summary: data.summary,
          advisory: data.advisory ?? null,
          createdBy: actorId,
        },
        tx
      );

      if (data.mediaIds.length > 0) {
        await this.mediaPort.assignHarvestMedia({
          harvestUpdateId,
          mediaIds: data.mediaIds,
          uploaderId: actorId,
          tx,
        });
      }
    });

    this.writeAuditEvent('harvest.create', actorId, harvestUpdateId, data.regionId, data.stage);
    return { id: harvestUpdateId };
  }

  async patch(id: string, data: PatchHarvestUpdateType, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const record = await this.getDraftForUpdate(id, tx);
      if (data.regionId !== undefined) {
        await this.validateRegion(data.regionId);
      }

      const updateData: PatchHarvestUpdateRecord = {};
      if (data.regionId !== undefined) updateData.regionId = data.regionId;
      if (data.stage !== undefined) updateData.stage = data.stage;
      if (data.observedAt !== undefined) updateData.observedAt = new Date(data.observedAt);
      if (data.title !== undefined) updateData.title = data.title;
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.advisory !== undefined) updateData.advisory = data.advisory;

      if (Object.keys(updateData).length > 0) {
        const updated = await this.harvestRepo.update(id, updateData, tx);
        if (!updated) {
          throw new ConflictError('Harvest update is no longer editable', {
            code: 'HARVEST_UPDATE_NOT_EDITABLE',
          });
        }
      }

      if (data.attachMediaIds !== undefined) {
        await this.mediaPort.assignHarvestMedia({
          harvestUpdateId: id,
          mediaIds: data.attachMediaIds,
          uploaderId: actorId,
          tx,
        });
      }

      this.writeAuditEvent(
        'harvest.patch',
        actorId,
        id,
        data.regionId ?? record.regionId,
        data.stage ?? record.stage
      );
    });
  }

  async publish(id: string, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const record = await this.getDraftForUpdate(id, tx);
      await this.validateRegion(record.regionId);
      await this.mediaPort.validateMediaForPublish({ harvestUpdateId: id, tx });

      const published = await this.harvestRepo.publish(id, new Date(), tx);
      if (!published) {
        throw new ConflictError('Harvest update is no longer publishable', {
          code: 'HARVEST_UPDATE_NOT_PUBLISHABLE',
        });
      }
      this.writeAuditEvent('harvest.publish', actorId, id, record.regionId, record.stage);
    });
  }

  async archive(id: string, actorId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const record = await this.harvestRepo.findByIdForUpdate(id, tx);
      if (!record) {
        throw new NotFoundError('Harvest update not found');
      }
      if (record.status !== 'PUBLISHED') {
        throw new ValidationError('Harvest update is not archivable', {
          code: 'HARVEST_UPDATE_NOT_ARCHIVABLE',
        });
      }

      const archived = await this.harvestRepo.archive(id, tx);
      if (!archived) {
        throw new ConflictError('Harvest update is no longer archivable', {
          code: 'HARVEST_UPDATE_NOT_ARCHIVABLE',
        });
      }
      this.writeAuditEvent('harvest.archive', actorId, id, record.regionId, record.stage);
    });
  }

  private async getDraftForUpdate(id: string, tx: TransactionClient) {
    const record = await this.harvestRepo.findByIdForUpdate(id, tx);
    if (!record) {
      throw new NotFoundError('Harvest update not found');
    }
    if (record.status !== 'DRAFT') {
      throw new ValidationError('Harvest update is not editable', {
        code: 'HARVEST_UPDATE_NOT_EDITABLE',
      });
    }
    return record;
  }

  private writeAuditEvent(
    action: string,
    actorId: string,
    harvestUpdateId: string,
    regionId: string,
    stage: string
  ): void {
    auditLogger.info(
      { action, actorId, harvestUpdateId, regionId, stage },
      'Harvest status change'
    );
  }
}
