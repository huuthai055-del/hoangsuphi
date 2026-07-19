import { ValidationError } from '@/common/errors/http.errors';
import { db, type Database, type TransactionClient } from '@/lib/database/client';
import { media } from '@/lib/database/schema/media';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { HARVEST_MEDIA_MAX_IMAGES } from '../harvest-status.constants';
import type { IHarvestMediaOwnershipPort } from './media-ownership.port';

export class HarvestMediaOwnershipAdapter implements IHarvestMediaOwnershipPort {
  public constructor(private readonly database: Database = db) {}

  async assignHarvestMedia(props: {
    harvestUpdateId: string;
    mediaIds: string[];
    uploaderId: string;
    tx?: TransactionClient;
  }): Promise<void> {
    if (props.mediaIds.length === 0) return;
    this.assertValidMediaIds(props.mediaIds);

    const client = props.tx ?? this.database;
    const query = client
      .select(mediaEligibilityProjection)
      .from(media)
      .where(inArray(media.id, props.mediaIds));
    const rows = props.tx ? await query.for('update') : await query;

    if (rows.length !== props.mediaIds.length || !rows.every((row) => this.isEligible(row, props))) {
      throw new ValidationError('One or more media items are not eligible for this harvest update', {
        code: 'HARVEST_MEDIA_NOT_ELIGIBLE',
      });
    }

    const existingQuery = client
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.ownerType, 'HARVEST_UPDATE'), eq(media.ownerId, props.harvestUpdateId)));
    const existingAttachments = props.tx ? await existingQuery.for('update') : await existingQuery;

    const unboundIds = rows
      .filter((row) => row.ownerType === null && row.ownerId === null)
      .map((row) => row.id);
    if (existingAttachments.length + unboundIds.length > HARVEST_MEDIA_MAX_IMAGES) {
      throw new ValidationError('Harvest update cannot contain more than 8 images', {
        code: 'HARVEST_MEDIA_NOT_ELIGIBLE',
      });
    }
    if (unboundIds.length === 0) return;

    const claimed = await client
      .update(media)
      .set({
        ownerType: 'HARVEST_UPDATE',
        ownerId: props.harvestUpdateId,
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(media.id, unboundIds),
          eq(media.mediaType, 'IMAGE'),
          eq(media.status, 'READY'),
          eq(media.uploadedBy, props.uploaderId),
          isNull(media.deletedAt),
          isNull(media.ownerType),
          isNull(media.ownerId)
        )
      )
      .returning({ id: media.id });

    if (claimed.length !== unboundIds.length) {
      throw new ValidationError('One or more media items are not eligible for this harvest update', {
        code: 'HARVEST_MEDIA_NOT_ELIGIBLE',
      });
    }
  }

  async validateMediaForPublish(props: {
    harvestUpdateId: string;
    tx?: TransactionClient;
  }): Promise<void> {
    const client = props.tx ?? this.database;
    const query = client
      .select(mediaPublishProjection)
      .from(media)
      .where(and(eq(media.ownerType, 'HARVEST_UPDATE'), eq(media.ownerId, props.harvestUpdateId)));
    const attachedMedia = props.tx ? await query.for('update') : await query;

    if (
      attachedMedia.length > HARVEST_MEDIA_MAX_IMAGES ||
      attachedMedia.some(
        (item) => item.mediaType !== 'IMAGE' || item.status !== 'READY' || item.deletedAt !== null
      )
    ) {
      throw new ValidationError('Harvest update has media that is not eligible for publishing', {
        code: 'HARVEST_MEDIA_NOT_ELIGIBLE',
      });
    }
  }

  private assertValidMediaIds(mediaIds: string[]): void {
    if (
      mediaIds.length > HARVEST_MEDIA_MAX_IMAGES ||
      new Set(mediaIds).size !== mediaIds.length
    ) {
      throw new ValidationError('Harvest media identifiers are invalid', {
        code: 'HARVEST_MEDIA_NOT_ELIGIBLE',
      });
    }
  }

  private isEligible(
    row: MediaEligibilityRecord,
    props: { harvestUpdateId: string; uploaderId: string }
  ): boolean {
    const isAlreadyOwnedByThisHarvest =
      row.ownerType === 'HARVEST_UPDATE' && row.ownerId === props.harvestUpdateId;
    const isUnbound = row.ownerType === null && row.ownerId === null;
    return (
      row.mediaType === 'IMAGE' &&
      row.status === 'READY' &&
      row.deletedAt === null &&
      row.uploadedBy === props.uploaderId &&
      (isUnbound || isAlreadyOwnedByThisHarvest)
    );
  }
}

type MediaEligibilityRecord = {
  id: string;
  mediaType: string;
  status: string;
  ownerType: string | null;
  ownerId: string | null;
  uploadedBy: string | null;
  deletedAt: Date | null;
};

const mediaEligibilityProjection = {
  id: media.id,
  mediaType: media.mediaType,
  status: media.status,
  ownerType: media.ownerType,
  ownerId: media.ownerId,
  uploadedBy: media.uploadedBy,
  deletedAt: media.deletedAt,
} as const;

const mediaPublishProjection = {
  id: media.id,
  mediaType: media.mediaType,
  status: media.status,
  deletedAt: media.deletedAt,
} as const;
