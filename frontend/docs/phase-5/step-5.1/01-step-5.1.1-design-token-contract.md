# Design Token Contract

## Source Tokens (Brand)
- `--mountain-green: #2C5F2D`: Xanh núi đặc trưng.
- `--rice-gold: #D4AF37`: Vàng lúa chín.
- `--earth-brown: #5C4033`: Nâu đất bản địa.
- `--warm-cream: #FDFBF7`: Nền kem dịu nhẹ.

## Semantic Tokens (Áp dụng trong code)
- **Background/Foreground:** `--background`, `--foreground`, `--foreground-muted`.
- **Primary:** `--primary` (Xanh núi), `--primary-hover`, `--primary-active`, `--primary-foreground` (Trắng).
- **Secondary:** `--secondary` (Vàng lúa), `--secondary-hover`, `--secondary-foreground` (Đen).
- **Status:** `--success`, `--warning`, `--danger`, `--info` cùng màu text tương ứng.
- **Border/Input:** `--border`, `--border-strong`, `--input`, `--ring` (Xanh núi dùng cho outline).
- **Radius:** `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (16px).

*Ghi chú:*
- Không sử dụng hardcode màu HEX trực tiếp trong component. Luôn gọi semantic class như `bg-primary`, `text-secondary`, v.v.
- Contrast của `text-primary-foreground` (Trắng) trên `bg-primary` (Xanh núi) đã được đảm bảo đủ điều kiện đọc (WCAG AA).
