# Báo cáo Closeout Step 5.1.2

## A. Executive summary
Hoàn tất việc triển khai Application Shell và Navigation. Kiến trúc mới phân tách rõ ràng Boundary Server/Client, bảo toàn hiệu suất và SEO từ các pha trước, đồng thời mang lại trải nghiệm điều hướng Mobile-first thân thiện, mượt mà và fully accessible.

## B. Step 5.0 inheritance
- **Route taxonomy:** Tuân thủ 100%, dùng các prefix path cho Khám phá, Lưu trú.
- **Bản đồ:** Tuyệt đối KHÔNG sử dụng Map (tránh lỗi chi phí/vi phạm contract). Nearby dùng `/gan-toi` tĩnh.
- **Auth:** Public không cần login. Action Tài khoản, Lưu yêu thích được làm các Entry link chuẩn.
- **SEO/canonical:** Không đụng chạm, giữ nguyên config.

## C. Step 5.1.1 inheritance
Sử dụng trọn vẹn: Design tokens (mountain green, earth brown), Typography (`.text-h3`, `.text-body-small`), Container (`.layout-container`), Focus, Z-index (`z-header`, `z-overlay`, `z-dialog`), Motion.

## D. Files created or updated
- `src/app/layout.tsx` (updated)
- `src/components/layout/site-shell.tsx` (new)
- `src/components/layout/site-header.tsx` (new)
- `src/components/layout/site-footer.tsx` (new)
- `src/components/brand/site-brand.tsx` (new)
- `src/components/navigation/navigation-config.ts` (new)
- `src/components/navigation/desktop-navigation.tsx` (new)
- `src/components/navigation/mobile-navigation.tsx` (new)
- `src/components/navigation/skip-link.tsx` (new)
- Tài liệu Step 5.1.2 (từ `07` đến `11`).

## E. Layout architecture
- **Root layout:** Server Component thuần tĩnh.
- **Site shell:** Đóng gói toàn bộ Header, SkipLink, `<main id="main-content">`, Footer.

## F. Navigation
- Public items: Khám phá, Lưu trú, Ăn uống, Cẩm nang, Gần tôi.
- Protected trigger items: Đã lưu, Tài khoản.
- Match behavior: Trang chủ exact match, các module khác prefix match.

## G. Mobile menu
- Overlay trượt (Drawer).
- Hỗ trợ đầy đủ phím `Esc` đóng menu, Scroll lock Body. Trả focus bằng Native React Button Handler.

## H. Accessibility
- Skip link hoạt động tại tab đầu tiên.
- Không có lỗi contrast, Focus state nổi bật bằng viền xanh (ring-ring).
- Landmark `<main>`, `<header>`, `<footer>` chuẩn ngữ nghĩa HTML5.

## I. Verification
- Typecheck: Pass.
- Lint: Pass.
- Production build: Pass.

## J. Dependencies
- No new runtime dependency added.

## K. Remaining items
- **Blocker Step 5.1.3:** Không có.
- **Deferred:** Logo Graphic (hiện đang dùng Text Wordmark tạm), Các thành phần UI Primitive cho Content.

## L. Scope compliance
- Không sửa backend, không map, không giả mạo dữ liệu hay fake hotline, không dùng từ "Cổng chính thức". Đảm bảo tuyệt đối ranh giới Client/Server.

## M. Final status
**STEP 5.1.2 — READY FOR USER ACCEPTANCE**
