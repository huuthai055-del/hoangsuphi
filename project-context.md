<!--
╔══════════════════════════════════════════════════════════════════════════════╗
║                        MANDATORY READING PROTOCOL                            ║
║                                                                              ║
║  Đây là NGUỒN THÔNG TIN DUY NHẤT (Single Source of Truth) của dự án.        ║
║                                                                              ║
║  📌 QUY ĐỊNH BẮT BUỘC cho mọi AI Agent:                                     ║
║    1. ĐỌC TOÀN BỘ file này TRƯỚC KHI thực hiện bất kỳ công việc nào.        ║
║    2. THAM CHIẾU file này khi ra mọi quyết định kỹ thuật.                   ║
║    3. CẬP NHẬT file này SAU MỖI phiên làm việc (session).                   ║
║    4. KHÔNG ĐƯỢC XÓA lịch sử — chỉ được BỔ SUNG hoặc CẬP NHẬT trạng thái. ║
║    5. Nếu thông tin file này MÂU THUẪN với tài liệu khác → ƯU TIÊN file này.║
╚══════════════════════════════════════════════════════════════════════════════╝
-->

# 📋 PROJECT CONTEXT — CỔNG THÔNG TIN DU LỊCH HOÀNG SU PHÌ
 
> **Cập nhật lần cuối:** 2026-07-20 | **Phiên:** #051 | **Trạng thái:** 🔒 Step 5.0 LOCKED — controlled unlock GAP-01–03 accepted; DG-5.0-01–04 approved. Step 5.1 là công việc kế tiếp. Phase 4 MVP code baseline ngoài scope vẫn LOCKED; Phase 4.5 production Resend activation pending domain/DNS.
 
---
 
## 1. PROJECT INFORMATION
 
| Thuộc tính | Giá trị |
| :--- | :--- |
| **Tên dự án** | Cổng thông tin Du lịch Hoàng Su Phì |
| **Domain mục tiêu** | `hoangsuphi.vn` (dự kiến) |
| **Tagline** | Cổng thông tin du lịch số 1 về Hoàng Su Phì, Hà Giang |
| **Loại sản phẩm** | Content-driven Travel Information Portal |
| **Ngôn ngữ chính** | Tiếng Việt (Ưu tiên) — Hỗ trợ: EN, ZH, KO, JA (Phase sau) |
| **Thị trường mục tiêu** | Du khách nội địa Việt Nam + khách nước ngoài (backpacker) |
| **Tạo dự án** | 2026-07-06 |
| **Trạng thái hiện tại** | 🔒 Phase 5 Step 5.0 đã LOCK: GAP-01 public catalog, GAP-03 reference, GAP-02 contact projection đã accepted; DG-5.0-01–04 approved. UI chưa bắt đầu; Step kế tiếp là 5.1 Design System & Frontend Foundation. 🔒 Phase 4.1–4.8 MVP code baseline ngoài scope unlock vẫn LOCKED; Step 4.5.6 chỉ kích hoạt Resend production sau khi có domain và xác minh DNS/sender. |

### Mục tiêu chiến lược

> **KHÔNG** xây dựng nền tảng đặt phòng OTA (cạnh tranh với Booking.com, Agoda).
> **THAY VÀO ĐÓ:** Trở thành cổng thông tin nội dung bản địa sâu sắc nhất về Hoàng Su Phì — dẫn dắt người dùng từ **tìm kiếm Google → đọc nội dung chất lượng → liên hệ trực tiếp** với chủ homestay/nhà hàng.

**Lợi thế cạnh tranh cốt lõi:**
- Nội dung bản địa độc quyền (theo mùa lúa, theo xã, theo dân tộc)
- SEO cấu trúc bài bản với Schema.org đầy đủ
- Vị trí, Nearby và chỉ đường cho tiện ích hành trình thực tế (ATM, xăng, WC, sóng điện thoại); không dùng interactive map trong Phase 5
- Không chạy OTA → Chủ homestay được lợi nhiều hơn

### Phạm vi (Scope)

```
Phase 1 (Hiện tại): Hoàng Su Phì — Hà Giang
Phase 2 (2027):     Toàn tỉnh Hà Giang (Đồng Văn, Mèo Vạc, Tây Côn Lĩnh...)
Phase 3 (2028+):    Tây Bắc → Toàn quốc Việt Nam
```

---

## 2. TECH STACK

### Frontend
| Hạng mục | Công nghệ | Ghi chú |
| :--- | :--- | :--- |
| Framework | Next.js 15 (App Router) | SSR + SSG tối ưu SEO |
| Language | TypeScript (strict mode) | |
| Styling | Tailwind CSS | |
| UI Components | shadcn/ui | Accessible, customizable |
| Vị trí/Nearby | Public coordinates + `GET /api/v1/nearby` + Google Maps directions URL | Phase 5 không dùng Mapbox/Leaflet/Google Maps JS/tile hoặc `/ban-do` |
| Rich Text | Tiptap | CMS nội bộ |
| State | Zustand | |
| Data Fetching | TanStack Query | Cache + Server State |

### Backend
| Hạng mục | Công nghệ | Ghi chú |
| :--- | :--- | :--- |
| Runtime | Node.js 22 LTS | |
| Framework | Hono.js | Nhẹ, edge-ready |
| API Style | REST API (Phase 1) | GraphQL xem xét Phase 3 |
| Auth | JWT (Access + Refresh Token) | Stateless |
| Validation | Zod | Runtime type check |
| Queue | BullMQ + Redis | Async jobs |
| Email | Resend | Transactional email |

### Database & Storage
| Công nghệ | Vai trò |
| :--- | :--- |
| PostgreSQL 17 | CSDL chính (OLTP) |
| PostGIS | Spatial — bản đồ, khoảng cách |
| ltree Extension | Cây địa giới hành chính |
| Redis 8 | Cache, Rate Limit, Session, Queue |
| Cloudinary | Production Object Storage — media; LOCAL chỉ legacy/development/test |
| ClickHouse | OLAP Analytics |
| Typesense | Full-text + Vector Search |

### Infrastructure
| Công nghệ | Vai trò |
| :--- | :--- |
| Cloudflare | CDN, WAF, DNS |
| PgBouncer | PostgreSQL Connection Pool |
| Debezium (CDC) | PG → Typesense/ClickHouse sync |
| Docker | Containerization |
| GitHub Actions | CI/CD |
| Sentry | Error monitoring |

---

## 3. SYSTEM ARCHITECTURE

```
[User] → Cloudflare CDN/WAF
               ↓ Cache miss
         Load Balancer
         ↙           ↘
   API Server 1    API Server 2
         ↓               ↓
    PgBouncer Pool
    ↙            ↘
PG Primary      PG Read Replica(s)
(Write)         (SELECT)
    |
    ↓ WAL / CDC (Debezium)
┌───┴────┐
Typesense  ClickHouse
(Search)   (Analytics)

Redis ←→ API Servers (Cache / Queue / Rate Limit)
Cloudinary ← API Servers (Media upload production)
```

### Phân tầng dữ liệu

| Tầng | Công nghệ | Loại dữ liệu |
| :--- | :--- | :--- |
| OLTP | PostgreSQL | Nghiệp vụ chính |
| Cache | Redis | Hot data, Session |
| Search | Typesense | Full-text + Vector |
| OLAP | ClickHouse | Analytics append-only |
| Media | Cloudinary production; LOCAL legacy/development/test | Binary files |

---

## 4. CODING STANDARDS

### Nguyên tắc chung
- **Language:** TypeScript strict mode bắt buộc
- **Naming (code):** camelCase (biến/hàm), PascalCase (class/type/component), SCREAMING_SNAKE_CASE (constant)
- **Naming (DB):** `snake_case` cho tất cả tên bảng, cột, index
- **UUID:** UUIDv7 cho tất cả Primary Key (time-ordered)
- **Timestamp:** `TIMESTAMPTZ` (UTC) trong PostgreSQL
- **Soft Delete:** Tất cả bảng domain phải có `deleted_at TIMESTAMPTZ NULL`
- **Audit:** Mọi thay đổi nghiệp vụ phải ghi vào `audit_logs`
- **Identity Module Domain Convention:** Đối với các Entity cốt lõi hoặc nhạy cảm về bảo mật (như `User`), bắt buộc sử dụng `UserProps` interface, `private constructor`, `static create` và `rehydrate` factories, triệt tiêu lặp code cập nhật thời gian bằng helper `touch()`, bảo vệ trạng thái tuyệt đối (encapsulate properties, no public setters).


### Git Workflow
```
main           ← Production (protected)
  └── develop  ← Integration branch
        ├── feature/[ticket-id]-[description]
        ├── fix/[ticket-id]-[description]
        └── hotfix/[ticket-id]-[description]
```

### Commit Message
```
type(scope): short description

type:  feat | fix | docs | style | refactor | test | chore | db
scope: api | db | frontend | infra | auth | search | media
```

### API Rules
- Response format: `{ data, meta, error }`
- Pagination: cursor-based (không dùng offset)
- Rate limiting: 60 req/min (anon), 300 req/min (auth)
- Versioning: `/api/v1/...` từ đầu
- Không dùng `SELECT *` trong production

### Security Rules
- Không commit secret vào git — dùng `.env` / Secret Manager
- API Key lưu dạng `SHA256 hash`
- Input validation bắt buộc ở tầng API (Zod)
- SQL phải dùng parameterized query

---

## 5. DATABASE STATUS

> **Chi tiết đầy đủ:** Xem `02_database_design.md`

