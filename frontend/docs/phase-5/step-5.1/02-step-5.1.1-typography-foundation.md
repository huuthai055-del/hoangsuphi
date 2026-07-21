# Typography Foundation

## Font stack tiếng Việt

Phase 5.1 dùng font stack không phụ thuộc tải mạng:

```css
Inter, "Noto Sans", "Segoe UI", Arial, sans-serif
```

- Trình duyệt ưu tiên Inter hoặc Noto Sans khi máy người dùng đã có.
- `Segoe UI`/Arial/system sans-serif là fallback ổn định trên Windows và các nền tảng khác.
- Không dùng `next/font/google`, không tải font trong production build và không đóng gói file font.
- Production build không phụ thuộc DNS/CDN font bên ngoài.

## Typography scale

Scale được định nghĩa tập trung trong `src/app/globals.css`:

- `.text-display`: hero lớn, responsive mobile → desktop.
- `.text-h1`: tiêu đề trang.
- `.text-h2`: tiêu đề section.
- `.text-h3`: tiêu đề card/nhóm.
- `.text-h4`: phụ đề.
- `.text-body-large`, `.text-body`, `.text-body-small`.
- `.text-caption`: thông tin phụ, dùng semantic muted color.

Line-height, weight và kích thước được chọn để dấu tiếng Việt không bị cắt, nội dung dài vẫn dễ đọc trên màn hình nhỏ.

## Trạng thái

**Hoàn tất và tích hợp tại `src/app/layout.tsx` + `src/app/globals.css`.**
