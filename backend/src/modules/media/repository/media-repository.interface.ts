import type { TransactionClient } from '@/lib/database/client';
import type { Media } from '../domain/media.entity';

export interface MediaPurgeCandidate {
  id: string;
  storageProvider: 'LOCAL' | 'CLOUDINARY';
  storageKey: string;
  variantKeys: string[];
}

export interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByHash(hash: string): Promise<Media | null>;
  findScopedDuplicate(props: {
    uploaderId: string;
    ownerType: string | null;
    ownerId: string | null;
    hash: string;
  }): Promise<Media | null>;

  save(media: Media, tx?: TransactionClient): Promise<void>;
  update(media: Media, tx?: TransactionClient): Promise<void>;
  delete(id: string, tx?: TransactionClient): Promise<void>;

  // Lifecycle Support
  transitionToProcessing(id: string, tx?: TransactionClient): Promise<void>;
  transitionToFailed(id: string, tx?: TransactionClient): Promise<void>;
  finalizeProcessedMedia(
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
  ): Promise<void>;

  // Metadata & Variants (Idempotent updates)
  saveMetadata(
    mediaId: string,
    metadata: Record<string, unknown>,
    tx?: TransactionClient
  ): Promise<void>;
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
  getVariants(mediaId: string): Promise<
    Array<{
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    }>
  >;

  listPurgeCandidates(cutoff: Date, limit: number): Promise<MediaPurgeCandidate[]>;
  hardDeletePurged(id: string, cutoff: Date): Promise<void>;
}
