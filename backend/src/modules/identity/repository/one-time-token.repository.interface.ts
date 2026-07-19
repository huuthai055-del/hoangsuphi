import type { TransactionClient } from '@/lib/database/client';

export interface IOneTimeTokenRepository {
  /**
   * Sinh một token an toàn mới với độ dài 32 bytes (trả về dưới dạng base64url).
   * Token chưa hash sẽ được trả về trực tiếp, trong khi hash sẽ được lưu vào cơ sở dữ liệu.
   *
   * @param userId - ID người dùng
   * @param type - Loại token (email_verification, password_reset, v.v.)
   * @param ttlSeconds - Thời gian sống của token tính bằng giây
   * @param tx - Giao dịch cơ sở dữ liệu (tùy chọn)
   * @returns Raw token dưới dạng chuỗi base64url
   */
  createToken(
    userId: string,
    type: 'email_verification' | 'password_reset' | 'email_change' | 'magic_link',
    ttlSeconds: number,
    tx?: TransactionClient
  ): Promise<string>;

  /**
   * Thu hồi tất cả các token đang chờ xử lý cho một người dùng và một loại token cụ thể.
   * Hành động này sẽ đánh dấu is_used = true cho tất cả token hợp lệ.
   */
  revokePendingTokens(
    userId: string,
    type: 'email_verification' | 'password_reset' | 'email_change' | 'magic_link',
    tx?: TransactionClient
  ): Promise<void>;

  /**
   * Tiêu thụ một token. Bằng cách cập nhật is_used = true.
   * Quá trình này hoàn toàn atomic và trả về userID nếu thành công, null nếu token không tồn tại, sai loại, hết hạn, hoặc đã được sử dụng.
   */
  consumeToken(
    rawToken: string,
    type: 'email_verification' | 'password_reset' | 'email_change' | 'magic_link',
    tx?: TransactionClient
  ): Promise<string | null>;
}
