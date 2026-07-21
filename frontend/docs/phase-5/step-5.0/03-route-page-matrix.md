# Route & Page Matrix

Ma trận này dùng canonical route đã tồn tại; không tạo `/faq`, `/the/[slug]` hay `/homestay` trùng lặp.

| Route | Intent | Render | Primary contract | Priority | Trạng thái chính xác |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Khám phá theo mùa | Server-first | Harvest + public-safe composition | P0 | DATA CONTRACT LOCKED — UI chưa triển khai |
| `/co-so` | Danh sách cơ sở | Server-first | Public business read projection | P0 | DATA CONTRACT LOCKED — UI chưa triển khai |
| `/co-so/[slug]` | Chi tiết cơ sở | Existing SEO shell | SEO projection + public catalog/contact | P0 | IMPLEMENTED DATA — Call/Zalo/Chỉ đường theo DTO hợp lệ |
| `/dia-diem` | Danh sách điểm đến | Server-first | Public place read projection | P0 | DATA CONTRACT LOCKED — UI chưa triển khai |
| `/dia-diem/[slug]` | Chi tiết điểm đến | Existing SEO shell | SEO projection | P0 | PARTIAL |
| `/khu-vuc` | Khám phá khu vực | Server-first | Public region read projection | P1 | DATA CONTRACT LOCKED — UI chưa triển khai |
| `/khu-vuc/[slug]` | Chi tiết khu vực | Existing SEO shell | SEO projection + Harvest timeline | P0 | PARTIAL |
| `/cam-nang` | Archive cẩm nang | Server-first | Public article read projection | P1 | DATA CONTRACT LOCKED — UI chưa triển khai |
| `/cam-nang/[slug]` | Đọc cẩm nang | Existing SEO shell | SEO projection | P1 | PARTIAL |
| `/tim-kiem` | Search/filter | SSR + client island | `GET /api/v1/search` | P0 | READY — phải có ít nhất một search criterion |
| `/tien-ich` | Archive tiện ích | Server-first | Public attraction/utility projection | P1 | DATA CONTRACT LOCKED — UI chưa triển khai |
| `/tien-ich/[slug]` | Chi tiết tiện ích | Existing SEO shell | SEO projection | P1 | PARTIAL |
| `/tinh-trang-mua-vu` | Harvest current/timeline | Server-first | `GET /api/v1/harvest-status` | P0 | READY |
| `/hoi-dap` | FAQ Hub | Existing SEO shell | FAQ SEO projection | P2 | PARTIAL |
| `/tag/[slug]` | Tag archive | Existing SEO shell | Tag SEO projection; public archive projection | P1 | PARTIAL — tag metadata không phải cross-entity archive |
| `/top/[slug]` | Top list | Existing SEO shell | Top-list SEO projection | P1 | PARTIAL — CRUD endpoint chỉ nhận `:id` |
| `/dang-nhap`, `/dang-ky` | Auth entry | Client form → BFF | Login/register | P2 | AUTHORIZED — BFF implementation chưa bắt đầu |
| `/xac-minh-email` | Confirm email | Client form → BFF | `/auth/email-verification/confirm` | P2 | AUTHORIZED — theo allowlist BFF |
| `/quen-mat-khau`, `/dat-lai-mat-khau` | Password recovery | Client form → BFF | `/auth/password/forgot`, `/auth/password/reset` | P2 | AUTHORIZED — theo allowlist BFF |
| `/yeu-thich` | Favorites | Protected | `/favorites` through BFF | P2 | AUTHORIZED — no `/auth/me` required |
| `/tai-khoan` | Tài khoản cơ bản | Protected | API/permission hiện hữu | P3 | REDUCED SCOPE — không có profile nâng cao |

**Taxonomy (DG-5.0-05):** `/co-so` remains the only Business archive. Public reference contract đã resolve nhãn sang ID/slug; không tạo route trùng lặp.