**Phiên bản hiện tại: V5 (Enterprise)** — Cập nhật: 2026-07-06

| Nhóm bảng | Số bảng | Trạng thái |
| :--- | :--- | :--- |
| Core Domain | 16 | ✅ Hoàn chỉnh |
| Media & Assets | 2 | ✅ Hoàn chỉnh |
| User & Engagement | 6 | ✅ Hoàn chỉnh |
| Business Features | 5 | ✅ Hoàn chỉnh |
| SEO & Discovery | 7 | ✅ Hoàn chỉnh |
| Access Control | 5 | ✅ Hoàn chỉnh |
| Operational | 7 | ✅ Hoàn chỉnh |
| **Tổng** | **~48** | ✅ V5 hoàn chỉnh |

**Quyết định thiết kế nổi bật:**

| Quyết định | Chi tiết |
| :--- | :--- |
| `regions.path` dùng `ltree` | Nhanh hơn `WITH RECURSIVE` 10-100x |
| `business_types` Reference Table | Thay `VARCHAR` hardcode — mở rộng tự do |
| Media ownership | `media.owner_type` + `media.owner_id`; `media_links` không được triển khai trong Phase 4.3 |
| `reviews` + `favorites` Polymorphic | `entity_type` + `entity_id` — dễ mở rộng |
| `amenities` chuẩn hóa | Thay JSONB — hỗ trợ filter/search |
| Scoped Media SHA-256 dedup | `(uploaded_by, hash)` cho active unbound media; không dùng global hash-only dedup |

**Migration Status:**

| Môi trường | Trạng thái |
| :--- | :--- |
| Local Dev | ⬜ Chưa bắt đầu |
| Staging | ⬜ Chưa bắt đầu |
| Production | ⬜ Chưa bắt đầu |

---

## 6. API STATUS

> **Trạng thái tổng thể:** Phase 3 core APIs 🔒 LOCKED; Phase 4.1 Search, Phase 4.2 Nearby Search, Phase 4.3 Media Upload và Phase 4.4 SEO 🔒 LOCKED

| Endpoint | Priority | Trạng thái |
| :--- | :--- | :--- |
| `GET /api/v1/businesses` | P1 | ⬜ |
| `GET /api/v1/businesses/:slug` | P1 | ⬜ |
| `GET /api/v1/attractions` | P1 | 🔒 Locked |
| `GET /api/v1/articles` | P1 | ⬜ |
| `GET /api/v1/articles/:slug` | P1 | ⬜ |
| `GET /api/v1/regions` | P1 | ⬜ |
| `GET /api/v1/search` | P1 | 🔒 Locked — Phase 4.1 |
| `GET /api/v1/nearby` | P1 | 🔒 Locked — Phase 4.2 |
| `GET /api/v1/faqs` | P2 | ⬜ |
| `GET /api/v1/tags` | P2 | ⬜ |
| `POST /api/v1/reviews` | P2 | ⬜ |
| `POST /api/v1/auth/login` | P2 | ⬜ |
| `POST /api/v1/media/upload` | P2 | ⬜ |

---

## 7. COMPLETED FEATURES

| # | Tính năng / Tài liệu | Phiên | Trạng thái |
| :--- | :--- | :--- | :--- |
| 1 | PRD V1 — Sitemap + URL Structure + Entity Model | #001 | ✅ |
| 2 | PRD V2 — Feedback review, bỏ B2B Phase 1 | #001 | ✅ |
| 3 | PRD V3 (Final) — SEO Schema.org, CMS Workflow, Media Entity, FAQ Hub, Tag System | #001 | ✅ |
| 4 | DB Design V4 — 24+ bảng, PostGIS, FTS, RBAC, Audit, Redirect | #001 | ✅ |
| 5 | DB Design V5 (Enterprise) — ltree, Ref Tables, Polymorphic, EXIF, Amenities, Index/Partition/RLS/Migration | #002 | ✅ |
| 6 | `project-context.md` — Single Source of Truth | #002 | ✅ |
| 7 | `project-roadmap.md` — Roadmap 14 phases đầy đủ điều kiện hoàn thành | #002 | ✅ |
| 8 | Regions Module — Integration, Transaction Fix & Locked | #006 | ✅ |
| 9 | Tourist Places Module — Domain, Repo, Service, DTO, Controller, Route, Tests & Locked | #007 | ✅ |
| 10 | Businesses & Amenities Module — Schema, Domain, Repo, Service, DTO, Controller, Route, Tests & Locked | #008 | ✅ |
| 11 | Attractions & Utilities Module — Domain, Repo, Service, DTO, Controller, Route, Tests & Locked | #009 | ✅ |
| 12 | Identity & Access Control Architecture Design Document | #010 | ✅ |
| 13 | Identity & Access Control Module — Domain, Repositories, Services, API Endpoints, Middleware, 100% Tests & Locked | #013 | ✅ |
| 14 | Articles & Tags Module — Domain, Repositories, Services, DTOs, Controllers, Routes, Tests & Locked | #015 | ✅ |
| 15 | Weather, Notifications, Itineraries, FAQs & Top Lists Modules — Domain, Repositories, Services, DTOs, Controllers, Routes, DI Container, Integration Tests & Locked | #017 | ✅ |
| 16 | Phase 4.4 SEO — Backend Foundation, Sitemap, Robots, Next.js minimal shell & SSR metadata | #040 | 🔒 LOCKED |
| 17 | Step 4.5.2 Verify Email — token security, Redis rate limits/idempotency, resend/confirm API và PostgreSQL/Redis integration verification | #041 | 🔒 LOCKED |
| 18 | Phase 4.5 Email — Verify Email, Forgot/Reset Password, Contact Form, FakeEmailSender, Redis/PostgreSQL verification | #042 | ✅ CODE COMPLETE — production Resend activation pending domain |
| 19 | Phase 4.6 Redirect Management — registry/resolver, Redis cache, Next.js execution và end-to-end verification | #043 | 🔒 LOCKED |
| 20 | Phase 4.7 Recommendation — SQL/PostGIS public read model, signed cursor, visibility và no-leak verification | #044 | 🔒 LOCKED |
| 21 | Phase 4.8 Live Harvest Status — admin lifecycle, public current/timeline, Media-safe projection và PostgreSQL verification | #045 | 🔒 LOCKED |
| 22 | Phase 4 final re-audit — backend/frontend regression, exception register và umbrella closeout | #045 | 🔒 MVP CODE BASELINE LOCKED |
| 23 | Phase 5 Frontend roadmap — Steps 5.0–5.7, decision gates, scope exclusions và Definition of Done | #046 | 📋 PLANNED — NOT IMPLEMENTED |
| 24 | Step 5.0 audit/remediation — xác minh contract frontend/backend, sửa blueprint và register public-read/contact blockers | #047 | 🟡 REMEDIATED DRAFT — BLOCKED PENDING DECISION |
| 25 | Controlled unlock GAP-01–03 — public catalog, contact projection, taxonomy reference contract | #048 | ✅ AUTHORIZED — IMPLEMENTATION NOT STARTED |
| 26 | Controlled unlock GAP-01–03 implementation — public catalog routes/read model, contact migration và PostgreSQL verification | #049 | 🔒 ACCEPTED & LOCKED via Step 5.0 |
| 27 | Step 5.0 official decisions — Nearby/directions không interactive map, BFF security, reduced Profile, brand direction | #050 | 🔒 DG-5.0-01–04 APPROVED & LOCKED |
| 28 | Step 5.0 final acceptance and lock | #051 | 🔒 LOCKED — Step 5.1 authorized |

---

## 8. CURRENT TASK

> **Phiên #051 — 2026-07-20 (STEP 5.0 FINAL ACCEPTANCE & LOCK)**

- [x] User accept public-catalog closeout GAP-01 → GAP-03 → GAP-02.
- [x] Xác nhận DG-5.0-01–04 đã approved và mọi điều kiện đóng Step 5.0 đã đạt.
- [x] LOCK Step 5.0, public-catalog controlled unlock và blueprint liên quan.
- [x] Không thay đổi source code, schema, dependency hoặc module Phase 3–4 đã LOCKED.
- [ ] Step 5.1 Design System & Frontend Foundation chưa bắt đầu.

---

## 9. NEXT TASKS

### 🔴 Ưu tiên cao (làm ngay)

| # | Nhiệm vụ | Phụ thuộc |
| :--- | :--- | :--- |
| N1 | Step 5.1 Design System & Frontend Foundation | Step 5.0 đã LOCK; dùng brand direction approved và không thêm map SDK |
| N2 | Step 4.5.6 Resend Production Activation | Domain `hoangsuphi.vn` được mua, DNS và sender domain được xác minh |

### 🟡 Ưu tiên trung bình (sau khi Phase 5 được duyệt)

| # | Nhiệm vụ | Phụ thuộc |
| :--- | :--- | :--- |
| N6 | Step 5.2 Homepage & Global Navigation | Step 5.1 hoàn thành; Public API Phase 4.8 giữ nguyên LOCKED contract |
| N7 | Tích hợp UI Harvest Status trong Step 5.2 | Step 5.1 hoàn thành; Public API Phase 4.8 giữ nguyên LOCKED contract |

### 🟢 Ưu tiên thấp (Phase 2)

| # | Nhiệm vụ |
| :--- | :--- |
| N11 | Search engine chuyên dụng/Vector Search chỉ xem xét ở phase mở rộng sau bằng chứng production |
| N12 | Đa ngôn ngữ i18n (EN, ZH) |
| N13 | Business Claim Request flow |
| N14 | Mở rộng sang tỉnh Hà Giang |
| N15 | Mobile App (React Native) |

