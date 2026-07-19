import { type Database, type TransactionClient, db } from '@/lib/database/client';
import {
  mediaMetadata as mediaMetadataSchema,
  media as mediaSchema,
  mediaVariants as mediaVariantsSchema,
} from '@/lib/database/schema/media';
import { and, asc, eq, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import type { Media } from '../domain/media.entity';
import type { IMediaRepository, MediaPurgeCandidate } from './media-repository.interface';
import { MediaMapper } from './media.mapper';
import {
  InvalidLifecycleTransitionError,
  MediaNotFoundError,
  PersistenceConflictError,
  ScopedDuplicateConflictError,
} from './repository-errors';

export class DrizzleMediaRepository implements IMediaRepository {
  public constructor(private readonly database: Database = db) {}

  private getClient(tx?: TransactionClient) {
    return tx ?? this.database;
  }

  public async findById(id: string): Promise<Media | null> {
    const [row] = await this.getClient()
      .select()
      .from(mediaSchema)
      .where(and(eq(mediaSchema.id, id), isNull(mediaSchema.deletedAt)))
      .limit(1);

    if (!row) return null;
    return MediaMapper.toDomain(row);
  }

  public async findByHash(hash: string): Promise<Media | null> {
    const [row] = await this.getClient()
      .select()
      .from(mediaSchema)
      .where(and(eq(mediaSchema.hash, hash), isNull(mediaSchema.deletedAt)))
      .limit(1);

    if (!row) return null;
    return MediaMapper.toDomain(row);
  }

  public async findScopedDuplicate(props: {
    uploaderId: string;
    ownerType: string | null;
    ownerId: string | null;
    hash: string;
  }): Promise<Media | null> {
    const whereConditions = [
      eq(mediaSchema.hash, props.hash),
      isNull(mediaSchema.deletedAt),
      inArray(mediaSchema.status, ['UPLOADING', 'PROCESSING', 'READY']),
    ];

    whereConditions.push(eq(mediaSchema.uploadedBy, props.uploaderId));

    if (props.ownerType === null) {
      whereConditions.push(isNull(mediaSchema.ownerType));
    } else {
      whereConditions.push(eq(mediaSchema.ownerType, props.ownerType));
    }

    if (props.ownerId === null) {
      whereConditions.push(isNull(mediaSchema.ownerId));
    } else {
      whereConditions.push(eq(mediaSchema.ownerId, props.ownerId));
    }

    const [row] = await this.getClient()
      .select()
      .from(mediaSchema)
      .where(and(...whereConditions))
      .limit(1);

    if (!row) return null;
    return MediaMapper.toDomain(row);
  }

  public async save(media: Media, tx?: TransactionClient): Promise<void> {
    const raw = MediaMapper.toPersistence(media);
    try {
      await this.getClient(tx).insert(mediaSchema).values(raw);
    } catch (err: unknown) {
      const pgErr = err as { code?: string; constraint_name?: string; constraint?: string };
      if (pgErr.code === '23505') {
        const constraintName = pgErr.constraint_name || pgErr.constraint;
        if (constraintName === 'media_unbound_active_hash_unique_idx') {
          throw new ScopedDuplicateConflictError(
            `Duplicate active unbound media found for hash: ${raw.hash} and uploader: ${raw.uploadedBy}`
          );
        }
        throw new PersistenceConflictError(
          `Database conflict on unique constraint: ${constraintName}`
        );
      }
      throw err;
    }
  }

  public async update(media: Media, tx?: TransactionClient): Promise<void> {
    const raw = MediaMapper.toPersistence(media);
    const [updated] = await this.getClient(tx)
      .update(mediaSchema)
      .set(raw)
      .where(eq(mediaSchema.id, raw.id))
      .returning({ id: mediaSchema.id });

    if (!updated) {
      throw new MediaNotFoundError(raw.id);
    }
  }

  public async delete(id: string, tx?: TransactionClient): Promise<void> {
    const [deleted] = await this.getClient(tx)
      .delete(mediaSchema)
      .where(eq(mediaSchema.id, id))
      .returning({ id: mediaSchema.id });

    if (!deleted) {
      throw new MediaNotFoundError(id);
    }
  }

  public async transitionToProcessing(id: string, tx?: TransactionClient): Promise<void> {
    const [updated] = await this.getClient(tx)
      .update(mediaSchema)
      .set({ status: 'PROCESSING', updatedAt: new Date() })
      .where(
        and(
          eq(mediaSchema.id, id),
          eq(mediaSchema.status, 'UPLOADING'),
          isNull(mediaSchema.deletedAt)
        )
      )
      .returning({ id: mediaSchema.id });

    if (!updated) {
      throw new InvalidLifecycleTransitionError(
        `Cannot transition media ${id} from UPLOADING to PROCESSING. Check if status is UPLOADING and media is not deleted.`
      );
    }
  }

  public async transitionToFailed(id: string, tx?: TransactionClient): Promise<void> {
    const [updated] = await this.getClient(tx)
      .update(mediaSchema)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(
        and(
          eq(mediaSchema.id, id),
          inArray(mediaSchema.status, ['UPLOADING', 'PROCESSING']),
          isNull(mediaSchema.deletedAt)
        )
      )
      .returning({ id: mediaSchema.id });

    if (!updated) {
      throw new InvalidLifecycleTransitionError(
        `Cannot transition media ${id} to FAILED. Media must be in UPLOADING or PROCESSING status and not deleted.`
      );
    }
  }

  public async finalizeProcessedMedia(
    props: {
      mediaId: string;
      metadata: Record<string, unknown>;
      variants: Array<{
        variantType: string;
        storageKey: string;
        width: number | null;
        height: number | null;
        fileSize: number;
      }>;
    },
    tx?: TransactionClient
  ): Promise<void> {
    const executeFinalize = async (client: TransactionClient) => {
      // 1. Idempotent upsert metadata
      await this.saveMetadata(props.mediaId, props.metadata, client);

      // 2. Idempotent upsert variants
      for (const variant of props.variants) {
        await this.saveVariant(
          {
            mediaId: props.mediaId,
            variantType: variant.variantType,
            storageKey: variant.storageKey,
            width: variant.width,
            height: variant.height,
            fileSize: variant.fileSize,
          },
          client
        );
      }

      // 3. Transition status from PROCESSING to READY
      const [updated] = await client
        .update(mediaSchema)
        .set({ status: 'READY', updatedAt: new Date() })
        .where(
          and(
            eq(mediaSchema.id, props.mediaId),
            eq(mediaSchema.status, 'PROCESSING'),
            isNull(mediaSchema.deletedAt)
          )
        )
        .returning({ id: mediaSchema.id });

      if (!updated) {
        throw new InvalidLifecycleTransitionError(
          `Cannot transition media ${props.mediaId} to READY. Media must be in PROCESSING status and not deleted.`
        );
      }
    };

    if (tx) {
      await executeFinalize(tx);
    } else {
      await this.database.transaction(async (innerTx) => {
        await executeFinalize(innerTx);
      });
    }
  }

  public async saveMetadata(
    mediaId: string,
    metadata: Record<string, unknown>,
    tx?: TransactionClient
  ): Promise<void> {
    await this.getClient(tx)
      .insert(mediaMetadataSchema)
      .values({
        mediaId,
        metadata,
      })
      .onConflictDoUpdate({
        target: mediaMetadataSchema.mediaId,
        set: { metadata },
      });
  }

  public async saveVariant(
    props: {
      mediaId: string;
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    },
    tx?: TransactionClient
  ): Promise<void> {
    await this.getClient(tx)
      .insert(mediaVariantsSchema)
      .values({
        mediaId: props.mediaId,
        variantType: props.variantType,
        storageKey: props.storageKey,
        width: props.width,
        height: props.height,
        fileSize: props.fileSize,
      })
      .onConflictDoUpdate({
        target: [mediaVariantsSchema.mediaId, mediaVariantsSchema.variantType],
        set: {
          storageKey: props.storageKey,
          width: props.width,
          height: props.height,
          fileSize: props.fileSize,
        },
      });
  }

  public async getMetadata(mediaId: string): Promise<Record<string, unknown> | null> {
    const [row] = await this.getClient()
      .select()
      .from(mediaMetadataSchema)
      .where(eq(mediaMetadataSchema.mediaId, mediaId))
      .limit(1);

    if (!row) return null;
    return row.metadata as Record<string, unknown>;
  }

  public async getVariants(mediaId: string): Promise<
    Array<{
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    }>
  > {
    const rows = await this.getClient()
      .select({
        variantType: mediaVariantsSchema.variantType,
        storageKey: mediaVariantsSchema.storageKey,
        width: mediaVariantsSchema.width,
        height: mediaVariantsSchema.height,
        fileSize: mediaVariantsSchema.fileSize,
      })
      .from(mediaVariantsSchema)
      .where(eq(mediaVariantsSchema.mediaId, mediaId));

    return rows;
  }

  public async listPurgeCandidates(cutoff: Date, limit: number): Promise<MediaPurgeCandidate[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new RangeError('Media purge limit must be an integer between 1 and 500');
    }

    const candidates = await this.getClient()
      .select({
        id: mediaSchema.id,
        storageProvider: mediaSchema.storageProvider,
        storageKey: mediaSchema.storageKey,
      })
      .from(mediaSchema)
      .where(
        and(
          eq(mediaSchema.status, 'DELETED'),
          isNotNull(mediaSchema.deletedAt),
          lte(mediaSchema.deletedAt, cutoff)
        )
      )
      .orderBy(asc(mediaSchema.deletedAt), asc(mediaSchema.id))
      .limit(limit);

    if (candidates.length === 0) return [];
    const variantRows = await this.getClient()
      .select({ mediaId: mediaVariantsSchema.mediaId, storageKey: mediaVariantsSchema.storageKey })
      .from(mediaVariantsSchema)
      .where(
        inArray(
          mediaVariantsSchema.mediaId,
          candidates.map((candidate) => candidate.id)
        )
      );
    const variantsByMedia = new Map<string, string[]>();
    for (const variant of variantRows) {
      const keys = variantsByMedia.get(variant.mediaId) ?? [];
      keys.push(variant.storageKey);
      variantsByMedia.set(variant.mediaId, keys);
    }

    return candidates.map((candidate) => ({
      id: candidate.id,
      storageProvider: candidate.storageProvider as 'LOCAL' | 'CLOUDINARY',
      storageKey: candidate.storageKey,
      variantKeys: variantsByMedia.get(candidate.id) ?? [],
    }));
  }

  public async hardDeletePurged(id: string, cutoff: Date): Promise<void> {
    const [deleted] = await this.getClient()
      .delete(mediaSchema)
      .where(
        and(
          eq(mediaSchema.id, id),
          eq(mediaSchema.status, 'DELETED'),
          isNotNull(mediaSchema.deletedAt),
          lte(mediaSchema.deletedAt, cutoff)
        )
      )
      .returning({ id: mediaSchema.id });

    if (!deleted) {
      throw new InvalidLifecycleTransitionError(
        `Cannot purge media ${id}. It must remain DELETED past the retention cutoff.`
      );
    }
  }
}
