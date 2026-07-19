import { AppError } from '@/common/errors/app.error';

export class BusinessDomainError extends AppError {
  readonly statusCode: number = 400;
  readonly errorCode: string = 'BUS_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/business-domain-error' });
  }
}
