import { AppError } from '@/common/errors/app.error';

export class MediaDomainError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'MED_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/media-domain-error' });
  }
}

export class MediaValidationError extends MediaDomainError {
  override readonly errorCode = 'MED_VAL_001';
}

export class UnsupportedMediaTypeError extends MediaDomainError {
  override readonly errorCode = 'MED_VAL_002';
}

export class FileTooLargeError extends MediaDomainError {
  override readonly errorCode = 'MED_VAL_003';
}

export class DuplicateMediaError extends MediaDomainError {
  override readonly errorCode = 'MED_CON_001';
  override readonly statusCode = 409;
}

export class ExifExtractionError extends MediaDomainError {
  override readonly errorCode = 'MED_VAL_004';
}

export class ImageProcessingError extends MediaDomainError {
  override readonly errorCode = 'MED_SYS_002';
}

export class VariantGenerationError extends MediaDomainError {
  override readonly errorCode = 'MED_SYS_003';
}

export class StorageProcessingError extends MediaDomainError {
  override readonly errorCode = 'MED_SYS_004';
}

export class StorageUploadError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'MED_SYS_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/storage-upload-error' });
  }
}