---

## 10. PENDING ISSUES

> Vấn đề chưa giải quyết, cần quyết định trước khi implement.

| ID | Vấn đề | Mức độ | Trạng thái |
| :--- | :--- | :--- | :--- |
| I1 | Hosting: Vercel + VPS riêng hay Full VPS? | 🔴 Cao | ⬜ Chờ quyết định |
| I2 | Domain `hoangsuphi.vn` đã đăng ký chưa? | 🔴 Cao | ⬜ Chờ xác nhận |
| I3 | Media Storage: Cloudinary (có phí) hay S3 self-managed? | 🟢 | ✅ Chọn Cloudinary cho production Phase 4.3; LOCAL chỉ legacy/development/test |
| I4 | Analytics: GA4 + ClickHouse hay chỉ GA4? | 🟡 TB | ⬜ Chờ quyết định |
| I5 | Vị trí/Nearby/Chỉ đường | 🟡 TB | ✅ DG-5.0-01: không interactive map; Nearby list + Google Maps deep link |
| I6 | CMS: Tự xây Admin hay dùng Payload CMS / Directus? | 🟡 TB | ⬜ Chờ quyết định |
| I7 | Profile frontend cần `/auth/me`/profile update; `displayName` đăng ký hiện chưa được persist | 🔴 Cao | ✅ DG-5.0-03: reduced scope, không controlled unlock Profile trong Phase 5 |
| I8 | Legacy public Business/Place/Attraction/Article list/detail không bảo đảm published/active và dùng offset pagination | 🔴 Nghiêm trọng | ✅ GAP-01 additive public-catalog implemented/verified; legacy route giữ nguyên |
| I9 | DTO public hiện không có phone/Zalo contact contract và reference taxonomy cho filter theo nhãn | 🔴 Cao | ✅ GAP-02/03 contact/reference projection implemented/verified |

---

## 11. TECHNICAL DECISIONS

> Log quyết định kỹ thuật quan trọng. **Không được xóa.**

| ID | Ngày | Quyết định | Lý do |
| :--- | :--- | :--- | :--- |
| D1 | 2026-07-06 | Không làm OTA đặt phòng | Content portal có lợi thế bản địa — không thể cạnh tranh Booking/Agoda |
| D2 | 2026-07-06 | `ltree` cho `regions.path` | `WITH RECURSIVE` chậm; ltree + GIST index cực nhanh |
| D3 | 2026-07-06 | UUIDv7 cho tất cả PK | UUIDv4 gây B-Tree fragmentation; UUIDv7 time-ordered |
| D4 | 2026-07-06 | Polymorphic design cho `media_links`, `reviews`, `favorites` | Quyết định Media đã bị D23 thay thế; reviews/favorites giữ thiết kế polymorphic. |
| D5 | 2026-07-06 | Reference Tables cho `business_types`, `attraction_categories` | VARCHAR hardcode không mở rộng được |
| D6 | 2026-07-06 | Bỏ B2B Portal ở Phase 1 | Chưa có traffic; focus content trước |
| D7 | 2026-07-06 | ClickHouse cho Analytics | OLAP scan sẽ giết hiệu năng OLTP nếu chạy chung PostgreSQL |
| D8 | 2026-07-06 | Debezium CDC thay sync thủ công | Đáng tin cậy hơn, không bị missed update khi API fail |
| D9 | 2026-07-09 | Single-DB-trip In-Memory authorization architecture | Tránh query DB liên tục trong các middleware phân quyền bằng cách load song song permissions tại authMiddleware và lưu vào Hono context |
| D10 | 2026-07-09 | Bỏ hoàn toàn vai trò của Role Repository và RBAC database layer | Chỉ tuân thủ kiến trúc phân quyền dựa trên quyền hạn (PBAC), bỏ Role queries, giảm thiểu bảng user_roles |
| D11 | 2026-07-13 | Composition Root / DI Container (`container.ts`) | Tách biệt hoàn toàn việc khởi tạo giữa các Router và Repository/Service/Middleware, hỗ trợ cơ chế ghi đè (override registry) sạch khi kiểm thử tích hợp (integration tests) mà không gây rò rỉ bộ nhớ hoặc sửa đổi mã nguồn production. |
| D12 | 2026-07-14 | Enforced Article Owner Check & Authorization checks | Chặn đứng lỗ hổng bảo mật IDOR thông qua đối chiếu bắt buộc quyền sở hữu bài viết (article.authorId === caller.id hoặc Admin) trong toàn bộ các mutation của Articles. |
| D13 | 2026-07-14 | Cấu trúc lại AuthService.register() tuân thủ repository pattern | Chuyển đổi logic truy vấn vai trò người dùng vào IUserRepository.findRoleByCode(), loại bỏ hoàn toàn việc import Schema DB ở Service, chặn đứng race condition bằng cách đối chiếu vai trò viewer được seed sẵn. |
| D14 | 2026-07-14 | Search là read-only module độc lập | `SearchController → SearchService → ISearchRepository → PostgreSQL`; không hydrate Domain Entity hoặc gọi Service/Repository Phase 3. |
| D15 | 2026-07-14 | Stored/generated `tsvector` chỉ được duyệt cho benchmark prototype | Production migration chưa được phép cho tới khi performance, write/WAL/rewrite/lock/autovacuum và rollout gates đạt. |
| D16 | 2026-07-14 | Exact per-entity top-K benchmark là NO-GO production | Correctness/deep keyset đạt, nhưng common/multi-term/phrase/operator vẫn vượt SLA; production ranking/cursor/query shape giữ nguyên. |
| D17 | 2026-07-14 | Chấp nhận ngoại lệ SLA `<100 ms`; hoãn lock Phase 4.1 | Người dùng yêu cầu hoàn tất Price, thumbnail, production decisions, integration tests và full benchmarks trước khi khóa. |
| D18 | 2026-07-15 | Price dùng current range nullable trên Business, currency VND | `numeric(12,2)`, cả hai cận cùng null/cùng có giá trị; interval-overlap filter; exact decimal keyset; migration additive 0014. |
| D19 | 2026-07-15 | Sửa Phase 3 Media schema drift trong migration 0014 | `media.uploaded_by` đã được schema/code ownership checks sử dụng nhưng thiếu trong migration/catalog; thêm nullable column là bản sửa additive tối thiểu đã được người dùng duyệt. |
| D20 | 2026-07-15 | LOCK Phase 4.1 với một SLA exception được ghi nhận | Mọi contract, Price, thumbnail, production decision, benchmark, integration và final audit gate đã đóng; `<100 ms` vẫn không đạt và không được đánh dấu pass. |
| D21 | 2026-07-16 | Nearby là read-only PostGIS projection độc lập | Dùng `ST_DWithin`/`ST_Distance`, `UNION ALL`, LATERAL rating, HMAC keyset cursor; không hydrate Domain Entity hoặc sửa Domain Service Phase 3. |
| D22 | 2026-07-16 | Nearby operational performance target | Warm DB p95 < 150 ms cho bán kính đến 25 km, limit 20, tối thiểu 30 mẫu trên dataset MVP đại diện; đây không phải public network-latency promise. Closeout đạt 89,47 ms. |
| D23 | 2026-07-17 | Media dùng owner pair trên bảng `media`; không tạo `media_links` | Phase 4.3 giữ `media.owner_type` + `media.owner_id` là nguồn dữ liệu chính; upload mới bắt đầu unbound và dedup theo uploader/hash. |
| D24 | 2026-07-17 | LOCK Phase 4.3 với Cloudinary production adapter | Expanded smoke bằng dedicated `CLOUDINARY_TEST_*` đạt upload/verify/download/decode/delete cho master + 3 variants, 25 assertions và 0 asset còn lại; mọi final gate đạt. |
| D25 | 2026-07-20 | GAP-01 → GAP-03 → GAP-02 public catalog controlled unlock implement/verify | Route additive/read-only, HMAC cursor, public eligibility, reference/contact projection; user accepted closeout and Step 5.0 LOCKED. |
| D26 | 2026-07-20 | Không dùng interactive map trong Phase 5 | Không Mapbox/Leaflet/Google Maps JS/tile hoặc `/ban-do`; dùng coordinates, Nearby distance list, fallback điểm gốc và Google Maps directions deep link. |
| D27 | 2026-07-20 | Auth qua Next.js BFF/Route Handler | Refresh cookie HttpOnly, production Secure + SameSite phù hợp, không localStorage/browser bearer; public pages không yêu cầu login. |
| D28 | 2026-07-20 | Profile Phase 5 reduced scope | Không `/auth/me` giả lập hay profile nâng cao; chỉ account feature được backend/API/permission hiện hữu hỗ trợ. |
| D29 | 2026-07-20 | Brand direction Phase 5 | Xanh núi, vàng lúa, nâu đất, nền kem; authentic/mobile-first/ít animation; asset chính thức hoàn thiện trước Phase 10/11. |
| D30 | 2026-07-20 | LOCK Step 5.0 Frontend Contract & UX Blueprint | User acceptance xác nhận public-catalog closeout và bốn gate; Step 5.1 được phép bắt đầu mà không thay đổi các contract đã khóa. |

---

## 12. DEVELOPMENT RULES

> Quy tắc bất di bất dịch. Mọi AI Agent và Developer phải tuân thủ.

