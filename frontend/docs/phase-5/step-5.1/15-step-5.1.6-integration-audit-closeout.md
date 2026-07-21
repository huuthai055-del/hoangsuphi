# Step 5.1.6 — Integration, Audit & Closeout

## 1. Kết quả tích hợp

Hai nguồn đầu vào đã được hợp nhất thành một frontend package hoàn chỉnh:

- `5.0.zip`: contract, route/API matrix và các quyết định đã khóa của Step 5.0.
- `ssss(1).zip`: source foundation 5.1.1–5.1.5 và tài liệu triển khai ban đầu.

Package cuối có đầy đủ `package.json`, lockfile, TypeScript/ESLint/PostCSS/Next config, `.env.example`, source, tests và tài liệu.

## 2. Nội dung hoàn thiện

### Design system & layout

- Semantic brand tokens, typography tiếng Việt, spacing, breakpoints và z-index.
- Responsive site shell, header/footer, desktop/mobile navigation, skip link.
- Primitives: button, link-button, icon-button, field/input/textarea, card, badge, chip, alert, divider và section heading.
- Loading, skeleton, empty, inline error, full error và not-found states.

### Typed API foundation

- Same-origin browser client và server-only backend client.
- URL/path hardening, query/cursor serialization, timeout/abort handling.
- Runtime schema boundary và RFC 7807 error mapping.
- Exact allowlist cho public catalog/reference kinds của Step 5.0.

### BFF/auth/contact

- Login/refresh/logout/session BFF routes.
- Access/refresh token nằm trong HttpOnly cookies; không lưu token ở Web Storage.
- Same-origin mutation guard và no-store responses.
- SessionProvider điều khiển action tài khoản/yêu thích theo session.
- Refresh chỉ retry một lần khi caller đánh dấu request replay-safe; mutation không bị tự replay.
- Phone, Zalo và Google Maps deep-link validation.

### Integration remediation

- Tắt Next trailing-slash redirect mặc định để middleware chuẩn hóa chữ thường + slash trong một hop 308.
- Loại `next/font/google` để production build không phụ thuộc mạng.
- `PublicImage` không mở image optimizer thành remote proxy rộng.
- Thêm route shells cho `/co-so`, `/dia-diem`, `/khu-vuc`, `/tien-ich`, `/tim-kiem`, `/gan-toi`, `/yeu-thich`, `/tai-khoan`.
- Tách test runner tuần tự để runtime servers không chạy tranh chấp.

## 3. Verification gates

Đã chạy trên package cuối:

- `npm run typecheck` — PASS.
- `npm run lint` — PASS, 0 warning.
- `npm run build` — PASS, production build hoàn tất.
- Unit/contract tests — 59 PASS.
- Cross-crawl runtime — 1 PASS.
- Redirect runtime — 4 PASS.
- SSR/proxy runtime — 24 PASS.
- Tổng cộng — **88 PASS, 0 FAIL**.
- `npm audit` — 0 vulnerability.

## 4. Scope compliance

- Không sửa backend/database/migration.
- Không thêm interactive-map dependency hoặc `/ban-do`.
- Không hardcode dữ liệu kinh doanh production.
- Không lưu hoặc log access/refresh token trong browser JavaScript.
- Giữ SEO, sitemap, robots và redirect regression gates.

## 5. Known boundary

Public catalog functions nhận runtime schema từ feature module. Đây là chủ ý để Phase 5.1 không tự phát minh DTO; từng page feature ở Phase 5.2+ phải truyền strict schema khớp backend contract.

Next.js App Router có thể trả HTTP 200 cho streamed not-found boundary sau khi header đã bắt đầu; runtime gate xác nhận tài liệu 404 và `noindex`, thay vì giả định mọi streamed response luôn mang status 404.

## 6. Closeout state

**PHASE 5.1 — DESIGN SYSTEM & FRONTEND FOUNDATION: COMPLETED**

Đủ điều kiện khóa sau khi tích hợp vào nhánh dự án chính và chạy lại `npm run verify` trong môi trường CI/deployment đích.
