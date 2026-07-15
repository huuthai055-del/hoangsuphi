import { AppError } from '@/common/errors/app.error';

export class ArticleDomainError extends AppError {
  readonly statusCode: number = 400;
  readonly errorCode: string = 'ART_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details, { typeUri: 'https://hoangsuphi.vn/errors/article-domain-error' });
  }
}

export class CategoryDomainError extends ArticleDomainError {
  override readonly errorCode = 'CAT_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    Object.setPrototypeOf(this, CategoryDomainError.prototype);
  }
}

export class TagDomainError extends ArticleDomainError {
  override readonly errorCode = 'TAG_DOM_001';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    Object.setPrototypeOf(this, TagDomainError.prototype);
  }
}
