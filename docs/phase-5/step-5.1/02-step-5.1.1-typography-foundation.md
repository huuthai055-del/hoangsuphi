# Typography Foundation

## Font Lựa Chọn: Inter
- **Source:** `next/font/google`.
- **Lý do:**
  - Hỗ trợ tiếng Việt hoàn hảo, dấu rõ ràng.
  - Tối ưu cực tốt cho mobile và các màn hình kích thước nhỏ.
  - Tải bằng cơ chế tối ưu của Next.js, không gây Cumulative Layout Shift (CLS).
- **Weights Tải Xuống:** `400` (Regular), `500` (Medium), `700` (Bold).

## Typography Scale
Hệ thống Typography scale được định nghĩa trong `globals.css` để giữ tính tái sử dụng, tránh duplicate Tailwind classes dài dòng.

- `.text-display`: `4xl` (Mobile) -> `6xl` (Desktop). Dùng cho Hero section tương lai.
- `.text-h1`: `3xl` -> `4xl`. Dùng cho Tiêu đề trang chính.
- `.text-h2`: `2xl` -> `3xl`. Tiêu đề Section.
- `.text-h3`: `xl` -> `2xl`. Tiêu đề Card.
- `.text-h4`: `lg` -> `xl`. Phụ đề.
- `.text-body-large`: `lg`. 
- `.text-body`: `base` (16px mặc định).
- `.text-body-small`: `sm` (14px).
- `.text-caption`: `xs text-muted`.

## Trạng thái
**Hoàn tất và tích hợp vào Layout (`layout.tsx`).**
