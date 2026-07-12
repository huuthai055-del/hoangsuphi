import type { IMediaRepository } from './media-repository.interface';
import type { Media } from '../domain/media.entity';
import { MediaMapper } from './media.mapper';
import {
  media as mediaSchema,
  mediaVariants as mediaVariantsSchema,
  mediaMetadata as mediaMetadataSchema,
} from '@/lib/database/schema/media';
import { db, type TransactionClient } from '@/lib/database/client';
import { eq, and, isNull } from 'drizzle-orm';
import { EntityNotFoundRepositoryError } from '@/modules/articles/repository/repository-errors';

export class DrizzleMediaRepository implements IMediaRepository {
  private getClient(tx?: TransactionClient) {
    return tx ?? db;
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

  public async save(media: Media, tx?: TransactionClient): Promise<void> {
    const raw = MediaMapper.toPersistence(media);
    await this.getClient(tx).insert(mediaSchema).values(raw);
  }

  public async update(media: Media, tx?: TransactionClient): Promise<void> {
    const raw = MediaMapper.toPersistence(media);
    const [updated] = await this.getClient(tx)
      .update(mediaSchema)
      .set(raw)
      .where(eq(mediaSchema.id, raw.id))
      .returning({ id: mediaSchema.id });

    if (!updated) {
      throw new EntityNotFoundRepositoryError(`Media not found with ID: ${raw.id}`);
    }
  }

  public async delete(id: string, tx?: TransactionClient): Promise<void> {
    const [deleted] = await this.getClient(tx)
      .delete(mediaSchema)
      .where(eq(mediaSchema.id, id))
      .returning({ id: mediaSchema.id });

    if (!deleted) {
      throw new EntityNotFoundRepositoryError(`Media not found with ID: ${id}`);
    }
  }

  public async saveMetadata(mediaId: string, metadata: Record<string, unknown>, tx?: TransactionClient): Promise<void> {
    await this.getClient(tx).insert(mediaMetadataSchema).values({
      mediaId,
      metadata,
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
    await this.getClient(tx).insert(mediaVariantsSchema).values({
      mediaId: props.mediaId,
      variantType: props.variantType,
      storageKey: props.storageKey,
      width: props.width,
      height: props.height,
      fileSize: props.fileSize,
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

  public async getVariants(
    mediaId: string
  ): Promise<
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
}
