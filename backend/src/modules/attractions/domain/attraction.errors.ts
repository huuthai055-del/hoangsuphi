import { AppError } from '@/common/errors/app.error';

export class AttractionDomainError extends AppError {
  readonly statusCode: number = 400;
  readonly errorCode: string = 'ATT_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/attraction-domain-error' });
  }
}
