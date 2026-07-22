# Step 5.0 — Frontend Contract & UX Blueprint Overview

**Mục tiêu:** Tài liệu này là tổng quan UX/API contract trước khi lập trình giao diện Phase 5 của Cổng thông tin Du lịch Hoàng Su Phì.

**Trạng thái:** `STEP 5.0 LOCKED — 2026-07-20`. Public catalog/contact/taxonomy đã được triển khai và user accepted closeout; DG-5.0-01 đến DG-5.0-04 đã được phê duyệt tại `23-step-5.0-approved-decisions.md`. Step tiếp theo được phép bắt đầu là 5.1 Design System & Frontend Foundation.

**Phạm vi:**
- Phân tích hiện trạng codebase Frontend & Backend (Phase 3-4 LOCKED).
- Thiết lập ma trận Route/Page và Page-to-API.
- Thiết kế Wireframe, Information Architecture và Render Strategy.
- Ghi nhận các quyết định kỹ thuật đã duyệt cho Auth, vị trí/Nearby/chỉ đường, Profile và Brand.
- Lập Backend Gap Register để đối chiếu các chức năng bị thiếu.
- Ghi nhận chính xác các public-read blocker; không che giấu bằng frontend composition.

**Quy tắc:**
- Không sửa backend codebase Phase 3-4.
- Các decision gate DG-5.0-01 đến DG-5.0-04 tuân theo `23-step-5.0-approved-decisions.md`.
- Step 5.0 chỉ là tài liệu kiến trúc.
- Không endpoint legacy nào được gọi từ public UI nếu nó không bảo đảm chỉ trả nội dung public/published và contract pagination phù hợp.

Danh sách các tài liệu trong thư mục này:
- 01-current-state-audit.md
- 02-visitor-experience-contract.md
- 03-route-page-matrix.md
- 04-page-api-matrix.md
- 05-information-architecture.md
- 06-wireframes.md
- 07-render-strategy.md
- 08-url-state-contract.md
- 09-typed-api-client-blueprint.md
- 10-auth-session-adr.md
- 11-map-provider-adr.md
- 12-profile-scope-decision.md
- 13-brand-assets-gate.md
- 14-backend-gap-register.md
- 15-ux-state-matrix.md
- 16-responsive-accessibility-blueprint.md
- 17-acceptance-journeys.md
- 18-step-5.0-closeout.md
- 19-review-remediation.md
- 20-public-read-controlled-unlock-contract.md
- 23-step-5.0-approved-decisions.md
