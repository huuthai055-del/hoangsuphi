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

> **Cập nhật lần cuối:** 2026-07-11T17:55:00+07:00 | **Phiên:** #015 | **Trạng thái:** 🟡 Phase 3 - Đang thực hiện (Sub-phase 3.1 Identity & Access Control 🔒 LOCKED | Sub-phase 3.2 Regions 🔒 LOCKED | Sub-phase 3.3 Tourist Places 🔒 LOCKED | Sub-phase 3.4 Businesses & Amenities 🔒 LOCKED | Sub-phase 3.5 Attractions & Utilities 🔒 LOCKED | Sub-phase 3.6 Articles & Tags Step 4/7 🔒 LOCKED)

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
| **Trạng thái hiện tại** | 🟡 Phase 3 — Đang thực hiện (Sub-phase 3.1 Identity 🔒 LOCKED | Sub-phase 3.2 Regions 🔒 LOCKED | Sub-phase 3.3 Tourist Places 🔒 LOCKED | Sub-phase 3.4 Businesses & Amenities 🔒 LOCKED | Sub-phase 3.5 Attractions & Utilities 🔒 LOCKED | Sub-phase 3.6 Articles & Tags Step 4/7 🔒 LOCKED) |

### Mục tiêu chiến lược

> **KHÔNG** xây dựng nền tảng đặt phòng OTA (cạnh tranh với Booking.com, Agoda).
> **THAY VÀO ĐÓ:** Trở thành cổng thông tin nội dung bản địa sâu sắc nhất về Hoàng Su Phì — dẫn dắt người dùng từ **tìm kiếm Google → đọc nội dung chất lượng → liên hệ trực tiếp** với chủ homestay/nhà hàng.

