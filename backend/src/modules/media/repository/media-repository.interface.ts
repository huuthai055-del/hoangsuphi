import type { Media } from '../domain/media.entity';
import type { TransactionClient } from '@/lib/database/client';

export interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByHash(hash: string): Promise<Media | null>;
  save(media: Media, tx?: TransactionClient): Promise<void>;
  update(media: Media, tx?: TransactionClient): Promise<void>;
  delete(id: string, tx?: TransactionClient): Promise<void>;
}
