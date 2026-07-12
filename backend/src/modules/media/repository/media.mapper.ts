import { Media, type MediaType, type MediaStatus } from '../domain/media.entity';

export interface RawMedia {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  mediaType: string;
  fileSize: number;
  hash: string;
  status: string;
  ownerType: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const MediaMapper = {
  toDomain(raw: RawMedia): Media {
    return Media.rehydrate({
      id: raw.id,
      fileName: raw.fileName,
      storageKey: raw.storageKey,
      mimeType: raw.mimeType,
      mediaType: raw.mediaType as MediaType,
      fileSize: raw.fileSize,
      hash: raw.hash,
      status: raw.status as MediaStatus,
      ownerType: raw.ownerType,
      ownerId: raw.ownerId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(media: Media): RawMedia {
    const props = media.toPersistence();
    return {
      id: props.id,
      fileName: props.fileName,
      storageKey: props.storageKey,
      mimeType: props.mimeType,
      mediaType: props.mediaType,
      fileSize: props.fileSize,
      hash: props.hash,
      status: props.status,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    };
  },
};
