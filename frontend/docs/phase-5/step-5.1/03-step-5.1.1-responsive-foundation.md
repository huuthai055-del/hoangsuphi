# Responsive Foundation

## Behavior (320px -> 1920px)
Dự án sử dụng cơ chế Mobile-First từ Tailwind mặc định.
- **Dưới 768px (Mobile):** Cột đơn. Gutter `16px` (`px-4`). Không gây tràn màn hình ngang.
- **768px - 1023px (Tablet):** Cột đôi cho nội dung lưới. Gutter `24px` (`px-6`).
- **1024px trở lên (Desktop):** Lưới đa cột (3-4 cột cho danh sách).

## Layout Container (`.layout-container`)
Lớp tiện ích `layout-container` được tạo trong `globals.css`:
```css
.layout-container {
  @apply w-full max-w-7xl mx-auto px-4 md:px-6;
}
```
- Đảm bảo tất cả các nội dung chính của trang nằm gọn giữa màn hình trên Desktop (không vượt quá `1280px`).
- Tránh việc nội dung bị dàn trải làm mỏi mắt người dùng màn hình to.
- Ngăn việc nội dung dính sát lề điện thoại.
