import type { Media } from '../../domain/media.entity';
import type { IMediaStorage } from '../../domain/storage.interface';
import type { MediaResponseDto, MediaVariantResponseDto } from '../../dto/media.dto';

export const MediaPresentationMapper = {
  async toResponseDto(media: Media, storage: IMediaStorage): Promise<MediaResponseDto> {
    const props = media.toPersistence();
    const url = await storage.getUrl(props.storageKey);
    return {
      id: props.id,
      fileName: props.fileName,
      storageKey: props.storageKey,
      url,
      mimeType: props.mimeType,
      mediaType: props.mediaType,
      fileSize: props.fileSize,
      hash: props.hash,
      status: props.status,
      ownerType: props.ownerType,
      ownerId: props.ownerId,
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    };
  },

  async toVariantResponseDto(
    variant: {
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    },
    storage: IMediaStorage
  ): Promise<MediaVariantResponseDto> {
    const url = await storage.getUrl(variant.storageKey);
    return {
      variantType: variant.variantType,
      storageKey: variant.storageKey,
      url,
      width: variant.width,
      height: variant.height,
      fileSize: variant.fileSize,
    };
  },
};
