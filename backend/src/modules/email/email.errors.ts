export class EmailProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly isTimeout = false
  ) {
    super(message);
    this.name = 'EmailProviderError';
  }
}

export class EmailProviderHardFailureError extends EmailProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, false);
    this.name = 'EmailProviderHardFailureError';
  }
}

export class EmailProviderTimeoutError extends EmailProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, true);
    this.name = 'EmailProviderTimeoutError';
  }
}
