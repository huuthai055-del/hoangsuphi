# Profile Scope Decision

**Trạng thái:** APPROVED WITH REDUCED SCOPE (DG-5.0-03, 2026-07-20)

## Evidence

Backend không có `/auth/me`; `displayName` từ đăng ký chưa được persist vào profile contract; JWT không phải nguồn dữ liệu profile bền vững để frontend đọc. Vì vậy không thể phát hành trang `/tai-khoan` hiển thị/chỉnh sửa hồ sơ một cách đáng tin cậy trong Phase 5 hiện tại.

## Scope đề xuất cho Phase 5

- Giữ **Yêu thích**, **Đăng xuất**, đổi mật khẩu nếu backend hỗ trợ, và review của người dùng nếu API/permission hiện hữu đáp ứng; các flow cá nhân đi qua BFF đã được duyệt.
- Không tạo profile detail/edit nâng cao, avatar, display name, preferences, social profile hoặc mock `/auth/me`.
- `/tai-khoan` chỉ là trang tài khoản cơ bản theo API/permission hiện có; phần hồ sơ nâng cao được defer sang phase sau hoặc chỉ mở lại sau controlled unlock profile API.

Quyết định này không dùng token claims để dựng “tên người dùng”; header chỉ cần trạng thái đăng nhập và hành động an toàn.