**Lợi thế cạnh tranh cốt lõi:**
- Nội dung bản địa độc quyền (theo mùa lúa, theo xã, theo dân tộc)
- SEO cấu trúc bài bản với Schema.org đầy đủ
- Bản đồ tiện ích hành trình thực tế (ATM, xăng, WC, sóng điện thoại)
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
| Map | Mapbox GL JS hoặc Leaflet | TBD — xem Issue I5 |
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
| S3 / Cloudinary | Object Storage — media |
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
S3/Cloudinary ← API Servers (Media upload)
```

### Phân tầng dữ liệu

| Tầng | Công nghệ | Loại dữ liệu |
| :--- | :--- | :--- |
| OLTP | PostgreSQL | Nghiệp vụ chính |
| Cache | Redis | Hot data, Session |
| Search | Typesense | Full-text + Vector |
| OLAP | ClickHouse | Analytics append-only |
| Media | S3 + Cloudinary | Binary files |

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
| `media_links` Polymorphic | 1 bảng thay N join tables cũ |
| `reviews` + `favorites` Polymorphic | `entity_type` + `entity_id` — dễ mở rộng |
| `amenities` chuẩn hóa | Thay JSONB — hỗ trợ filter/search |
| `media.checksum` SHA256 UNIQUE | Chống upload file trùng |

**Migration Status:**

| Môi trường | Trạng thái |
| :--- | :--- |
| Local Dev | ⬜ Chưa bắt đầu |
| Staging | ⬜ Chưa bắt đầu |
| Production | ⬜ Chưa bắt đầu |

---

## 6. API STATUS

> **Trạng thái tổng thể:** ⬜ Chưa bắt đầu triển khai

| Endpoint | Priority | Trạng thái |
| :--- | :--- | :--- |
| `GET /api/v1/businesses` | P1 | ⬜ |
| `GET /api/v1/businesses/:slug` | P1 | ⬜ |
| `GET /api/v1/attractions` | P1 | 🔒 Locked |
| `GET /api/v1/articles` | P1 | ⬜ |
| `GET /api/v1/articles/:slug` | P1 | ⬜ |
| `GET /api/v1/regions` | P1 | ⬜ |
| `GET /api/v1/search` | P1 | ⬜ |
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

---

## 8. CURRENT TASK

> **Phiên #013 — 2026-07-10 (HOÀN THÀNH)**

- [x] Review toàn bộ Step 6 (API Endpoints & Routing) và DTOs, loại bỏ header `x-session-id` dư thừa.
- [x] Triển khai Step 7/7 (Integration Tests & Security Audit): bổ sung các test cases bảo mật (RTR replay attacks, expired tokens, revoked sessions, user status, permissions version validation).
- [x] Đạt 100% Lines Coverage cho lõi module, vượt qua toàn bộ 362/362 tests, linter & build sạch.
- [x] Rà soát và khóa (LOCKED) toàn bộ module Identity & Access Control.

---

## 9. NEXT TASKS

### 🔴 Ưu tiên cao (làm ngay)

| # | Nhiệm vụ |
| :--- | :--- |
| N1 | Khởi tạo Next.js 15 + TypeScript + Tailwind |
| N2 | Khởi tạo Backend (Hono.js) |
| N3 | Viết SQL Migration từ DB Design V5 |
| N4 | Seed Data cho Reference Tables (business_types, attraction_categories, amenities, regions) |
| N5 | Thiết kế API Spec (OpenAPI 3.0) |

### 🟡 Ưu tiên trung bình (sau N1-N5)

| # | Nhiệm vụ | Phụ thuộc |
| :--- | :--- | :--- |
| N6 | CRUD API cho `businesses` | N2, N3 |
| N7 | CRUD API cho `articles` | N2, N3 |
| N8 | Tích hợp Typesense Full-text Search | N6, N7 |
| N9 | Upload Media + EXIF extraction pipeline | N2, N3 |
| N10 | Admin CMS (trang quản trị) | N6, N7 |

### 🟢 Ưu tiên thấp (Phase 2)

| # | Nhiệm vụ |
| :--- | :--- |
| N11 | Vector Search (Typesense AI) |
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
| I3 | Media Storage: Cloudinary (có phí) hay S3 self-managed? | 🟡 TB | ⬜ Chờ quyết định |
| I4 | Analytics: GA4 + ClickHouse hay chỉ GA4? | 🟡 TB | ⬜ Chờ quyết định |
| I5 | Map: Mapbox (có phí) hay OpenStreetMap/Leaflet (miễn phí)? | 🟡 TB | ⬜ Chờ quyết định |
| I6 | CMS: Tự xây Admin hay dùng Payload CMS / Directus? | 🟡 TB | ⬜ Chờ quyết định |

---

## 11. TECHNICAL DECISIONS

> Log quyết định kỹ thuật quan trọng. **Không được xóa.**

| ID | Ngày | Quyết định | Lý do |
| :--- | :--- | :--- | :--- |
| D1 | 2026-07-06 | Không làm OTA đặt phòng | Content portal có lợi thế bản địa — không thể cạnh tranh Booking/Agoda |
| D2 | 2026-07-06 | `ltree` cho `regions.path` | `WITH RECURSIVE` chậm; ltree + GIST index cực nhanh |
| D3 | 2026-07-06 | UUIDv7 cho tất cả PK | UUIDv4 gây B-Tree fragmentation; UUIDv7 time-ordered |
| D4 | 2026-07-06 | Polymorphic design cho `media_links`, `reviews`, `favorites` | 1 bảng thay N join tables — dễ mở rộng entity mới |
| D5 | 2026-07-06 | Reference Tables cho `business_types`, `attraction_categories` | VARCHAR hardcode không mở rộng được |
| D6 | 2026-07-06 | Bỏ B2B Portal ở Phase 1 | Chưa có traffic; focus content trước |
| D7 | 2026-07-06 | ClickHouse cho Analytics | OLAP scan sẽ giết hiệu năng OLTP nếu chạy chung PostgreSQL |
| D8 | 2026-07-06 | Debezium CDC thay sync thủ công | Đáng tin cậy hơn, không bị missed update khi API fail |
| D9 | 2026-07-09 | Single-DB-trip In-Memory authorization architecture | Tránh query DB liên tục trong các middleware phân quyền bằng cách load song song permissions tại authMiddleware và lưu vào Hono context |
| D10 | 2026-07-09 | Bỏ hoàn toàn vai trò của Role Repository và RBAC database layer | Chỉ tuân thủ kiến trúc phân quyền dựa trên quyền hạn (PBAC), bỏ Role queries, giảm thiểu bảng user_roles |

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
  - Polymorphic: `media_links`, `reviews`, `favorites`
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
| P1 | `media_links` polymorphic không có DB-level FK | 🟡 | 🔓 Chấp nhận | Trade-off của Polymorphic; validation ở Application layer |
| P2 | UUIDv7 chưa có native support PostgreSQL 16 | 🟡 | ⬜ Cần giải pháp | Dùng extension `pg_uuidv7` hoặc generate ở App layer |
| P3 | `ltree` label không chứa dấu gạch ngang `-` | 🟡 | ⬜ Cần xử lý | Slug có `-` cần convert sang `_` khi lưu vào ltree path |
| P4 | Debezium CDC cần Kafka/Redpanda để buffer | 🟡 | ⬜ Cân nhắc | Phase 1 có thể sync thủ công; CDC khi traffic lớn hơn |

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

*Tài liệu được tạo và bảo trì bởi AI Agent Antigravity (Google DeepMind)*
*Cập nhật lần cuối: 2026-07-11T18:50:00+07:00*