### Database
1. Tất cả bảng domain phải có `deleted_at TIMESTAMPTZ NULL` (Soft Delete)
2. Không dùng SERIAL/AUTO_INCREMENT — luôn dùng UUIDv7
3. Migration không xóa cột/bảng ngay — phải theo Zero-Downtime 6 bước (xem `02_database_design.md` §9)
4. Mọi thay đổi nghiệp vụ phải ghi vào `audit_logs`
5. Index bắt buộc cho tất cả FK và cột filter thường xuyên

### API
1. Không trả raw DB data — luôn qua serializer/transformer
2. Không dùng `SELECT *` trong production
3. Pagination bắt buộc cho list endpoint (cursor-based, max 50/page)
4. Rate limiting bắt buộc
5. Không lộ stack trace ra client

### Content / SEO
1. Mọi bài viết phải có SEO metadata đầy đủ (title, description, OG tags)
2. Mọi ảnh phải có `alt` tag (bắt buộc)
3. Mọi trang entity phải có Schema.org JSON-LD
4. Slug không được thay đổi sau khi publish — dùng `redirects` nếu cần

### Security
1. Không commit `.env` hay secret vào git
2. Mọi input từ user phải qua Zod validation
3. SQL phải dùng parameterized query
4. File upload phải validate MIME type và kích thước

### Module Locking & Interface Boundaries (Phase 3 🔒 Locked)
1. **Tuyệt đối không chỉnh sửa Phase 3**: Trừ khi phát hiện lỗi nghiêm trọng ảnh hưởng trực tiếp đến môi trường Production hoặc phát hiện lỗ hổng bảo mật nghiêm trọng cần vá khẩn cấp.
2. **Nguyên tắc giao tiếp qua Interface/Public API**: Khi triển khai các tính năng nâng cao ở Phase 4, bắt buộc chỉ sử dụng và gọi các API công khai và interface xuất khẩu của các module Phase 3. Tuyệt đối không truy cập hay chỉnh sửa trực tiếp vào logic triển khai (implementation details) bên trong các module đã khóa, nhằm giảm thiểu rủi ro làm hỏng nền tảng khi phát triển các tính năng tiếp theo.

---

## 13. SESSION HISTORY

> Log tóm tắt mỗi phiên làm việc. **Không được xóa.**

---

### 📅 Phiên #001 — 2026-07-06 (Sáng/Chiều)

**Việc đã làm:**
- Thiết kế Sitemap toàn diện (15+ mục, 50+ sub-mục)
- Thiết kế URL chuẩn SEO + Tag System
- Thiết kế Entity Data Model (TypeScript interface)
- Thiết kế hệ thống tìm kiếm (Full-text + AI Vector roadmap)
- Thiết kế UI/UX chi tiết từng trang
- Thiết kế SEO Schema.org (LocalBusiness, BlogPosting, FAQPage)
- Hoàn thiện PRD V3 (Final)
- Thiết kế Database Architecture V4 (~24 bảng)
- Nhận expert feedback (19 điểm cải tiến) từ user

**File đã tạo/sửa:** `PRD_IA_HoangSuPhi.md` (V3), `02_database_design.md` (V4)

**Đánh giá:** PRD 9.7/10, DB V4 9.3-9.5/10

---

### 📅 Phiên #002 — 2026-07-06 (Tối — 23:59 ICT)

**Việc đã làm:**
- Tích hợp 19 cải tiến từ expert feedback vào DB Design V5:
  - Reference Tables: `business_types`, `attraction_categories`
  - Polymorphic được đề xuất ban đầu: `media_links`, `reviews`, `favorites` (`media_links` sau đó không được triển khai; xem D23)
  - EXIF metadata đầy đủ cho `media`
  - `amenities` + `business_amenities` chuẩn hóa
  - `regions.path` → `ltree` extension
  - Partial Index + Covering Index strategy
  - Partitioning plan (8 bảng)
  - RLS mở rộng
  - 11 bảng operational mới
  - Zero-Downtime Migration plan 6 bước
- Tạo `project-context.md` (Single Source of Truth)
- Tạo `project-roadmap.md` (14 phases đầy đủ điều kiện hoàn thành, Next Session rõ ràng)
- Cập nhật tất cả tài liệu đã tạo để phản ánh trạng thái cuối phiên chính xác

**File đã tạo/sửa:** `02_database_design.md` (V5), `project-context.md`, `project-roadmap.md`

**Đánh giá:** DB V5 ~ 9.8–9.9/10 Enterprise | Phase 0 & Phase 1 HOÀN THÀNH

---

### 📅 Phiên #003 — 2026-07-07 (Tối — 18:00 ICT)

**Việc đã làm:**
- Thiết kế chi tiết cấu trúc hạ tầng cơ sở và khóa phiên bản thiết kế **Foundation v1.0** (gồm 10 tài liệu từ 02.01 đến 02.10):
  - 02.01: Cấu trúc monorepo workspace (Bun + Hono) và các quy tắc Layered/Hexagonal dependencies.
  - 02.02: Cơ chế nạp env và validate nghiêm ngặt bằng Zod schema, thiết lập AppConfig.
  - 02.03: Xây dựng docker-compose.yml (PostgreSQL 16 + PostGIS, Redis 7, Typesense) và script tự động kích hoạt extensions.
  - 02.04: Cấu hình connection pool cho database client với Drizzle ORM, xây dựng custom Point/ltree columns và transaction helper.
  - 02.05: Xây dựng Redis client với ioredis, phân phối connections cho Queue, thiết lập Key Factory và cơ chế Distributed Lock (Redlock).
  - 02.06: Giao thức HTTP logs sử dụng Pino, Correlation ID và Request Tracing thông qua AsyncLocalStorage.
  - 02.07: Quản lý lỗi tập trung theo tiêu chuẩn IETF RFC 7807, xây dựng Exception hierarchy và error codes catalog.
  - 02.08: Trình kiểm tra biểu mẫu (Zod validation middleware) và DTO mappings cho phân trang.
  - 02.09: Quản lý phiên token (Access JWT + Refresh Token), RTR xoay vòng tự động, vân tay thiết bị và Permission-based RBAC.
  - 02.10: Thiết lập Entry point `Bun.serve` với startup validation, liveness/readiness check, request timeout và graceful shutdown.
- Cập nhật trạng thái Roadmap và project-context đánh dấu hoàn tất Phase 2.

**File đã tạo/sửa:** `backend/docs/02.01-project-architecture.md` đến `02.10-app-bootstrap.md`, `error-codes.md`, `project-roadmap.md`, `project-context.md`.

**Đánh giá:** Foundation v1.0 ~ 9.95/10 Enterprise | Phase 2 HOÀN THÀNH. Khóa kiến trúc và sẵn sàng 100% tài liệu blueprint để coding.

---

### 📅 Phiên #004 — 2026-07-07 (Tối — 19:05 ICT)

**Việc đã làm:**
- Lập trình hoàn thành mã nguồn Backend Foundation (Phase 2):
  - Setup config layer (`env.ts`, `app.config.ts`, `.env`, `.env.example`).
  - Setup Drizzle ORM PostgreSQL client với custom types (PostGIS point geography, ltree path).
  - Xây dựng Pino logger với AsyncLocalStorage correlation ID request tracing.
  - Xây dựng RFC 7807 problem details error handler middleware & AppError classes.
  - Xây dựng Zod validation middleware và rate limiting middleware.
  - Thiết lập application entry point `Bun.serve` với startup/readiness/liveness check, graceful shutdown.
- Thiết kế chi tiết blueprints cho Phase 3 (Core Modules):
  - Identity Module (Sub-phase 3.1): 10 tài liệu thiết kế từ `03.01.01-domain-design.md` đến `03.01.10-final-review.md`.
  - Regions Module (Sub-phase 3.2): 3 tài liệu thiết kế từ `03.02.01-domain-design.md` đến `03.02.03-final-review.md`.
- Xác thực code biên dịch thành công (`bun run build`) và không có lỗi lint (`bun run lint`).

**File đã tạo/sửa:** `backend/src/**/*`, `backend/docs/03.01.*`, `backend/docs/03.02.*`, `project-context.md`, `project-roadmap.md`.

**Đánh giá:** Codebase Foundation v1.0 đã hoạt động & build/lint tốt. Thiết kế Identity & Regions (v1.0) đã hoàn thành, sẵn sàng chuyển giao sang coding Phase 3 ngay khi được duyệt.

---

### 📅 Phiên #005 — 2026-07-07 (Tối — 19:12 ICT)

**Việc đã làm:**
- Tạo các tệp tin cấu hình hạ tầng cục bộ `docker-compose.yml` và script SQL init extension `00_extensions.sql` chứa postgis/ltree setup.
- Thiết kế và triển khai mã nguồn các tệp Drizzle SQL Schema: `references.ts` (business_types, attraction_categories, amenities), `users.ts` (users, profiles, sessions), và `regions.ts` (regions, tourist_places) tích hợp custom types point/ltree.
- Sinh thành công tệp migration đầu tiên chứa 8 bảng cốt lồ lõi (`0000_icy_living_lightning.sql`) thông qua Drizzle Kit.
- Viết mã nguồn seed dữ liệu mẫu `seed.ts` để nạp các loại danh mục tham chiếu, cây địa giới hành chính Hoàng Su Phì và một tài khoản Admin mặc định. Tích hợp script `"db:seed"` vào `package.json`.
- Cập nhật biến môi trường `.env` và `.env.example` khớp với credentials của local DB.
- ✅ Biên dịch thành công hệ thống (`bun run build`) và không có bất kỳ lỗi linting nào (`bun run lint` sạch sẽ).

