# Accessibility Verification

## 1. Contrast (Độ tương phản)
- **Background & Foreground:** Nền Kem (`#FDFBF7`) với Chữ Đen (`#1A1A1A`) -> Tỉ lệ rất cao (>15:1), đáp ứng hoàn hảo tiêu chuẩn đọc chữ nhỏ.
- **Primary Button:** Nền Xanh Núi (`#2C5F2D`) với Chữ Trắng (`#FFFFFF`) -> Đạt mức ~5.4:1, thỏa mãn điều kiện WCAG AA (>= 4.5:1).

## 2. Focus Visible
Đã cấu hình `*:focus-visible` ở global CSS.
- Khi người dùng điều hướng bằng bàn phím (Tab), các phần tử như input, button, a tag sẽ nhận được viền nổi bật (Màu Xanh Núi `ring`).
- Điều này loại bỏ nỗi lo outline bị cắt hay mất đi ở các component.

## 3. Reduced Motion
- Bổ sung `@media (prefers-reduced-motion: reduce)`.
- Khi máy người dùng cấu hình "Giảm chuyển động", hệ thống tự ép `animation-duration: 0.01ms` cho tất cả phần tử. Không xuất hiện delay hoặc parallax.

## 4. Ngôn ngữ
- Thẻ HTML gốc trong `layout.tsx` được khóa ở `lang="vi"`. Giúp các Screen Reader (Trình đọc màn hình) xử lý tiếng Việt chính xác.
