import { AppError, type ErrorDetails } from '@/common/errors/app.error';

export class PublicCatalogNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'PUBLIC_CATALOG_NOT_FOUND_OR_UNAVAILABLE';

  constructor() {
    super('Public catalog resource was not found or is unavailable', undefined, {
      typeUri: 'https://hoangsuphi.vn/errors/public-catalog-not-found',
    });
  }
}

export class InvalidPublicCatalogCursorError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'PUBLIC_CATALOG_CURSOR_INVALID';

  constructor(details?: ErrorDetails) {
    super('Public catalog cursor is invalid or does not match this request', details, {
      typeUri: 'https://hoangsuphi.vn/errors/public-catalog-cursor-invalid',
    });
  }
}
