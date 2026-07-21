# Current State Audit

## 1. Mục đích

Xác thực contract thực tế trước khi Phase 5 gọi API. Kết quả code audit được ưu tiên hơn giả định trong blueprint.

## 2. Frontend đã có

- Next.js 15 App Router, Tailwind, Zod và redirect middleware Phase 4.6.
- SEO shells hiện hữu: `/`, `/cam-nang`, `/cam-nang/[slug]`, `/co-so/[slug]`, `/dia-diem/[slug]`, `/khu-vuc/[slug]`, `/tag/[slug]`, `/tien-ich/[slug]`, `/top/[slug]`, `/hoi-dap`.
- SEO projection dùng `GET /api/v1/seo/pages/...` với `cache: 'no-store'`; không được tự đổi các shell này sang ISR/revalidate mà không review Phase 4.4.
- Chưa có Design System, auth BFF, TanStack Query/Zustand hay public list UI. Phase 5 đã quyết định không dùng interactive map hoặc map provider.
- Root layout hiện để `<html lang="en">`; Step 5.1 phải đổi thành `vi` cùng metadata/layout thực tế.

## 3. Backend public contracts đã xác minh

| Capability | Contract thực tế | Trạng thái dùng cho Phase 5 |
| :--- | :--- | :--- |
| SEO projection | `/api/v1/seo/pages/:pageGroup/:slug`, FAQ hub riêng | READY cho SEO shell hiện hữu, `no-store` |
| Harvest | `GET /api/v1/harvest-status` và `/regions/:slug`, `Cache-Control: no-store` | READY |
| Search | `GET /api/v1/search`; signed opaque cursor, bắt buộc ít nhất một tiêu chí | READY |
| Nearby | `GET /api/v1/nearby`; bắt buộc `lat`, `lng`, opaque cursor | READY |
| Recommendation | `GET /api/v1/recommendations` | READY theo contract Phase 4.7 |
| Public reviews | `GET /api/v1/owners/:ownerType/:ownerId/reviews` | READY, không dùng `/reviews` protected |
| Favorites | `GET/POST/DELETE /api/v1/favorites...` có auth + permission | BFF approved; implementation chưa bắt đầu |
| Auth | Login/register/refresh, email verification và password recovery routes | BFF approved; browser không giữ token thô |
| Public catalog/reference/contact | `GET /api/v1/public/catalog/*`, `/references/*` | 🔒 ACCEPTED & LOCKED with Step 5.0 |

## 4. Findings bắt buộc sửa trong blueprint

1. Harvest public endpoint **không** có hậu tố `/public`.
2. Legacy CRUD endpoints cho Businesses, Places, Attractions, Regions và Articles dùng `page`/`limit` (offset), không phải opaque cursor.
3. Các legacy repository chỉ lọc `deleted_at`; chúng không tự ép public list/detail thành `active`/`published`. Frontend không thể biến endpoint đó thành public-safe bằng cách giấu dữ liệu trong UI.
4. Business DTO/schema hiện không có phone, Zalo URL hay contact URL. Không được tự suy diễn số điện thoại là Zalo.
5. Không có `/api/v1/auth/me`; `displayName` đăng ký hiện không được persist. Favorites vẫn có thể là scope riêng sau BFF, nhưng Profile không thể dựa vào API không tồn tại.
6. `businessTypeId`, category và region filter là UUID; hiện không có public reference contract để đổi các nhãn như “Homestay” thành ID. `featured=true` cho Regions cũng không tồn tại.

## 5. Kết luận

Search, Nearby, Harvest, SEO shell và public catalog/reference/contact là nền tảng hợp lệ. Public-catalog closeout đã được user accept và Step 5.0 LOCK; BFF được duyệt nhưng chưa triển khai, còn Profile giữ reduced scope. Xem `14-backend-gap-register.md`, `22-public-catalog-implementation-closeout.md` và `23-step-5.0-approved-decisions.md`.
