import { describe, expect, it, beforeEach } from 'bun:test';
import { FakeEmailSender } from './fake-email-sender';

describe('FakeEmailSender', () => {
  let sender: FakeEmailSender;

  beforeEach(() => {
    sender = new FakeEmailSender();
  });

  it('should capture sent emails and return success result with templateId', async () => {
    const result = await sender.send({
      to: 'test@hoangsuphi.vn',
      subject: 'Welcome to Hoang Su Phi',
      html: '<p>Welcome</p>',
      text: 'Welcome',
      templateId: 'email_verification',
    });

    expect(result.provider).toBe('fake');
    expect(result.messageId).toInclude('fake-');

    const captured = sender.getCapturedEmails();
    expect(captured.length).toBe(1);
    expect(captured[0]?.to).toBe('test@hoangsuphi.vn');
    expect(captured[0]?.templateId).toBe('email_verification');
  });

  it('should simulate hard failure when configured', async () => {
    sender.setSimulateFailure(true);

    let error: Error | null = null;
    try {
      await sender.send({
        to: 'fail@example.com',
        subject: 'Fail',
        html: '',
        text: '',
      });
    } catch (e: any) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error?.message || '').toInclude('Simulated Hard Failure');
  });

  it('should simulate timeout when configured', async () => {
    sender.setSimulateTimeout(true);

    let error: Error | null = null;
    try {
      await sender.send({
        to: 'timeout@example.com',
        subject: 'Timeout',
        html: '',
        text: '',
      });
    } catch (e: any) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error?.message || '').toInclude('Simulated Timeout');
  });

  it('should clear capture correctly', async () => {
    await sender.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '',
      text: '',
    });
    expect(sender.getCapturedEmails().length).toBe(1);

    sender.clearCapture();
    expect(sender.getCapturedEmails().length).toBe(0);
  });
});
