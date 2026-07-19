import { Media, type MediaStatus, type MediaType } from '../domain/media.entity';

export interface RawMedia {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  mediaType: string;
  fileSize: number;
  hash: string;
  status: string;
  storageProvider: string;
  altText: string | null;
  caption: string | null;
  ownerType: string | null;
  ownerId: string | null;
  uploadedBy: string | null;
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
      storageProvider: raw.storageProvider as 'LOCAL' | 'CLOUDINARY',
      altText: raw.altText,
      caption: raw.caption,
      ownerType: raw.ownerType,
      ownerId: raw.ownerId,
      uploadedBy: raw.uploadedBy,
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
      storageProvider: props.storageProvider,
      altText: props.altText,
      caption: props.caption,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      uploadedBy: props.uploadedBy,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
    };
  },
};
