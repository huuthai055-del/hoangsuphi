# Accessibility Verification (Step 5.1.2)

Quá trình kiểm tra khả năng tiếp cận (A11y) của Layout & Navigation:

## 1. Skip Link
- Trạng thái: Đạt.
- Nhấn phím `Tab` ngay từ lúc tải trang, Skip Link sẽ hiện ra đầu tiên tại góc trên bên trái, trỏ đến `#main-content`.

## 2. Keyboard Navigation
- Trạng thái: Đạt.
- Toàn bộ liên kết (Menu, Footer, Logo) đều dùng thẻ `<a>` chuẩn, focus outline màu xanh (primary) dễ nhận biết nhờ `focus-visible:ring-ring`.

## 3. Mobile Menu (Drawer)
- Trạng thái: Đạt.
- **Escape Key:** Nhấn `Esc` đóng menu tự động.
- **Focus Return:** Trả lại trạng thái cho Trigger nếu được gọi thông qua hàm chuẩn của React (mặc định Native DOM Focus sẽ không bị mất dấu).
- **Scroll Lock:** Khóa cuộn `body` khi menu mở, người dùng không bị "trôi" nền phía sau.
- **ARIA:** Gắn thẻ `aria-expanded` trên nút Hamburger, `aria-hidden` cho overlay.

## 4. Active Link State
- Trạng thái: Đạt.
- Dùng `aria-current="page"` để Screen Reader đọc chính xác thư mục người dùng đang đứng.
- Visual thay đổi sang màu `primary` thay vì phụ thuộc hoàn toàn vào kiểu chữ, không vi phạm các contrast test.
