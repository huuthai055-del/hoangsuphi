# Step 5.0 Review Remediation — 2026-07-20

## Phạm vi review

Đối chiếu bộ blueprint Step 5.0 với frontend/backend hiện hữu và tài liệu nền của dự án. Không sửa source code, schema, dependency hay module Phase 3–4 đang LOCKED.

## Findings đã sửa trong blueprint

| Finding | Điều chỉnh |
| --- | --- |
| Harvest được ghi sai là `/harvest-status/public` | Dùng `/api/v1/harvest-status` và `/api/v1/harvest-status/regions/:slug`. |
| Auth route và `/auth/me` bị suy diễn | Dùng các route xác minh; bỏ giả định `/auth/me` và profile token-driven. |
| Public review, tag/FAQ/top-list route sai | Dùng public owner review và canonical `/tag/[slug]`, `/hoi-dap`, `/top/[slug]`. |
| Tất cả list bị coi là cursor | Tách Search/Nearby opaque cursor khỏi legacy CRUD offset; legacy không được dùng cho public UI. |
| ISR/revalidate được đề xuất cho SEO/Harvest | Giữ `no-store` theo contract Phase 4. |
| Phone có thể thay cho Zalo | Cấm suy diễn; CTA chỉ render từ dữ liệu contact xác minh. |
| Mapbox được coi là đã chốt | Đã thay bằng quyết định không dùng interactive map/SDK/tile; chỉ giữ Nearby list và Google Maps directions. |

## Blocker vẫn còn

- GAP-01, GAP-02 và GAP-03 đã được implement/verify, user accepted và LOCK cùng Step 5.0.

Ba gap này phải được xử lý bằng controlled unlock additive hoặc bằng scope exception do người dùng phê duyệt. Frontend filtering, hardcode ID/slug hoặc che nội dung sau khi fetch không phải phương án an toàn.

## Quyết định đang chờ

- DG-5.0-06: **APPROVED** — controlled unlock additive GAP-01–03; chi tiết contract tại `20-public-read-controlled-unlock-contract.md`.
- DG-5.0-01: APPROVED — không interactive map; Nearby list + Google Maps directions.
- DG-5.0-02: APPROVED — BFF + HttpOnly refresh cookie.
- DG-5.0-03: APPROVED — Profile reduced scope.
- DG-5.0-04: APPROVED — brand direction level.

**Kết luận:** Blueprint đã được nâng cấp để phản ánh code thật, nhưng Step 5.0 chưa được phê duyệt/đóng.
