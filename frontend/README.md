# Hoàng Su Phì Frontend — Phase 5.1

Nền tảng Design System và Frontend Foundation cho Cổng thông tin Du lịch Hoàng Su Phì.

## Yêu cầu

- Node.js 22+
- npm 10+
- Bun 1.3+ để chạy bộ test trực tiếp; script npm cũng có thể tải runner Bun 1.3.14 đã pin qua `npx`

## Khởi động

```bash
npm install
cp .env.example .env.local
npm run dev
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Cập nhật `PUBLIC_SITE_URL` và `INTERNAL_BACKEND_URL` trong `.env.local` trước khi kết nối backend Phase 3–4.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

Hoặc chạy toàn bộ theo đúng thứ tự:

```bash
npm run verify
```

`npm run test` yêu cầu production build đã tồn tại vì bộ runtime test khởi động `next start`. Runner `scripts/test-all.ts` chạy unit/contract trước, sau đó chạy tuần tự cross-crawl, redirect và SSR để không tranh chấp tiến trình.

## Phase 5.1 đã bao phủ

- Brand/design tokens, typography tiếng Việt không phụ thuộc tải font ngoài.
- Responsive shell, header, footer, desktop/mobile navigation và skip link.
- Component primitives cùng loading/error/empty/skeleton states.
- Typed API foundation, runtime schema boundary và RFC 7807 mapping.
- BFF auth với HttpOnly cookies, session provider và refresh không replay mutation.
- Phone/Zalo/Google Maps deep-link utilities an toàn.
- Route shells cho các entry point công khai của Phase 5.0.
- SEO/SSR/redirect regression tests được giữ nguyên và tích hợp vào gate.

Tài liệu kiến trúc và bằng chứng xác minh nằm trong `docs/phase-5/`.
