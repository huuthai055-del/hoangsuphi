import type { Context } from 'hono';
import type { MediaUploadService } from '../service/media-upload.service';
import type { MediaProcessingService } from '../service/media-processing.service';
import type { IMediaRepository } from '../repository/media-repository.interface';
import type { IMediaStorage } from '../domain/storage.interface';
import { MediaPresentationMapper } from './mappers/media.mapper';
import type { MediaIdParamsDto } from '../dto/media.dto';
import { ValidationError, NotFoundError } from '@/common/errors/http.errors';

export class MediaController {
  constructor(
    private readonly uploadService: MediaUploadService,
    private readonly processingService: MediaProcessingService,
    private readonly mediaRepo: IMediaRepository,
    private readonly storage: IMediaStorage
  ) {}

  public upload = async (c: Context) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!file || !(file instanceof File)) {
      throw new ValidationError('File payload is required in multipart form data');
    }

    const ownerType = typeof body.ownerType === 'string' ? body.ownerType : null;
    const ownerId = typeof body.ownerId === 'string' ? body.ownerId : null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const media = await this.uploadService.upload({
      fileName: file.name,
      mimeType: file.type,
      fileBuffer: buffer,
      ownerType,
      ownerId,
    });

    // Kích hoạt image processing pipeline để tạo variants và trích xuất EXIF
    await this.processingService.process(media.id);

    // Refresh media state từ repo sau khi process
    const processedMedia = await this.mediaRepo.findById(media.id);
    if (!processedMedia) {
      throw new NotFoundError('Media processed but not found');
    }

    const response = await MediaPresentationMapper.toResponseDto(processedMedia, this.storage);
    return c.json(response, 201);
  };

  public getById = async (c: Context) => {
    const params = c.get('validParams') as MediaIdParamsDto;
    const media = await this.mediaRepo.findById(params.id);
    if (!media) {
      throw new NotFoundError(`Media not found with ID: ${params.id}`);
    }

    const response = await MediaPresentationMapper.toResponseDto(media, this.storage);
    return c.json(response, 200);
  };

  public getVariants = async (c: Context) => {
    const params = c.get('validParams') as MediaIdParamsDto;
    const media = await this.mediaRepo.findById(params.id);
    if (!media) {
      throw new NotFoundError(`Media not found with ID: ${params.id}`);
    }

    const variants = await this.mediaRepo.getVariants(params.id);
    const mapped = await Promise.all(
      variants.map((v) => MediaPresentationMapper.toVariantResponseDto(v, this.storage))
    );

    return c.json({ data: mapped }, 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as MediaIdParamsDto;
    const media = await this.mediaRepo.findById(params.id);
    if (!media) {
      throw new NotFoundError(`Media not found with ID: ${params.id}`);
    }

    // Soft delete
    media.softDelete();
    await this.mediaRepo.update(media);

    return c.body(null, 204);
  };
}
