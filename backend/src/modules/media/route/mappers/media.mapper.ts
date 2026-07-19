import type { Media } from '../../domain/media.entity';
import type { IMediaStorage } from '../../domain/storage.interface';
import type { MediaResponseDto, MediaVariantResponseDto } from '../../dto/media.dto';

export const MediaPresentationMapper = {
  async toResponseDto(
    media: Media,
    storage: IMediaStorage,
    variants: Array<{
      variantType: string;
      storageKey: string;
      width: number | null;
      height: number | null;
      fileSize: number;
    }> = [],
    metadata: Record<string, unknown> | null = null
  ): Promise<MediaResponseDto> {
    const props = media.toPersistence();
    const url = await storage.getUrl(props.storageKey);
    const publicMimeType =
      typeof metadata?.mimeType === 'string' ? metadata.mimeType : props.mimeType;
    const publicFileName =
      publicMimeType === 'image/webp'
        ? `${props.fileName.replace(/\.[^.]+$/u, '')}.webp`
        : props.fileName;

    const mappedVariants = [];
    for (const v of variants) {
      const variantUrl = await storage.getUrl(v.storageKey);
      mappedVariants.push({
        variantType: v.variantType,
        url: variantUrl,
        width: v.width,
        height: v.height,
        fileSize: v.fileSize,
      });
    }

    return {
      id: props.id,
      url,
      mimeType: publicMimeType,
      mediaType: props.mediaType,
      fileName: publicFileName,
      fileSize: typeof metadata?.fileSize === 'number' ? metadata.fileSize : props.fileSize,
      width: typeof metadata?.width === 'number' ? metadata.width : null,
      height: typeof metadata?.height === 'number' ? metadata.height : null,
      altText: props.altText,
      caption: props.caption,
      variants: mappedVariants,
      createdAt: props.createdAt.toISOString(),
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
      url,
      width: variant.width,
      height: variant.height,
      fileSize: variant.fileSize,
    };
  },
};
