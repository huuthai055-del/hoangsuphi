import type { Media } from '../domain/media.entity';
import type { TransactionClient } from '@/lib/database/client';

export interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByHash(hash: string): Promise<Media | null>;
  save(media: Media, tx?: TransactionClient): Promise<void>;
  update(media: Media, tx?: TransactionClient): Promise<void>;
  delete(id: string, tx?: TransactionClient): Promise<void>;

  // Metadata & Variants
  saveMetadata(mediaId: string, metadata: Record<string, unknown>, tx?: TransactionClient): Promise<void>;
  saveVariant(
    props: {
      mediaId: string;
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    },
    tx?: TransactionClient
  ): Promise<void>;

  getMetadata(mediaId: string): Promise<Record<string, unknown> | null>;
  getVariants(
    mediaId: string
  ): Promise<
    Array<{
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    }>
  >;
}
