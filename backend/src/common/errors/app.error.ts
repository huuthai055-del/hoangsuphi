export interface ErrorDetails {
  [key: string]: unknown;
}

export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;
  public readonly retryable: boolean = false;
  public readonly typeUri: string;

  constructor(
    message: string,
    public readonly details?: ErrorDetails,
    options?: { cause?: Error; retryable?: boolean; typeUri?: string }
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.retryable = options?.retryable ?? false;
    this.typeUri = options?.typeUri ?? 'https://hoangsuphi.vn/errors/internal-server-error';
    Error.captureStackTrace(this, this.constructor);
  }
}
