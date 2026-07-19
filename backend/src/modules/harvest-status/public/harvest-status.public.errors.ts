import { AppError, type ErrorDetails } from '@/common/errors/app.error';

export class HarvestRegionUnavailableError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'HARVEST_REGION_NOT_FOUND_OR_UNAVAILABLE';

  constructor() {
    super('Harvest region was not found or is unavailable', undefined, {
      typeUri: 'https://hoangsuphi.vn/errors/harvest-region-unavailable',
    });
  }
}

export class InvalidHarvestCursorError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'HARVEST_CURSOR_INVALID';

  constructor(details?: ErrorDetails) {
    super('Harvest cursor is invalid or does not match this request', details, {
      typeUri: 'https://hoangsuphi.vn/errors/harvest-cursor-invalid',
    });
  }
}
