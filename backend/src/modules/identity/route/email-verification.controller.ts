import { extractClientIp } from '@/common/utils/ip';
import type { Context } from 'hono';
import type {
  ConfirmVerificationRequestDto,
  ResendVerificationRequestDto,
} from '../dto/email-verification.dto';
import type { IEmailVerificationService } from '../service/email-verification.service';

export class EmailVerificationController {
  constructor(private readonly emailVerificationService: IEmailVerificationService) {}

  public resend = async (c: Context) => {
    const body = c.get('validBody') as ResendVerificationRequestDto;
    const ipAddress = extractClientIp(c);
    const idempotencyKey = c.req.header('idempotency-key') || c.req.header('Idempotency-Key');

    await this.emailVerificationService.resend(body.email, ipAddress, idempotencyKey);

    return c.json(
      {
        data: {
          message:
            'Nếu địa chỉ email hợp lệ và đủ điều kiện, hướng dẫn sẽ được gửi trong ít phút.',
        },
      },
      202
    );
  };

  public confirm = async (c: Context) => {
    const body = c.get('validBody') as ConfirmVerificationRequestDto;
    const ipAddress = extractClientIp(c);
    const idempotencyKey = c.req.header('idempotency-key') || c.req.header('Idempotency-Key');

    await this.emailVerificationService.confirm(body.token, ipAddress, idempotencyKey);

    return c.json(
      {
        data: {
          message: 'Xác thực email thành công.',
        },
      },
      200
    );
  };
}