**File đã tạo/sửa:** `docker-compose.yml`, `docker/postgres/init/00_extensions.sql`, `backend/src/lib/database/schema/*`, `backend/src/lib/database/seed.ts`, `backend/package.json`, `backend/.env`, `backend/.env.example`, `project-context.md`, `project-roadmap.md`.

**Đánh giá:** 10/10. Hạ tầng DB local, core schemas, migrations và seed scripts đã được thiết lập thành công. Hệ thống sẵn sàng cho bước lập trình CRUD API.

---

### 📅 Phiên #006 — 2026-07-08 (Chiều — 17:36 ICT)

**Việc đã làm:**
- Rà soát tích hợp toàn diện (Integration Review) cho Regions Module từ Router -> Controller -> Service -> Repository -> Database.
- Phát hiện và sửa lỗi nghiêm trọng liên quan đến hỗ trợ Transaction trong `IRegionsRepository.update` và `DrizzleRegionsRepository.update`. Cập nhật để hỗ trợ tham số `tx?: TransactionClient`, đảm bảo các thay đổi cập nhật nhánh con khi di chuyển vùng cha được thực hiện trong cùng một transaction và rollback đúng đắn khi xảy ra lỗi.
- Đảm bảo tính nhất quán của API và cấu trúc DTO cho Regions Module.
- Chạy toàn bộ bộ test và xác thực hệ thống hoạt động ổn định.
- Chính thức **LOCKED** Regions Module ở trạng thái Production-ready cho MVP cấp huyện.

**File đã tạo/sửa:** `backend/src/modules/regions/repository/regions-repository.interface.ts`, `backend/src/modules/regions/repository/regions.repository.ts`, `project-context.md`, `project-roadmap.md`.

**Đánh giá:** 10/10. Regions Module đã hoàn tất kiểm thử tích hợp, tối ưu hoá cơ chế transaction và chính thức khóa thành công. Sẵn sàng phát triển các module tiếp theo.

---

### 📅 Phiên #007 — 2026-07-08 (Tối — 17:55 ICT)

**Việc đã làm:**
- Triển khai và hoàn tất tầng Nghiệp vụ (`PlacesService`): Sử dụng đúng mô hình phân tách tầng, loại bỏ hoàn toàn SQL/HTTP logic ra khỏi service, chỉ điều phối repository.
- Triển khai Helper tự động sinh và chuẩn hóa Slug tiếng Việt có dấu (`slugify`): Chuyển hóa chữ có dấu sang không dấu (ví dụ "Ruộng bậc thang Bản Phùng" -> "ruong-bac-thang-ban-phung"), làm sạch khoảng trắng và kí tự đặc biệt, hỗ trợ auto-generate slug từ tên địa điểm nếu client bỏ trống.
- Ràng buộc Soft Delete & GPS Coordinates: Chặn toàn bộ thao tác update/activate/deactivate đối với các record đã soft-delete. Xác thực toạ độ địa lý (kinh độ [-180, 180], vĩ độ [-90, 90]) trực tiếp ở tầng validation và bắt lỗi trả về mã 400 Bad Request thích hợp.
- Triển khai bộ Zod Validation Schemas & TypeScript DTOs đầy đủ, áp dụng chế độ `.strict()` nghiêm ngặt chống dữ liệu rác.
- Triển khai Router Hono và `PlacesController` cho toàn bộ các API công khai và quản trị (list, getById, getBySlug, listByRegion, searchNearby, create, update, delete, activate, deactivate). Áp dụng thứ tự khai báo route để tránh lỗi nhận nhầm parameter.
- Viết 17 Unit test và 12 Integration test kiểm thử tự động thành công 100% với 54 pass tests.
- Chính thức **LOCKED** Tourist Places Module ở trạng thái Production-ready cho MVP cấp huyện.

**File đã tạo/sửa:**
- *Tạo mới:* `backend/src/common/utils/slug.ts`, `backend/src/modules/regions/service/places.service.ts`, `backend/src/modules/regions/service/places.service.test.ts`, `backend/src/modules/regions/dto/places.dto.ts`, `backend/src/modules/regions/dto/places.dto.test.ts`, `backend/src/modules/regions/route/places.controller.ts`, `backend/src/modules/regions/route/places.route.ts`, `backend/src/modules/regions/route/places.route.test.ts`.
- *Sửa đổi:* `backend/src/app/register-routes.ts`, `project-context.md`, `project-roadmap.md`.

**Đánh giá:** 10/10. Tourist Places Module đã hoàn thiện đầy đủ logic, validation, controller/router và test tích hợp 100% sạch sẽ, chính thức đạt mốc LOCKED.

---

### 📅 Phiên #008 — 2026-07-08 (Chiều/Tối — 18:15 ICT)

**Việc đã làm:**
- Triển khai toàn bộ module Businesses & Amenities theo đúng kiến trúc của dự án:
  - Khai báo Schema CSDL: `businesses.ts` đại diện cho bảng `businesses` và bảng trung gian `business_amenities`.
  - Sinh thành công tệp migration `0001_freezing_young_avengers.sql` chứa cấu trúc bảng mới.
  - Lập trình Domain Entity `Business` và Mapper `BusinessMapper`.
  - Triển khai `DrizzleBusinessesRepository` hỗ trợ transaction context, nạp danh sách tiện ích hàng loạt (batch populate relations) để tránh lỗi N+1 queries, và truy vấn PostGIS geofencing tìm kiếm lân cận (`ST_DWithin`).
  - Triển khai `BusinessesService` quản lý các business rules: kiểm tra sự tồn tại của vùng địa giới, tính hoạt động của loại hình kinh doanh, tính chuẩn xác của các tiện ích liên quan, chuẩn hóa slug tiếng Việt, và kiểm tra toạ độ GPS.
  - Triển khai hệ thống DTO và Zod validation schemas có transform đầu vào kiểu string thành number cho phân trang và toạ độ.
  - Thiết lập Router Hono `/businesses` và `BusinessesController` xử lý yêu cầu và trả về API DTO chuẩn.
  - Viết 16 Unit test (cho service + DTO) và 8 Integration test cho Hono endpoints thành công 100% (24 pass tests).
- Chính thức **LOCKED** Businesses & Amenities Module ở trạng thái Production-ready.

**File đã tạo/sửa:**
- *Tạo mới:* `backend/src/lib/database/schema/businesses.ts`, `backend/src/modules/businesses/**/*`.
- *Sửa đổi:* `backend/src/lib/database/schema/index.ts`, `backend/src/middleware/validator.ts`, `backend/src/modules/regions/route/shared-mocks.ts`, `backend/src/app/register-routes.ts`, `project-context.md`, `project-roadmap.md`.

**Đánh giá:** 10/10. Hệ thống chạy ổn định, build/lint/test sạch sẽ 100%.

---

### 📅 Phiên #009 — 2026-07-08 (Tối — 22:45 ICT)

**Việc đã làm:**
- Tiến hành rà soát kỹ thuật (Technical Review) toàn diện cho Sub-phase 3.5 (Attractions & Utilities Module).
- Phát hiện lỗi logic về Soft Delete và Unique Constraint của Slug: Đã sửa đổi repository interface và implementation hỗ trợ `includeDeleted` để tìm kiếm slug trên toàn bảng (gồm cả bản ghi bị soft-deleted) nhằm tránh lỗi 500 Internal Server Error (Unique constraint violation) ở CSDL, chuyển thành 409 Conflict đúng chuẩn RESTful API.
- Phát hiện thiếu sót index cơ sở dữ liệu: Đã thêm B-tree index cho `region_id`, `category_id` và GIST index cho PostGIS `location` trong schema `attractions.ts` nhằm đảm bảo hiệu năng truy vấn Nearby Search và danh sách; sinh thành công migration `0003_simple_princess_powerful.sql`.
- Cập nhật test suite (`test-preload.ts`, `attractions.route.test.ts`, `attractions.service.test.ts`) để mock khớp chính xác với interface mới và verify tham số `includeDeleted=true` khi kiểm tra unique slug.
- Xác thực 100% test cases pass (131/131 tests), chạy compile (`bun run build`) và linter (`bun run lint`) sạch sẽ.
- Chính thức **LOCKED** Attractions & Utilities Module ở trạng thái Production-ready.

**File đã tạo/sửa:**
- *Tạo mới:* `backend/src/lib/database/migrations/0003_simple_princess_powerful.sql`
- *Sửa đổi:* `backend/src/lib/database/schema/attractions.ts`, `backend/src/modules/attractions/repository/attractions-repository.interface.ts`, `backend/src/modules/attractions/repository/attractions.repository.ts`, `backend/src/modules/attractions/service/attractions.service.ts`, `backend/test-preload.ts`, `backend/src/modules/attractions/route/attractions.route.test.ts`, `backend/src/modules/attractions/service/attractions.service.test.ts`, `project-context.md`, `project-roadmap.md`.

**Đánh giá:** 100/100. Hệ thống chuẩn chỉnh, đã xử lý triệt để các lỗi tiềm ẩn về unique constraint và bổ sung các database index quan trọng.

---

## 14. KNOWN PROBLEMS

