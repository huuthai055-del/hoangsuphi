export interface IEmailRequest {
  from?: string; // Tùy chọn (sẽ lấy default từ config)
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  requestId?: string; // Dùng cho logging
  templateId?: string; // Định danh template (e.g. 'email_verification') dùng cho logging sanitized
}


export interface IEmailResult {
  messageId: string;
  provider: 'fake' | 'resend';
}

export interface IEmailSender {
  send(request: IEmailRequest): Promise<IEmailResult>;
}
