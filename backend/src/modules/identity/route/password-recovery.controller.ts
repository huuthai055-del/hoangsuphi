import type { Context } from 'hono';
import { extractClientIp } from '@/common/utils/ip';
import type { IPasswordRecoveryService } from '../service/password-recovery.service';
import type { ForgotPasswordRequestDto, ResetPasswordRequestDto } from '../dto/password-recovery.dto';

export class PasswordRecoveryController {
  constructor(private readonly passwordRecoveryService: IPasswordRecoveryService) {}

  public async forgot(c: Context) {
    const body = c.get('validBody') as ForgotPasswordRequestDto;
    const clientIp = extractClientIp(c);
    const idempotencyKey = c.req.header('idempotency-key') || c.req.header('Idempotency-Key');

    await this.passwordRecoveryService.forgotPassword(body.email, clientIp, idempotencyKey);

    // Luôn trả về 202 Accepted với thông báo chung (chống enumeration)
    return c.json(
      {
        data: {
          message: 'Nếu địa chỉ email hợp lệ và đủ điều kiện, hướng dẫn sẽ được gửi trong ít phút.',
        },
      },
      202
    );
  }

  public async reset(c: Context) {
    const body = c.get('validBody') as ResetPasswordRequestDto;
    const clientIp = extractClientIp(c);
    const idempotencyKey = c.req.header('idempotency-key') || c.req.header('Idempotency-Key');

    await this.passwordRecoveryService.resetPassword(
      body.token,
      body.newPassword,
      clientIp,
      idempotencyKey
    );

    return c.json(
      {
        data: {
          message: 'Đổi mật khẩu thành công.',
        },
      },
      200
    );
  }
}