| ID | Vấn đề | Mức độ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| P1 | Tài liệu cũ mô tả `media_links` nhưng schema thực tế dùng owner pair trên `media` | 🟢 | ✅ Đã giải quyết | D23 xác nhận `media_links` không được triển khai trong Phase 4.3. |
| P2 | UUIDv7 chưa có native support PostgreSQL 16 | 🟡 | ⬜ Cần giải pháp | Dùng extension `pg_uuidv7` hoặc generate ở App layer |
| P3 | `ltree` label không chứa dấu gạch ngang `-` | 🟡 | ⬜ Cần xử lý | Slug có `-` cần convert sang `_` khi lưu vào ltree path |
| P4 | Debezium CDC cần Kafka/Redpanda để buffer | 🟡 | ⬜ Cân nhắc | Phase 1 có thể sync thủ công; CDC khi traffic lớn hơn |
| P5 | Search exact high-cardinality chưa đạt SLA `<100 ms` | 🟡 | 🔓 Ngoại lệ được chấp nhận | Không đánh dấu performance gate là đạt |
| P6 | Price Search và thumbnail public-safe policy | 🟡 | ✅ Đã giải quyết | Price dùng Business current range; thumbnail fail-closed, không leak Media storage key |

---

## 15. NOTES

### Tài liệu tham chiếu
| Tài liệu | Đường dẫn |
| :--- | :--- |
| PRD V3 (Final) | `./PRD_IA_HoangSuPhi.md` |
| DB Design V5 | `./02_database_design.md` |

### Từ khóa SEO cần nhắm
- `du lịch hoàng su phì` / `kinh nghiệm hoàng su phì`
- `mùa lúa chín hoàng su phì` / `hoàng su phì tháng 9`
- `homestay hoàng su phì` / `homestay bản phùng`
- `trekking chiêu lầu thi`
- `đặc sản hoàng su phì` / `chè shan tuyết hà giang`

### Ý tưởng tính năng độc đáo (Phase sau)
- **Live Harvest Status Board:** Admin cập nhật trạng thái lúa theo bản theo thời gian thực
- **Sóng điện thoại Map:** Crowdsource dữ liệu sóng theo từng điểm, từng nhà mạng
- **AI Trip Planner:** Nhập sở thích/budget → AI tạo lịch trình tối ưu
- **Offline PWA Mode:** Cache dữ liệu khu vực để dùng khi mất sóng trên núi

### Thư viện/Tool hữu ích
- `pg_uuidv7` — PostgreSQL extension tạo UUIDv7 native
- `exifr` (npm) — Parse EXIF từ ảnh upload
- `sharp` (npm) — Xử lý, nén ảnh, convert WebP
- `blurhash` (npm) — Placeholder blur cho ảnh
- `schema-dts` — TypeScript types cho Schema.org

### 📅 Phiên #014 — 2026-07-10 (Tối)

