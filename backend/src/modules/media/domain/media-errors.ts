import { AppError } from '@/common/errors/app.error';

export class MediaDomainError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'MED_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/media-domain-error' });
  }
}
