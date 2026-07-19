import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/common/errors/http.errors';
import type { Context } from 'hono';
import type { MediaIdParamsDto } from '../dto/media.dto';
import { UploadMediaSchema } from '../dto/media.dto';
import type { IMediaRepository } from '../repository/media-repository.interface';
import type { MediaIngestionService } from '../service/media-ingestion.service';
import type { MediaStorageResolver } from '../service/media-storage.resolver';
import { MediaPresentationMapper } from './mappers/media.mapper';

export class MediaController {
  constructor(
    private readonly ingestionService: MediaIngestionService,
    private readonly mediaRepo: IMediaRepository,
    private readonly storageResolver: MediaStorageResolver
  ) {}

  public upload = async (c: Context) => {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new AuthenticationError('Authentication required');
    }

    const body = await c.req.parseBody({ all: true });
    const file = body.file;
    if (!file || !(file instanceof File)) {
      throw new ValidationError('File payload is required in multipart form data');
    }

    const { file: _, ...textFields } = body;
    const parsedResult = UploadMediaSchema.safeParse(textFields);

    if (!parsedResult.success) {
      const details: Record<string, string> = {};
      for (const issue of parsedResult.error.issues) {
        details[issue.path.join('.')] = issue.message;
      }
      throw new ValidationError('Validation failed', details);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { media, deduplicated } = await this.ingestionService.ingest({
      fileName: file.name,
      mimeType: file.type,
      fileBuffer: buffer,
      altText: parsedResult.data.altText,
      caption: parsedResult.data.caption,
      uploadedBy: user.id,
      signal: c.req.raw.signal,
    });

    const storage = this.storageResolver.resolve(media.storageProvider);
    const variants = await this.mediaRepo.getVariants(media.id);
    const metadata = await this.mediaRepo.getMetadata(media.id);
    const response = await MediaPresentationMapper.toResponseDto(
      media,
      storage,
      variants,
      metadata
    );

    return c.json(
      {
        data: response,
        meta: {
          deduplicated,
        },
        error: null,
      },
      deduplicated ? 200 : 201
    );
  };

  public getById = async (c: Context) => {
    const params = c.get('validParams') as MediaIdParamsDto;
    const media = await this.mediaRepo.findById(params.id);
    if (!media || media.status !== 'READY') {
      throw new NotFoundError(`Media not found with ID: ${params.id}`);
    }

    const storage = this.storageResolver.resolve(media.storageProvider);
    const variants = await this.mediaRepo.getVariants(media.id);
    const metadata = await this.mediaRepo.getMetadata(media.id);
    const response = await MediaPresentationMapper.toResponseDto(
      media,
      storage,
      variants,
      metadata
    );

    return c.json(
      {
        data: response,
        meta: {
          deduplicated: false,
        },
        error: null,
      },
      200
    );
  };

  public getVariants = async (c: Context) => {
    const params = c.get('validParams') as MediaIdParamsDto;
    const media = await this.mediaRepo.findById(params.id);
    if (!media || media.status !== 'READY') {
      throw new NotFoundError(`Media not found with ID: ${params.id}`);
    }

    const storage = this.storageResolver.resolve(media.storageProvider);
    const variants = await this.mediaRepo.getVariants(params.id);
    const mapped = [];
    for (const v of variants) {
      mapped.push(await MediaPresentationMapper.toVariantResponseDto(v, storage));
    }

    return c.json(
      {
        data: mapped,
        meta: {},
        error: null,
      },
      200
    );
  };

  public delete = async (c: Context) => {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new AuthenticationError('Authentication required');
    }

    const params = c.get('validParams') as MediaIdParamsDto;
    const media = await this.mediaRepo.findById(params.id);
    if (!media) {
      throw new NotFoundError(`Media not found with ID: ${params.id}`);
    }

    if (media.uploadedBy !== user.id && !user.roles.includes('admin')) {
      throw new AuthorizationError('You do not have permission to delete this media');
    }

    media.softDelete();
    await this.mediaRepo.update(media);

    return c.body(null, 204);
  };
}