**Việc đã làm:**
- Triển khai và hoàn thiện **Step 3 (Repository Layer)** cho Articles & Tags module:
  - Viết `DrizzleArticlesRepository`, `DrizzleCategoriesRepository`, `DrizzleTagsRepository` tuân thủ DDD + Clean Architecture.
  - Tách query builders (`buildCountQuery`, `buildSelectQuery`) để tối ưu hóa mã và khả năng bảo trì.
  - Sử dụng `COUNT(DISTINCT articles.id)` trong count query khi JOIN với `article_tags` để chống đếm trùng bản ghi.
  - Áp dụng `DISTINCT ON (articles.id)` trong search query khi JOIN để triệt tiêu trùng lặp dòng kết quả bài viết.
  - Triển khai cơ chế PostgreSQL `ESCAPE` clause cho `ILIKE` wildcard search nhằm chống các ký tự đặc biệt `%`, `_`, `\` gây nhiễu pattern.
  - Tối ưu hóa hiệu năng `softDelete`/`restore` bằng cách sử dụng phương thức gọn nhẹ `existsIncludingDeleted()` kiểm tra sự tồn tại (idempotent check) mà không cần hydrate dữ liệu qua mapper.
  - Mở rộng lớp map lỗi `mapDbError` cho tất cả các mã lỗi PG quan trọng: `23505` (Unique), `23503` (FK), `23502` (NotNull), `23514` (Check), `40001`/`40P01` (Transaction Conflict).
  - Tích hợp bảo vệ tràn số (integer overflow) cho bộ đếm lượt xem bằng `LEAST(viewCount + 1, 2147483647)`.
  - Triển khai bộ unit test bao phủ toàn bộ các góc khuất nghiệp vụ, đạt 440/440 tests pass 100%, linter và build sạch.
- Chính thức khóa (LOCKED) **Step 3 (Repository Layer)** cho Articles & Tags module.

---

### 📅 Phiên #015 — 2026-07-11 (Chiều)

**Việc đã làm:**
- Khắc phục hoàn toàn lỗi tương thích của Step 4:
  - Hoàn tác (revert) 100% các sửa đổi chéo của Step 1 (Schema), Step 2 (Domain), Step 3 (Repository) về trạng thái nguyên gốc LOCKED.
  - Refactor duy nhất Service Layer (articles.service.ts và tests) để thích nghi với domain/repository gốc.
  - Tự validate thô và thực thi business rules tại Service Layer.
  - Xóa bỏ hoàn toàn optimistic locking và domain events.
  - Unit tests đạt 112/112 tests pass (tổng dự án 474/474 pass), linter & build sạch.
- Chính thức khóa (LOCKED) **Step 4 (Application Service Layer)** cho Articles & Tags module.

---

### 📅 Phiên #018 — 2026-07-14 (Chiều)

**Việc đã làm:**
- Vá lỗ hổng IDOR trên Articles bằng việc kiểm soát quyền sở hữu (authorId === caller.id hoặc Admin) trong toàn bộ các mutation của `ArticlesService`.
- Sửa lỗi default role assignment: Tái cấu trúc `AuthService.register()` để lấy thông tin vai trò qua `IUserRepository.findRoleByCode`, loại bỏ bypass CSDL và race condition trong hot path đăng ký.
- Đồng nhất hóa cấu trúc Routing và Middleware: Tách biệt toàn bộ việc khởi tạo thông qua Composition Root trong `container.ts`, giải quyết dependencies tự động cho toàn bộ 9 route.
- Bổ sung validation và integration tests đầy đủ, chạy thành công 883/883 tests, build và linter sạch lỗi.

---

### 📅 Phiên #025 — 2026-07-14 (Tối)

**Việc đã làm:**
- Đồng bộ trạng thái Phase 4.1 sau khi các tài liệu dự án chưa phản ánh phần Search đã triển khai.
- Xác nhận Steps 4.1.0–4.1.6 đã hoàn tất/phê duyệt; Phase 4.1 chưa thể đóng vì production performance gate, Price và Thumbnail decisions còn mở.
- Triển khai benchmark-only exact per-entity top-K query shape: full eligibility/cursor trước local `limit + 1`, `UNION ALL`, global exact merge và late hydration.
- So sánh với exact stored-vector baseline trong 10 trang của tám scenario (1.600 rows mỗi implementation), gồm fixture đồng hạng Attraction → Place; sequence/projection/rank/`hasMore` khớp và không duplicate/missing.
- Smoke benchmark vẫn fail SLA: common, multi-term, phrase và operator queries vượt 100 ms; exact high-cardinality ranking tiếp tục là bottleneck.
- Không thay đổi production query, public API/cursor/ranking, migration hoặc Domain Phase 3; không chạy ba full benchmark do smoke gate fail.

**Kết luận:** Exact per-entity top-K là query-shape optimization đúng về semantics nhưng **NO-GO cho production** ở trạng thái hiện tại. Chờ Architecture Decision tiếp theo.

---

### 📅 Phiên #026 — 2026-07-14 (Tối)

**Việc đã làm:**
- Người dùng chấp nhận ngoại lệ duy nhất là SLA `<100 ms` chưa đạt; performance gate không được đánh dấu giả là đạt.
- Chốt punctuation-only/empty tsquery trả `400 VAL_001` theo implementation và tests hiện hữu.
- Xác nhận Price, thumbnail, production storage/supporting-index decisions, ba full benchmark và bảy PostgreSQL integration tests vẫn phải hoàn tất.
- Hủy trạng thái khóa tạm; Phase 4.1 trở lại `closeout in progress`.
- Xác nhận không chuyển bất kỳ backlog nào sang Phase 7 hoặc phase khác.
- Hoàn tất thumbnail policy, PostgreSQL integration suite và ba full exact stored-vector benchmark run.
- Đóng production strategy: giữ expression GIN; stored-vector migration và supporting Review index đều NO-GO cho Phase 4.1.

**Kết luận:** `🚧 PHASE 4.1 CLOSEOUT IN PROGRESS — NOT LOCKED`. Chỉ khóa sau khi mọi hạng mục ngoài SLA exception hoàn tất.

---

### 📅 Phiên #027 — 2026-07-15

**Việc đã làm:**
- Người dùng phê duyệt Price current-range bằng VND và cho phép mở tối thiểu Business schema/write path.
- Thêm migration 0014 với nullable `price_min`/`price_max`, pair/range constraint và partial price indexes; không backfill giá giả.
- Hoàn tất Business validation/persistence/API và Search Price validation, interval-overlap, projection, sort cùng exact decimal cursor.
- Mở rộng dedicated PostgreSQL Search integration suite lên 7/7, gồm Price filter/projection/sort/keyset.
- Phát hiện và sửa additive schema drift nghiêm trọng `media.uploaded_by`; catalog local/test đã được xác minh.
- Đồng bộ Search Contract, FTS Strategy và Performance Closeout; Price không tham gia FTS document/ranking.

**Final audit:** Biome lint 316 files; strict TypeScript; production build; full suite `1002 pass / 0 fail` với 9 conditional integration entries skip đúng khi thiếu test URL; dedicated PostgreSQL integration `7 pass / 0 fail`; FTS check 4/4 READY; Price/Media catalog và indexes valid/ready; diff checks sạch.

**Kết luận:** `🔒 PHASE 4.1 SEARCH & ADVANCED FILTER — LOCKED`. SLA `<100 ms` giữ nguyên là ngoại lệ đã chấp nhận, không phải gate đạt. Phase 4.2 chưa bắt đầu.

---

### 📅 Phiên #032 — 2026-07-16

**Việc đã làm:**
- Re-audit toàn bộ Step 4.2.6 và phát hiện bằng chứng EXPLAIN cũ không còn khớp repository LATERAL hiện hành, zero-row plans, benchmark HTTP fail-open và database isolation chưa an toàn.
- Khóa benchmark vào `NEARBY_BENCHMARK_DATABASE_URL` có hậu tố `_benchmark`; lỗi status/envelope/scenario/EXPLAIN/SLA/concurrency đều làm command thất bại.
- Sinh EXPLAIN từ chính SQL của `DrizzleNearbyRepository`, thay chín artifact cũ bằng chín current-query plans có non-zero rows, GiST spatial scans và `reviews_owner_idx`.
- Chạy lại benchmark 27 scenarios × 30 mẫu trên 9.700 spatial entities + 9.700 reviews; raw samples được lưu; 25 km DB p95 = 89,47 ms.
- Chạy dedicated PostgreSQL/PostGIS Nearby suite: 85 pass, 0 fail, 0 skip; full regression 1052 pass, 0 fail; pagination traversal không duplicate/missing.
- Đồng bộ contract decision AD-NEARBY-006, closeout, roadmap và project context.

**Kết luận:** `🔒 PHASE 4.2 NEARBY SEARCH — LOCKED`. Phase 4.3 chưa bắt đầu.

---

### 📅 Phiên #036 — 2026-07-17

**Việc đã làm:**
- Thiết lập và soạn thảo đặc tả Step 4.4.0 (DRAFT COMPLETE — AWAITING USER APPROVAL).
- Xác lập bản đồ 10 route templates MVP (8 route dữ liệu động và 2 route shell/cấu hình), các Schema JSON-LD tương ứng, và cấu hình kiểm tra môi trường cho biến `PUBLIC_SITE_URL`.
- Phân định rõ ràng trách nhiệm Backend (cấp sitemap, robots, data projection, cache) và Frontend (Next.js render metadata HTML & JSON-LD).
- Lên kế hoạch đặt thư mục frontend minimal shell tại `/frontend` ở root workspace.

**Kết luận:** `🚧 STEP 4.4.0 SEO CONTRACT — DRAFT COMPLETE — AWAITING USER APPROVAL`. Chưa bắt đầu Step 4.4.1.

---

### 📅 Phiên #037 — 2026-07-17

**Việc đã làm:**
- Sửa toàn bộ findings review lần 3 trong SEO specification v0.4 mà không chỉnh production code/schema/package.
- Bổ sung public SEO projection endpoints và discriminated DTO làm ranh giới Backend/Frontend.
- Chốt `/tien-ich/:slug`, Media resolver/interface, robots/noindex tương thích, Region render/index split, typed JSON-LD, lastmod đáng tin cậy và benchmark cold/warm.
- Đồng bộ SEO readiness report thành historical snapshot superseded và sửa roadmap về lộ trình 4 step hiện hành.

**Kết luận:** `🚧 STEP 4.4.0 SEO CONTRACT v0.4 — DRAFT COMPLETE — AWAITING USER APPROVAL`. Không bắt đầu Step 4.4.1.

---

### 📅 Phiên #038 — 2026-07-17

**Việc đã làm:**
- Người dùng phê duyệt toàn bộ SEO specification v0.4 và 20/20 architecture decisions.
- Ghi Approval Record, khóa Step 4.4.0 làm implementation contract và cho phép bắt đầu Step 4.4.1.
- Chuẩn bị prompt handoff Step 4.4.1; không triển khai backend/frontend trong phiên approval này.

**Kết luận:** `✅ STEP 4.4.0 SEO CONTRACT v0.4 — APPROVED/LOCKED`. `⬜ STEP 4.4.1 — AUTHORIZED, NOT STARTED`.

---

### 📅 Phiên #039 — 2026-07-18

**Việc đã làm:**
- Hoàn tác toàn bộ các thay đổi Domain Phase 3 locked (đảm bảo cấm can thiệp khi chưa có controlled-unlock riêng).
- Khắc phục triệt để lỗi typecheck `tsc --noEmit` và test timeout 5000ms trong `SharpImageProcessor`.
- Chuyển toàn bộ logic truy cập database trực tiếp của SEO Service vào SEO Repository, đảm bảo projection/repository boundary.
- Triển khai PostgreSQL integration tests thật chạy trên database PostgreSQL (khi có URL test) kết hợp mock query count.
- Bổ sung evidence cho benchmark cold/warm p95, XML schema validation, cache-hit (không truy cập DB), và expired-cache fail-closed (HTTP 503).
- Cập nhật tài liệu `walkthrough.md` và `task.md` với đầy đủ bằng chứng thực tế.

**Kết luận:** `✅ STEP 4.4.1 BACKEND SEO FOUNDATION — COMPLETED`. `⬜ STEP 4.4.2 — NOT STARTED`.

---

### 📅 Phiên #040 — 2026-07-18
 
**Việc đã làm:**
- Triển khai thành công Backend SEO Foundation và minimal Next.js Frontend SEO rendering shell.
- Khắc phục triệt để các lỗi typecheck và linting trên cả backend và frontend.
- Tối ưu hóa mockContext và các kiểu dữ liệu test để loại bỏ hoàn toàn explicit `any` và non-null assertions.
- Chạy thành công toàn bộ integration suite: 28 unit tests, 18 real SSR runtime integration tests, 1179 backend tests, sitemap XML validation và cache ETags.
- Xuất bản Closeout Report chi tiết và chính thức khóa Phase 4.4 SEO.
 
**Kết luận:** `🔒 PHASE 4.4 SEO — LOCKED`. Phase 4.5 chưa bắt đầu.

---

### 📅 Phiên #041 — 2026-07-19

**Việc đã làm:**
- Hoàn thành và 🔒 LOCK Step 4.5.2 Verify Email: tích hợp register, resend/confirm API, one-time token security, Redis idempotency/rate limit và FakeEmailSender.
- Xác minh PostgreSQL token/re-send integration, Redis live `SET NX`, typecheck, lint, build và backend regression.

**Kết luận:** `🔒 STEP 4.5.2 VERIFY EMAIL — LOCKED`.

---

### 📅 Phiên #042 — 2026-07-19

**Việc đã làm:**
- Hoàn thành code Forgot/Reset Password, Contact Form và integration audit của Phase 4.5.
- Giữ Resend production activation tại Step 4.5.6 ở trạng thái pending vì domain `hoangsuphi.vn` chưa được mua và xác minh DNS.

**Kết luận:** `✅ PHASE 4.5 EMAIL — CODE COMPLETE`; chưa tuyên bố production email activated.

---

### 📅 Phiên #043 — 2026-07-19

**Việc đã làm:**
- Đồng bộ `project-context.md` theo trạng thái Phase 4.5 code-complete đã có trong roadmap.
- Chốt Phase 4.6 Redirect Management theo ba step: backend registry/resolver, frontend Next.js execution, rồi verification/LOCK.
- Chốt contract MVP internal-path-only, additive migration, cache Redis TTL 60 giây, không sửa Phase 3 entity và frontend fail-open nếu resolver không khả dụng.

**Kết luận:** `🟡 PHASE 4.6 REDIRECT MANAGEMENT — STEPS 4.6.1–4.6.2 IMPLEMENTATION COMPLETE, AWAITING USER APPROVAL`; chưa bắt đầu Step 4.6.3.

---

### 📅 Phiên #043 — 2026-07-19 (Migration History Repair & Step 4.6.1 Re-verification)

**Việc đã làm:**
- Audit xác nhận journal có hai entry mồ côi `0018_stale_loners` và `0019_heavy_legion`: không có SQL/snapshot tương ứng, không tồn tại trong Git và chưa từng được ghi nhận trong metadata PostgreSQL.
- Chuẩn hóa chain migration thành `0018_redirect_registry`; áp dụng thành công trên local development và `hoangsuphi_test`, kiểm tra lặp migration an toàn.
- Xác minh Redirect PostgreSQL integration 5/5 và toàn bộ Redirect module 24/24; full backend regression 1291 pass, 93 conditional skip, 0 fail; typecheck, lint, build và diff check đều pass.

**Kết luận:** Step 4.6.1 chỉ chờ user review/approval; Phase 4.6 vẫn đang thực hiện và không tự động chuyển sang Step 4.6.2.

---

### 📅 Phiên #043 — 2026-07-19 (Step 4.6.2 Frontend Redirect Execution Review)

**Việc đã làm:**
- Review middleware Next.js và sửa các lỗi contract: protected/system paths không gọi resolver; chỉ GET/HEAD mới redirect; lowercase + trailing slash được canonicalize trong một 308; response resolver bị kiểm tra canonical internal target, status 301/302 và self-loop trước khi redirect.
- Bổ sung client timeout có validation (100–5.000 ms), `no-store`, fail-open không log raw lỗi backend, matcher middleware và unit tests cho resolver/middleware; sửa TypeScript generic trong runtime regression cũ.
- Xác minh frontend: unit suite 39/39, runtime SSR/cross-crawl 25/25, typecheck/lint/build/diff check pass.

**Kết luận:** Step 4.6.2 implementation complete và chờ user review/approval cùng Step 4.6.1; chưa bắt đầu Step 4.6.3.

---

### 📅 Phiên #043 — 2026-07-19 (Step 4.6.3 Final Verification & Lock)

**Việc đã làm:**
- Bổ sung integration dùng PostgreSQL + Redis thật để kiểm chứng cache redirect được tạo, invalidate và repopulate đúng sau CRUD.
- Bổ sung Next.js production runtime test cho public resolver: 301/302, canonical 308 một hop, query-drop, protected/system path, non-GET và resolver 503 fail-open.
- Sửa lifecycle test Windows để chạy trực tiếp Next.js qua Node và chờ child process kết thúc; final check không còn port 4105/4106/4107 bị giữ.
- Chạy migration idempotence trên `hoangsuphi_test`, full backend 1303 pass/76 conditional skip/0 fail, frontend unit 39/39 và runtime 29/29; typecheck, lint, build và diff check đều sạch.

**Kết luận:** `🔒 PHASE 4.6 REDIRECT MANAGEMENT — LOCKED` theo phê duyệt của người dùng. Chi tiết bằng chứng: `backend/docs/04.06.03-redirect-integration-closeout.md`.

---
 
*Tài liệu được tạo và bảo trì bởi AI Agent Antigravity (Google DeepMind)*
*Cập nhật lần cuối: 2026-07-19 — Phiên #043*

---

### 📅 Phiên #044 — 2026-07-19 (Phase 4.7 Recommendation Final Verification & Lock)

**Việc đã làm:**
- Chạy PostgreSQL/PostGIS integration, visibility, no-N+1 và strict validation cho bốn strategy: nearby, same_region, top_rated và newest.
- Chạy full backend regression, typecheck, lint và build; tạo `backend/docs/04.07.02-recommendation-integration-closeout.md`.

**Kết luận:** `🔒 PHASE 4.7 RECOMMENDATION — LOCKED` theo phê duyệt của người dùng.

---

### 📅 Phiên #045 — 2026-07-20 (Phase 4.8 & Phase 4 Final Audit/Lock)

**Việc đã làm:**
- Hoàn thiện Step 4.8.2 với hai public Harvest endpoints, strict DTO, signed cursor, current/timeline PUBLISHED-only và READY IMAGE projection đúng owner.
- Xác minh trên PostgreSQL thật: Harvest 25/25; query count current/timeline = 1/2; cursor không duplicate/omission; concurrent GET không ghi DB/Media ownership và không gọi Redis.
- Chạy full backend với PostgreSQL/Redis thật: 1429 pass, 0 fail, 3 credential-gated Cloudinary smoke skips; typecheck, lint và build pass.
- Chạy frontend unit 39/39, production runtime 29/29, typecheck, lint và Next.js build pass.
- Tạo closeout Phase 4.8 và umbrella Phase 4; đồng bộ roadmap/context.

**Kết luận:** `🔒 PHASE 4.8 LIVE HARVEST STATUS — LOCKED` và `🔒 PHASE 4 MVP CODE BASELINE — LOCKED` theo chỉ thị rõ ràng của người dùng. Search SLA exception và Resend/domain prerequisite tiếp tục được ghi nhận trung thực; Phase 5 chưa bắt đầu.

---

### 📅 Phiên #046 — 2026-07-20 (Phase 5 Frontend Roadmap Planning)

**Việc đã làm:**
- Đọc lại đầy đủ nguồn thông tin dự án và đối chiếu roadmap với frontend/backend contract hiện hữu.
- Xác nhận frontend đã có minimal SEO/SSR/redirect shell từ Phase 4 nhưng chưa có product UI hoàn chỉnh.
- Bổ sung roadmap Phase 5 gồm Steps 5.0–5.7, baseline kế thừa, nguyên tắc triển khai, decision gates, feature coverage, phạm vi loại trừ và Definition of Done.
- Ghi nhận Profile API gap là Issue I7; mọi xử lý backend phải qua controlled-unlock riêng.
- Đồng bộ `project-roadmap.md` và `project-context.md`; không sửa source code, dependencies, database hoặc migration.

**Kết luận:** `📋 PHASE 5 FRONTEND — ROADMAP APPROVED, IMPLEMENTATION NOT STARTED`. Next step là Step 5.0 Frontend Contract & UX Blueprint khi người dùng yêu cầu bắt đầu.

---

### 📅 Phiên #047 — 2026-07-20 (Step 5.0 Audit/Remediation)

**Việc đã làm:**
- Đọc audit report và đối chiếu toàn bộ Step 5.0 blueprint với source frontend/backend hiện hữu, giữ nguyên các module Phase 3–4 LOCKED.
- Sửa tài liệu về endpoint Harvest/auth/review, canonical routes, no-store cache contract, cursor/offset pagination, direct-contact CTA, Map ADR, BFF ADR và phạm vi Profile.
- Ghi nhận GAP-01 public read projection, GAP-02 contact projection và GAP-03 taxonomy/reference là blocker hệ thống cho giao diện khách truy cập; frontend không được che/lọc sau khi fetch để thay thế backend contract.
- Đồng bộ `project-roadmap.md` và `project-context.md`; không sửa source code, dependency, database hoặc migration.

**Kết luận:** `🟡 STEP 5.0 — REMEDIATED DRAFT, BLOCKED PENDING CONTROLLED UNLOCK OR SCOPE EXCEPTION`. UI implementation Phase 5 chưa bắt đầu.

---

### 📅 Phiên #048 — 2026-07-20 (Controlled Unlock GAP-01–03 Approval)

**Việc đã làm:**
- Người dùng phê duyệt hướng controlled unlock additive cho public read projection, contact projection và taxonomy/reference.
- Tạo contract implementation cho module public catalog, route additive, public eligibility fail-closed, cursor, contact data governance, migration boundary và verification gate.
- Không sửa source code, schema, migration, dependency hay hành vi legacy trong phiên approval/contract này.

**Kết luận:** `🟡 CONTROLLED UNLOCK GAP-01–03 — AUTHORIZED; IMPLEMENTATION NOT STARTED`. Các gate Map, BFF/Auth, Profile và Brand không bị phê duyệt ngầm.

---

### 📅 Phiên #049 — 2026-07-20 (Controlled Unlock GAP-01–03 Implementation)

**Việc đã làm:**
- Triển khai module additive `public-catalog` với archive/detail cho Business, Place, Attraction, Article, Region; strict query/slug validation, generic 404, HMAC keyset cursor và `no-store`.
- Triển khai public reference projection và fail-closed eligibility; taxonomy thiếu lifecycle flag chỉ public khi được entity eligible sử dụng.
- Thêm migration `0021_modern_thena.sql` cho `business_public_contacts`, consent/verification/status/URL constraints và partial index; không alter/drop/backfill bảng Phase 3–4.
- Xác minh PostgreSQL/PostGIS thật 7/7 (gồm 60-row performance fixture), unit/HTTP 7/7, full backend 1.353 pass/123 conditional skip/0 fail; typecheck, lint, build và diff check sạch.

**Kết luận:** `✅ GAP-01 → GAP-03 → GAP-02 — IMPLEMENTED & VERIFIED; AWAITING USER ACCEPTANCE`. Step 5.0/UI chưa LOCK hoặc bắt đầu; Map, BFF/Auth, Profile và Brand vẫn là gate độc lập.

---

### 📅 Phiên #050 — 2026-07-20 (Step 5.0 Official Decisions)

**Việc đã làm:**
- Ghi nhận DG-5.0-01: Phase 5 không dùng interactive map, map SDK/tile hay `/ban-do`; giữ dữ liệu tọa độ chính thức, Nearby distance list, fallback cơ sở/khu vực và deep link Google Maps directions.
- Ghi nhận DG-5.0-02: Browser chỉ đi qua Next.js BFF/Route Handler; refresh cookie `HttpOnly`, production `Secure`/`SameSite` phù hợp và không localStorage/browser bearer token.
- Ghi nhận DG-5.0-03 reduced Profile scope và DG-5.0-04 brand direction; không mở controlled unlock backend Profile.
- Đồng bộ `project-roadmap.md` cùng toàn bộ blueprint Step 5.0; không sửa source code, schema, dependency hoặc module Phase 3–4 đã LOCKED.

**Kết luận:** `✅ DG-5.0-01–04 — APPROVED`. `🟡 STEP 5.0 — AWAITING PUBLIC-CATALOG CLOSEOUT ACCEPTANCE`; UI/BFF chưa bắt đầu triển khai.

---

### 📅 Phiên #051 — 2026-07-20 (Step 5.0 Final Acceptance & Lock)

**Việc đã làm:**
- Người dùng chấp nhận closeout controlled unlock GAP-01 → GAP-03 → GAP-02 với evidence PostgreSQL/unit/regression đã ghi tại `docs/phase-5/step-5.0/22-public-catalog-implementation-closeout.md`.
- Xác nhận bốn gate DG-5.0-01–04 đã được phê duyệt và blueprint đã đồng bộ theo scope không interactive map.
- Khóa Step 5.0 cùng public-catalog contract/closeout; không sửa source code, schema, dependency hay module Phase 3–4 đã LOCKED.

**Kết luận:** `🔒 STEP 5.0 — LOCKED`. `⬜ STEP 5.1 DESIGN SYSTEM & FRONTEND FOUNDATION — AUTHORIZED, NOT STARTED`.

---

*Cập nhật lần cuối: 2026-07-20 — Phiên #051*
