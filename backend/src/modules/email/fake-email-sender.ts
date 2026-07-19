import type { IEmailRequest, IEmailResult, IEmailSender } from './email-sender.interface';
import { EmailProviderHardFailureError, EmailProviderTimeoutError } from './email.errors';
import { randomUUID } from 'node:crypto';

export class FakeEmailSender implements IEmailSender {
  private capturedEmails: IEmailRequest[] = [];
  private simulateFailure = false;
  private simulateTimeout = false;
  
  // By default timeout is 5 seconds based on contract but here we can throw timeout error immediately if flag is set
  private timeoutErrorMsg = 'FakeEmailSender: Simulated Timeout';

  async send(request: IEmailRequest): Promise<IEmailResult> {
    if (this.simulateFailure) {
      throw new EmailProviderHardFailureError(
        'FakeEmailSender: Simulated Hard Failure (e.g. 503 Provider Error)',
        'fake'
      );
    }

    if (this.simulateTimeout) {
      // According to contract, timeout shouldn't invalidate token because we don't know if email was sent.
      throw new EmailProviderTimeoutError(this.timeoutErrorMsg, 'fake');
    }

    // Capture the email for assertions in tests
    this.capturedEmails.push(request);

    // Sanitized logging (No raw tokens, redact email part, no subject PII)
    const requestId = request.requestId ?? 'unknown_req';
    const redactedEmail = request.to.replace(/(?<=^.{1})[^@\n]+(?=@)/, '***');
    const templateId = request.templateId ?? 'unknown_template';

    console.info(
      `[FakeEmail] To: ${redactedEmail} | TemplateId: ${templateId} | RequestId: ${requestId}`
    );

    return {
      messageId: `fake-${randomUUID()}`,
      provider: 'fake',
    };
  }

  // Testing Utilities
  getCapturedEmails(): IEmailRequest[] {
    return this.capturedEmails;
  }

  clearCapture(): void {
    this.capturedEmails = [];
  }

  setSimulateFailure(value: boolean): void {
    this.simulateFailure = value;
  }

  setSimulateTimeout(value: boolean): void {
    this.simulateTimeout = value;
  }
}
