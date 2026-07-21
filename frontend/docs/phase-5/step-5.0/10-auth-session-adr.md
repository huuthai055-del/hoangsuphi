# Auth/Session Architecture Decision Record

**Trạng thái:** APPROVED (DG-5.0-02, 2026-07-20)

## Quyết định đề xuất

Dùng Next.js BFF/Route Handler làm lớp duy nhất trao đổi token với backend. Browser chỉ gọi các BFF route allowlist theo use case; luồng bắt buộc đầu tiên là đăng nhập, refresh và đăng xuất. Không dùng `localStorage`, `sessionStorage` hoặc bearer token trong JavaScript.

## Ràng buộc bảo mật

- Refresh token chỉ nằm trong cookie server-managed `HttpOnly`, `Path=/`, không đặt `Domain`; production bắt buộc `Secure`, dùng `SameSite` phù hợp với luồng thực tế và ưu tiên tiền tố `__Host-` khi môi trường đáp ứng điều kiện. Access token không được lộ vào JavaScript/browser log.
- BFF không phải proxy tổng quát. Route Handler chỉ forward từng use case được định nghĩa; không nhận URL, method hay header tùy ý từ browser.
- BFF gửi bearer token tới backend ở phía server; response token/backend error không được trả lại browser hoặc log thô.
- Với mutation BFF, kiểm tra `Origin`/`Host` phù hợp và áp dụng anti-CSRF token nếu bất kỳ cấu hình cookie/cross-site flow nào làm `SameSite` không còn đủ. `SameSite=Lax` không phải tuyên bố chống CSRF hoàn chỉnh.
- Khi access token hết hạn, BFF dùng một refresh request với concurrency guard, retry đúng một lần cho request idempotent/read; không retry mutation tự động sau refresh trừ khi endpoint có idempotency guarantee.
- Logout gọi revoke phía backend nếu được; luôn xóa cookie tại BFF ngay cả khi revoke lỗi và trả trạng thái UI an toàn.

## Contract đã xác minh

Backend có `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/change-password`, `/auth/email-verification/resend`, `/auth/email-verification/confirm`, `/auth/password/forgot`, `/auth/password/reset`. Không có `/auth/me`.

Approval này chỉ cho phép triển khai BFF ở Step 5.6; không yêu cầu thay đổi identity module đã LOCKED. Mọi Route Handler ngoài login/refresh/logout phải có use case Phase 5 và allowlist riêng.
