# 🗺️ PROJECT ROADMAP — CỔNG THÔNG TIN DU LỊCH HOÀNG SU PHÌ
 
> **Cập nhật lần cuối:** 2026-07-20 | **Phiên:** #051
> **Mục đích:** Theo dõi tiến độ toàn bộ vòng đời dự án từ ý tưởng đến vận hành.
 
---
 
## TỔNG QUAN TIẾN ĐỘ
 
```
Phase  0  Planning                ██████████  ✅ HOÀN THÀNH
Phase  1  Database Design         ██████████  ✅ HOÀN THÀNH
Phase  2  Backend Foundation      ██████████  ✅ HOÀN THÀNH (V1.0 Code & Docs Locked)
Phase  3  Core Modules            ██████████  ✅ PHASE COMPLETED (3.1 - 3.9 🔒 Locked)
Phase  4  Production Features (MVP Stable) ██████████  🔒 MVP CODE BASELINE LOCKED; Resend activation pending domain
Phase  5  Frontend                ██░░░░░░░░  🔒 Step 5.0 LOCKED; Step 5.1 authorized, not started
Phase  6  Admin CMS               ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase  7  Performance             ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase  8  Security                ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase  9  Testing                 ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase 10  Deployment              ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase 11  Content                 ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase 12  Launch                  ░░░░░░░░░░  ⬜ Chưa bắt đầu
Phase 13  Maintenance & Expansion ░░░░░░░░░░  ⬜ Chưa bắt đầu
```
 
---
 
## LUỒNG PHÁT TRIỂN
 
```
Phase 0          Phase 1          Phase 2          Phase 3
Planning    →    Database    →    Backend     →    Core
✅ Done          ✅ Done          ✅ Done          ✅ Phase Completed (3.1 - 3.9 🔒 Locked)
    ↓
Phase 4          Phase 5          Phase 6          Phase 7
Prod (MVP)  →    Frontend    →    Admin CMS   →    Performance
🔒 MVP Locked     🔒 Step 5.0      ⬜               ⬜
    ↓
Phase 8          Phase 9          Phase 10         Phase 11
Security    →    Testing     →    Deployment  →    Content
⬜               ⬜               ⬜               ⬜
    ↓
Phase 12         Phase 13
Launch      →    Maintenance & Expansion
⬜               ⬜
```

---

## CHI TIẾT TỪNG PHASE

---

### ✅ PHASE 0 — PLANNING (Khởi tạo dự án) `HOÀN THÀNH — 2026-07-06`

> **Mục tiêu:** Xác định toàn bộ hướng đi trước khi viết code.

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| Xác định yêu cầu sản phẩm (PRD) | ✅ Hoàn thành | PRD V3 Final |
| Chọn Tech Stack | ✅ Hoàn thành | Next.js, Hono, PG, Redis, Typesense |
| Kiến trúc tổng thể | ✅ Hoàn thành | Ghi trong project-context.md §3 |
| Cấu trúc thư mục | ⬜ Chưa làm | Thực hiện ở Phase 2 |
| Coding Convention | ✅ Hoàn thành | Ghi trong project-context.md §4 |
| Quy tắc Git | ✅ Hoàn thành | Ghi trong project-context.md §4 |
| Quy tắc API | ✅ Hoàn thành | Ghi trong project-context.md §4 |
| Quy tắc đặt tên | ✅ Hoàn thành | Ghi trong project-context.md §4 |

**Kết quả (Deliverables):**
- ✅ `PRD_IA_HoangSuPhi.md` — Product Requirements Document V3
- ✅ `project-context.md` — Single Source of Truth
- ✅ `project-roadmap.md` — File này (14 phases, đầy đủ điều kiện hoàn thành)

---

### ✅ PHASE 1 — DATABASE DESIGN (Thiết kế cơ sở dữ liệu) `HOÀN THÀNH — 2026-07-06`

> **Mục tiêu:** Thiết kế toàn bộ kiến trúc dữ liệu trước khi viết một dòng backend.

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| Thiết kế ERD (Entity Relationship) | ✅ Hoàn thành | ~48 bảng, đầy đủ quan hệ |
| Thiết kế Schema chi tiết | ✅ Hoàn thành | DB Design V5 — `02_database_design.md` |
| Thiết kế Relationships | ✅ Hoàn thành | FK, Polymorphic, Reference Tables |
| Chuẩn hóa dữ liệu (3NF) | ✅ Hoàn thành | business_types, amenities tách riêng |
| Index Strategy | ✅ Hoàn thành | B-Tree, GIN, GIST, Partial, Covering |
| Partition Plan | ✅ Hoàn thành | 8 bảng lớn có partition strategy |
| PostGIS Integration | ✅ Hoàn thành | GEOGRAPHY(Point,4326) + GIST index |
| ltree cho Regions | ✅ Hoàn thành | Path-based tree query |
| Redis Strategy | ✅ Hoàn thành | Cache, Session, Queue, Rate Limit |
| SEO Data Design | ✅ Hoàn thành | seo_metadata, redirects, sitemap_entries |
| Security (RLS, RBAC) | ✅ Hoàn thành | Row Level Security + RBAC tables |
| Migration Design | ✅ Hoàn thành | Zero-Downtime 6 bước |

**Điều kiện hoàn thành:**
- ✅ Database Architecture Review xong
- ✅ Schema Review xong (V5 — điểm đánh giá 9.8–9.9/10)
- ✅ Không cần sửa thêm về cấu trúc

**Kết quả (Deliverables):**
- ✅ `02_database_design.md` — Database Architecture V5 (Enterprise)

---

### ✅ PHASE 2 — BACKEND FOUNDATION (Nền móng Backend) `HOÀN THÀNH — 2026-07-07`

> **Mục tiêu:** Xây dựng và khóa toàn bộ tài liệu thiết kế chi tiết hạ tầng cơ sở (Foundation v1.0) làm kim chỉ nam bất di bất dịch cho lập trình.

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| Khởi tạo project Hono.js + TypeScript | ✅ Hoàn thành | Thiết kế chi tiết tại 02.10 |
| Cấu trúc thư mục chuẩn | ✅ Hoàn thành | Thiết kế chi tiết tại 02.01 |
| Kết nối PostgreSQL + Drizzle ORM | ✅ Hoàn thành | Thiết kế chi tiết tại 02.04 |
| Kết nối Redis | ✅ Hoàn thành | Thiết kế chi tiết tại 02.05 |
| Docker Compose (dev environment) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.03 |
| Logger (Pino + Context trace) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.06 |
| Config management (.env, Zod schema) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.02 |
| Exception Filter / Error Handler (RFC 7807) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.07 & error-codes.md |
| Request Validation (Zod middleware) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.08 |
| RBAC system (Permission-based) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.09 |
| JWT Authentication | ✅ Hoàn thành | Thiết kế chi tiết tại 02.09 |
| Authorization middleware | ✅ Hoàn thành | Thiết kế chi tiết tại 02.09 |
| Health check endpoint (Live/Ready) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.10 |
| OpenAPI Spec (Swagger/Scalar) | ✅ Hoàn thành | Thiết kế chi tiết tại 02.10 |

**Điều kiện hoàn thành:**
- ✅ Toàn bộ 10 tài liệu kiến trúc nền tảng (02.01 -> 02.10) được rà soát và phê duyệt.
- ✅ Cấu trúc thư mục và quy tắc dependency được định hình rõ ràng.
- ✅ Sẵn sàng 100% tài liệu blueprint để code trực tiếp ở Phase 3.


---

### ✅ PHASE 3 — CORE MODULES (Các module nghiệp vụ chính) `HOÀN THÀNH`
 
> **Mục tiêu:** Xây dựng đầy đủ CRUD cho tất cả các module nghiệp vụ cốt lõi.
> 
> **Quy định nhãn trạng thái:**
> - 🟡 **In Progress**: Đang thực hiện (thiết kế schema hoặc đang code logic/test).
> - 🟢 **Completed**: Hoàn thành (code & test xong, đang chờ tích hợp hoặc review).
> - 🔒 **Locked**: Đóng gói và khóa (đã chạy tích hợp, sửa lỗi, review và LOCK để tránh sửa chéo).
 
| Sub-phase | Module nghiệp vụ | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **3.1** | **Identity & Access Control** | 🔒 **Locked** | Toàn bộ module bao gồm Domain, Repositories, Services, Middlewares, API Endpoints, Integration Tests & Security Audit đã hoàn thành và 🔒 LOCKED (Session #013). |
| **3.2** | **Regions** | 🔒 **Locked** | Domain, Repository (Transaction fixed), Service, DTO, Controller, Routes, Tests. |
| **3.3** | **Tourist Places** | 🔒 **Locked** | Domain, Repository, Service, DTO, Controller, Routes, Tests. |
| **3.4** | **Businesses & Amenities** | 🔒 **Locked** | Schema, Repository, Service, DTO, Controller, Routes, Integration/Unit Tests. |
| **3.5** | **Attractions & Utilities** | 🔒 **Locked** | Domain, Repository, Service, DTO, Controller, Routes, Tests. |
| **3.6** | **Articles & Tags** | 🔒 **Locked** | CMS workflow. Step 1-7 Hoàn thành và 🔒 LOCKED (Session #019). |
| **3.7** | **Media Manager** | 🔒 **Locked** | Media Schema, Domain, Storage, Upload service, EXIF variations, Hono controllers, routes, permissions và tests. 🔒 LOCKED (Session #020). |
| **3.8** | **Reviews & Favorites** | 🔒 **Locked** | Repositories, Services, DTOs, Controllers, Routes, and Tests completed and 🔒 LOCKED (Session #021). |
| **3.9** | **Operational Utilities** | 🔒 **Locked** | Weather, Notifications, Itineraries, FAQs, Top Lists modules with Domain, Repo, Service, DTO, Controller, Route, DI Container, Integration Tests completed and 🔒 LOCKED (Session #022). |

**Điều kiện hoàn thành:**
- [x] Tất cả module có CRUD API đầy đủ
- [x] Tất cả endpoint có validation + authorization
- [x] Postman/Bruno collection test xong toàn bộ

---

### 🔒 PHASE 4 — PRODUCTION FEATURES (MVP STABLE) `MVP CODE BASELINE LOCKED — 2026-07-20`

> **Mục tiêu:** Hoàn thiện các tính năng giúp website vận hành ổn định ở quy mô cấp huyện, ưu tiên đơn giản, dễ bảo trì và có thể triển khai thực tế nhanh. Không tối ưu quá mức hay bổ sung hạ tầng phức tạp khi chưa cần thiết.

| Sub-phase | Tính năng | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **4.1** | **Search & Advanced Filter** | 🔒 LOCKED | Steps 4.1.0–4.1.6, Price và final audit hoàn tất. SLA `<100 ms` được ghi nhận là ngoại lệ, không đánh dấu pass. |
| **4.2** | **Nearby Search** | 🔒 LOCKED | PostGIS (`ST_DWithin`, `ST_Distance`) tìm địa điểm theo bán kính và sắp xếp theo khoảng cách. Warm DB p95 tại 25 km = 89,47 ms trong 30 mẫu. |
| **4.3** | **Media Upload** | 🔒 LOCKED | Upload → Validate → Resize → WebP → Cloudinary → Lưu metadata. |
| **4.4** | **SEO** | 🔒 LOCKED | Dynamic Sitemap, robots.txt, Canonical URL, OpenGraph, Schema.org JSON-LD. |
| **4.5** | **Email** | 🔒 CODE BASELINE LOCKED | Verify, Forgot/Reset và Contact đã hoàn tất. Production Activation (Step 4.5.6) vẫn pending cho tới khi mua domain và xác minh DNS/sender. |
| **4.6** | **Redirect Management** | 🔒 LOCKED | Internal exact-path registry/resolver, Redis cache invalidation, Next.js public execution và end-to-end verification hoàn tất. |
| **4.7** | **Recommendation** | 🔒 LOCKED | SQL-based public Recommendation API, PostgreSQL/PostGIS integration, security boundaries, and full regression verified; locked by user approval. |
| **4.8** | **Live Harvest Status** | 🔒 LOCKED | Admin lifecycle, public current/timeline, signed cursor, READY IMAGE projection và PostgreSQL verification hoàn tất. |

#### Tiến độ chi tiết Phase 4.1

| Step | Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **4.1.0** | Search Specification & API Contract | ✅ Phê duyệt | `GET /api/v1/search`, filter/sort/keyset/error contract. |
| **4.1.1** | Vietnamese FTS & Index Strategy | ✅ Phê duyệt | `public.hsp_vietnamese`, weighted FTS, `websearch_to_tsquery`, `ts_rank_cd`; AD-FTS-017 cho stored-vector benchmark prototype. |
| **4.1.2** | FTS Configuration & Index Migration | ✅ Hoàn thành | Migration 0013, catalog/index drift check và bốn expression GIN indexes. |
| **4.1.3** | Search Read Projection & Repository | ✅ Hoàn thành | Unified read-only repository, filters, rating, stable keyset, không OFFSET/N+1. |
| **4.1.4** | Search Application Service & Cursor | ✅ Hoàn thành | Validation, signed cursor, DTO mapping; Price exact-decimal keyset đã kích hoạt sau amendment. |
| **4.1.5** | Search HTTP/API Integration | ✅ Hoàn thành | Controller, route, DI, public response/error contract và tests. |
| **4.1.6** | Performance Verification & Hardening | ✅ Phê duyệt — SLA exception accepted | Benchmark harness/prototypes hoàn tất; `<100 ms` không đạt nhưng được người dùng chấp nhận, không đánh dấu gate là pass. |

**Closeout Phase 4.1:** hoàn tất và LOCK ngày 2026-07-15. Price (`PD-FTS-001`), thumbnail, production storage/supporting Review index decisions, PostgreSQL integration suite 7/7, ba full benchmark runs và final audit đều đã đóng. Không hạng mục nào được chuyển sang phase khác.

#### Tiến độ chi tiết Phase 4.2

Chi tiết thiết kế và quy tắc lập trình xem tại tài liệu đặc tả: [04.02.00-nearby-search-specification.md](file:///c:/Users/tony/Desktop/youtube/hoangsuphi/backend/docs/04.02.00-nearby-search-specification.md).

| Step | Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **4.2.0** | Nearby Specification & API Contract | ✅ Phê duyệt | Chốt endpoint, query, response, giới hạn bán kính và cursor contract. |
| **4.2.1** | Spatial Data & Index Readiness | ✅ Phê duyệt | Kiểm tra dữ liệu tọa độ, kiểu `geography(Point,4326)` và GiST indexes. |
| **4.2.2** | Nearby Read Projection & Repository | ✅ Hoàn thành | Repository truy vấn `ST_DWithin`, `ST_Distance`, `UNION ALL` và global ordering. |
| **4.2.3** | Application Service & Cursor | ✅ Hoàn thành | Validation, signed HMAC cursor, filter fingerprint, DTO mapping, unit and integration tests. |
| **4.2.4** | HTTP/API Integration | ✅ Hoàn thành | Controller, route, DI, public error contract, 12/12 tests pass. |
| **4.2.5** | PostgreSQL Integration Tests | ✅ Hoàn thành | Radius, distance, ordering, pagination, visibility, cursor completeness bao phủ đầy đủ. |
| **4.2.6** | Performance Verification & Final Audit | ✅ Phê duyệt — SLA PASS | Benchmark 27 scenarios × 30 mẫu, 25 km DB p95 = 89,47 ms; 85/85 tests trên PostGIS thật; 9 current-query EXPLAIN plans; LOCK. |

**Closeout Phase 4.2:** Hoàn thành và LOCK ngày 2026-07-16. Endpoint hoạt động chính xác theo bán kính, global distance ordering, signed HMAC keyset pagination và read-only LATERAL projection. Dedicated PostGIS suite đạt 85/85; benchmark 27 scenarios × 30 mẫu trên 9.700 spatial entities + 9.700 reviews; raw samples và 9 EXPLAIN plans lấy trực tiếp từ repository đã được lưu. Warm DB p95 tại 25 km = 89,47 ms < 150 ms ✅.

#### Kế hoạch chi tiết Phase 4.6 — Redirect Management

> **Mục tiêu:** quản lý redirect SEO an toàn, tối giản và có thể truy vết, không sửa slug hay domain entity đã LOCKED. Không có step tài liệu độc lập: contract MVP dưới đây là ranh giới triển khai đã chốt.

**Contract MVP đã chốt**

- Chỉ cho phép redirect **internal exact path**; không external URL, wildcard hoặc regex.
- Canonicalize source/target theo lowercase, Unicode NFC và không trailing slash (trừ `/`); query string không được giữ lại.
- `301` là mặc định; `302` chỉ dùng khi admin chọn redirect tạm thời.
- Từ chối source là `/`, `/api...`, `/_next...`, `/sitemap.xml`, `/robots.txt`, `/favicon.ico` hoặc `/images...`; từ chối self-redirect, redirect chain và cycle.
- Bảng `redirects` cần được đưa vào runtime bằng **một additive migration** theo database design hiện có; không đổi Phase 3 domain entity.
- Backend là source of truth cho CRUD/resolver; frontend Next.js middleware thực thi HTTP redirect. Redis cache resolver TTL 60 giây phải bị invalidate sau CRUD. Nếu resolver không khả dụng, middleware fail-open và để route bình thường tiếp tục xử lý.

| Step | Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **4.6.1** | Redirect Registry & Resolver | 🔒 LOCKED | Additive migration/schema, domain-neutral registry, protected admin CRUD (`system:write`), resolver read-only, normalize/validate và Redis cache invalidation; PostgreSQL/security tests passed. Migration history repaired to `0018_redirect_registry`. |
| **4.6.2** | Frontend Redirect Execution | 🔒 LOCKED | Next.js middleware gọi internal resolver, trả 301/302 thật, chỉ xử lý GET/HEAD public, bypass system/static paths, canonical 308 một hop và fail-open nếu resolver unavailable. |
| **4.6.3** | End-to-end Verification & Lock | 🔒 LOCKED | PostgreSQL + Redis cache lifecycle, Next runtime redirect, loop/chain/security cases, typecheck/lint/build và full regression passed. Closeout: `backend/docs/04.06.03-redirect-integration-closeout.md`. |

#### Tiến độ chi tiết Phase 4.8 — Live Harvest Status

> **Mục tiêu:** cho admin/editor công bố tình trạng mùa vụ địa phương; public API trả current status và timeline chính xác, không biến tính năng thành dự báo thời tiết hay hệ thống notification.

| Step | Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **4.8.1** | Harvest Foundation & Admin Lifecycle | 🔒 LOCKED | Additive schema/migration, lifecycle DRAFT → PUBLISHED → ARCHIVED, `harvest:write`, protected admin API và Media ownership server-side. |
| **4.8.2** | Public Read Model, PostgreSQL Verification & Lock | 🔒 LOCKED | Anonymous current/timeline API, HMAC keyset cursor, PUBLISHED-only visibility, READY IMAGE projection, 1/2-query bound, no Redis/write/N+1. Closeout: `backend/docs/04.08.02-harvest-public-read-model-closeout.md`. |

### Không triển khai trong Phase 4
- ❌ Typesense
- ❌ BullMQ / Queue
- ❌ Event Bus
- ❌ Elasticsearch
- ❌ AI Recommendation
- ❌ Image Processing Pipeline nâng cao
- ❌ Microservices

(Các hạng mục trên sẽ được xem xét ở Phase 5 khi có nhu cầu thực tế.)

### Điều kiện hoàn thành
- [ ] Search & Filter phản hồi < 100ms với dữ liệu thực tế.
- [x] Nearby Search hoạt động chính xác theo bán kính.
- [x] Upload ảnh → Cloudinary hoạt động end-to-end; real-provider evidence được lưu trong closeout Phase 4.3.
- [x] Ảnh tự động chuyển WebP và resize.
- [x] Email Verify & Forgot Password hoạt động qua FakeEmailSender; Resend production activation vẫn pending domain.
- [x] Sitemap.xml và robots.txt được tạo tự động.
- [x] Schema.org JSON-LD hiển thị đúng trên các trang chính.
- [x] Redirect 301/302 hoạt động đúng.
- [x] Recommendation trả kết quả phù hợp bằng SQL.
- [x] Harvest Status backend hoàn chỉnh, read-only public API và admin lifecycle đã được PostgreSQL verification.

> **Ngoại lệ được phê duyệt cho 4.1:** Điều kiện Search `<100 ms` không đạt nhưng được người dùng chấp nhận ngày 2026-07-14. Ô trên giữ nguyên chưa đạt để bảo toàn bằng chứng; ngoại lệ này không miễn các hạng mục closeout khác.

> **Điều kiện kích hoạt ngoài code cho 4.5:** domain `hoangsuphi.vn` chưa được mua/xác minh. Phase 4 khóa code baseline; Step 4.5.6 chỉ được kích hoạt Resend production sau khi DNS/sender domain sẵn sàng và không được thiết kế lại các flow email đã khóa.

### Mục tiêu cuối Phase 4
- Website đủ ổn định để triển khai và kinh doanh ở quy mô cấp huyện.
- Dễ bảo trì bởi một lập trình viên.
- Có thể mở rộng lên Queue, Typesense hoặc AI trong tương lai mà không phải thay đổi kiến trúc Phase 3.

---

### 📋 PHASE 5 — FRONTEND (Giao diện người dùng) `KẾ HOẠCH ĐÃ CHỐT — CHƯA TRIỂN KHAI`

> **Mục tiêu:** Chuyển minimal Next.js SEO shell hiện có thành sản phẩm public hoàn chỉnh, mobile-first, dễ sử dụng, tối ưu SEO và dẫn người dùng từ khám phá nội dung đến liên hệ trực tiếp với cơ sở địa phương.

#### Baseline kế thừa từ Phase 4

- Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS và Zod đã được thiết lập.
- Phase 4.4 đã LOCK SEO projection, metadata, OpenGraph, JSON-LD, sitemap/robots và các SSR route shell; Phase 5 chỉ tích hợp/nâng cấp UI, không thiết kế lại contract đã khóa.
- Phase 4.6 đã LOCK redirect middleware/resolver; mọi thay đổi frontend phải giữ nguyên redirect, canonicalization và fail-open contract.
- Backend Phase 3–4 là source of truth qua public API/interface. Không truy cập implementation detail hoặc tự ý sửa module đã LOCKED.
- Search PostgreSQL, Nearby, Recommendation và Harvest Status API đã sẵn sàng để tích hợp. Không cần Typesense, AI, Queue hoặc microservice cho Phase 5.

#### Nguyên tắc triển khai

1. Server Components/SSR là mặc định cho trang public và SEO; chỉ dùng Client Components cho tương tác thật sự.
2. URL là source of truth cho search/filter/pagination có thể chia sẻ; giữ nguyên opaque cursor của Search/Nearby và không dùng legacy offset lists cho public UI trước controlled unlock.
3. Mọi API response đi qua typed client, validation/envelope mapping và state loading/error/empty rõ ràng.
4. Không lưu refresh token trong `localStorage`; auth/session architecture phải được phê duyệt tại Step 5.0.
5. Media phải có alt text, responsive dimensions và fail-safe placeholder; không lộ storage key nội bộ.
6. Giao diện phải hoạt động với dữ liệu seed/fixture và trạng thái thiếu nội dung; dữ liệu production thuộc Phase 11.

#### Lộ trình triển khai chi tiết

| Step | Hạng mục | Phạm vi chính | Điều kiện đóng step | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **5.0** | **Frontend Contract & UX Blueprint** | Chốt route/page matrix, page-to-API matrix, information architecture, wireframe, render strategy, BFF session, vị trí/Nearby/chỉ đường và backend gap register. | Blueprint audit/remediate; GAP-01–03 implement/verify và user accepted closeout; DG-5.0-01–04 approved. | 🔒 LOCKED 2026-07-20 |
| **5.1** | **Design System & Frontend Foundation** | Brand tokens, typography tiếng Việt, spacing/breakpoints, header/footer/navigation, component primitives, typed API client, providers và loading/error/empty states. | Component foundation responsive/accessibility; typecheck, lint, unit test và build pass. | ⬜ Chưa bắt đầu |
| **5.2** | **Homepage & Global Navigation** | Hero, global search/autocomplete, Live Harvest Status, seasonal navigation, Top Picks, featured tags và quick Nearby/directions actions. | Homepage server-first bằng API public-safe; các mô-đun độc lập có fallback; không có interactive map. | ⬜ Chưa bắt đầu |
| **5.3** | **Listing & Archive Pages** | `/co-so`, `/dia-diem`, `/cam-nang`, `/khu-vuc`, FAQ Hub, Tag và Top Lists; filters cùng cursor pagination. | Dùng GAP-01/03 đã verified sau khi Step 5.0 LOCK; URL state ổn định và không duplicate/missing khi phân trang. | ⬜ Chưa bắt đầu |
| **5.4** | **Detail & Conversion Pages** | Nâng cấp shell hiện có: nội dung đầy đủ, gallery, giá/tiện ích, direct contact CTA, sticky mobile bar, reviews, favorites, nearby, recommendations và related content. | Dùng GAP-01/02 đã verified sau khi Step 5.0 LOCK; giữ nguyên metadata/JSON-LD contract. | ⬜ Chưa bắt đầu |
| **5.5** | **Search, Nearby & Directions** | Trang search + advanced filters, URL synchronization, cursor results, “Gần tôi” distance list, geolocation opt-in, fallback tọa độ cơ sở/khu vực và Google Maps directions. | Search/Nearby contract không đổi; không Mapbox/Leaflet/Google Maps JS/tile, không `/ban-do`; list dùng được bằng mobile/keyboard khi location bị từ chối. | ⬜ Chưa bắt đầu |
| **5.6** | **Authentication & Personalization** | Login/register, verify email, forgot/reset password, BFF refresh/logout, route protection, Favorites và tài khoản reduced scope. | BFF Route Handler giữ refresh token HttpOnly; protected flows đúng permission; không `/auth/me` mock, avatar hay profile nâng cao. | ⬜ Chưa bắt đầu |
| **5.7** | **Quality Gate, Final Audit & Lock** | Responsive/accessibility QA, Lighthouse, Core Web Vitals checks, SEO/SSR/redirect regression, component/integration/E2E smoke và closeout. | Tất cả Phase 5 Definition of Done đạt; có final closeout và user approval trước khi LOCK. | ⬜ Chưa bắt đầu |

**Ước lượng tham chiếu:** 8–11 tuần cho một lập trình viên full-time, chưa gồm thời gian chờ quyết định kiến trúc, controlled-unlock backend hoặc nội dung production.

#### Decision gates bắt buộc tại Step 5.0

| Gate | Quyết định cần chốt | Trạng thái / Ràng buộc |
| :--- | :--- | :--- |
| **DG-5.0-01** | Vị trí, Nearby và chỉ đường | ✅ **APPROVED** — không interactive map/SDK/tile hoặc `/ban-do`; dùng public coordinates, Nearby distance list, fallback cơ sở/khu vực và Google Maps deep link. |
| **DG-5.0-02** | Auth/session strategy | ✅ **APPROVED** — Next.js BFF/Route Handler; refresh cookie `HttpOnly`, production `Secure`/`SameSite` phù hợp; không localStorage/browser bearer token. |
| **DG-5.0-03** | Profile backend contract | ✅ **APPROVED WITH REDUCED SCOPE** — không backend unlock Profile; chỉ account feature được API/permission hiện hữu hỗ trợ. |
| **DG-5.0-04** | Brand assets | ✅ **APPROVED — DIRECTION LEVEL** — xanh núi/vàng lúa/nâu đất/nền kem; font Việt mở, authentic/mobile-first; asset chính thức trước Phase 10/11. |
| **DG-5.0-05** | Public route taxonomy | Dùng `/co-so` cho Business và filter theo loại; tránh route/content duplication. |
| **DG-5.0-06** | Public read/contact controlled unlock | 🔒 **ACCEPTED & LOCKED 2026-07-20** — GAP-01 → GAP-03 → GAP-02 additive; evidence tại `docs/phase-5/step-5.0/22-public-catalog-implementation-closeout.md`. |

#### Feature coverage checklist

| Trang / Component | Trạng thái |
| :--- | :--- |
| Design System (Colors, Typography, Components) | ⬜ |
| Global Header / Footer / Navigation / Search | ⬜ |
| Landing Page / Trang chủ + Harvest Status UI | ⬜ |
| Trang danh sách và chi tiết Cơ sở/Homestay | ⬜ |
| Trang danh sách và chi tiết Điểm tham quan/Tiện ích | ⬜ |
| Trang Khu vực / Region | ⬜ |
| Trang danh sách và chi tiết Bài viết/Cẩm nang | ⬜ |
| Trang Tìm kiếm + Bộ lọc | ⬜ |
| Nearby / “Gần tôi” + Chỉ đường (distance list, không map) | ⬜ |
| Trang FAQ Hub | ⬜ |
| Trang Tag | ⬜ |
| Trang Top Lists | ⬜ |
| Trang Đăng nhập / Đăng ký / Xác minh / Khôi phục mật khẩu | ⬜ |
| Trang tài khoản reduced scope | ⬜ — DG-5.0-03 approved |
| Trang Wishlist / Favorites | ⬜ |
| Responsive (Mobile first) | ⬜ |
| SEO Meta + OG + Schema.org integration | 🟡 Có foundation Phase 4.4; chờ tích hợp UI đầy đủ |

#### Ngoài phạm vi Phase 5

- Admin CMS, CRUD quản trị, moderation và audit viewer thuộc Phase 6.
- Typesense/Vector Search, AI Recommendation, Queue/Event Bus và microservices không được thêm khi chưa có bằng chứng nhu cầu production.
- System-wide load tuning thuộc Phase 7; penetration/security audit tổng thể thuộc Phase 8; full release testing thuộc Phase 9.
- Deployment/domain/Resend production activation thuộc prerequisite riêng và Phase 10; production content thuộc Phase 11.
- Interactive map, Mapbox/Leaflet/Google Maps JS, tile provider, map preview/marker/cluster, `/ban-do` và map-specific fallback/testing không thuộc Phase 5.

#### Definition of Done Phase 5

- [ ] Hoàn thành toàn bộ Steps 5.0–5.7 và feature coverage checklist, hoặc có scope exception được người dùng phê duyệt và ghi rõ.
- [ ] Lighthouse trên các route đại diện: Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90.
- [ ] Responsive từ 320px đến 1920px; keyboard/focus/semantic HTML và contrast đạt accessibility gate.
- [ ] Core Web Vitals lab/staging: LCP < 2.5s, CLS < 0.1; INP < 200ms được instrument và xác minh trên staging/field khi có traffic phù hợp.
- [ ] TypeScript strict, lint, unit/component tests và Next.js production build pass.
- [ ] E2E smoke pass các luồng: homepage → listing → detail, search/filter/Nearby/directions, auth và favorites.
- [ ] Phase 4 SSR/cross-crawl/metadata/JSON-LD/sitemap/robots/redirect regression tiếp tục pass.
- [ ] Không sửa backend Phase 3–4 LOCKED nếu chưa có controlled-unlock được duyệt và audit riêng.
- [ ] Tạo Phase 5 final audit/closeout và được người dùng phê duyệt trước khi chuyển Phase 6.

---

### ⬜ PHASE 6 — ADMIN CMS (Trang quản trị nội dung) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Xây dựng công cụ quản trị nội dung cho biên tập viên và admin.

| Tính năng | Trạng thái |
| :--- | :--- |
| Dashboard tổng quan | ⬜ |
| CRUD Businesses (Homestay, Nhà hàng...) | ⬜ |
| CRUD Attractions (Điểm tham quan) | ⬜ |
| CRUD Articles (Bài viết + CMS Workflow) | ⬜ |
| CRUD Regions | ⬜ |
| CRUD FAQs | ⬜ |
| CRUD Top Lists | ⬜ |
| Media Library (Upload, quản lý ảnh) | ⬜ |
| SEO Manager (Meta, Redirect, Sitemap) | ⬜ |
| Review Moderation | ⬜ |
| User Management | ⬜ |
| Permission / Role Management | ⬜ |
| Audit Log Viewer | ⬜ |
| Analytics Dashboard | ⬜ |
| Business Claim Requests | ⬜ |
| Feature Flags | ⬜ |

**Điều kiện hoàn thành:**
- [ ] Admin có thể tạo/sửa/xóa tất cả entity
- [ ] CMS Workflow: draft → pending_review → published hoạt động
- [ ] Review moderation queue hoạt động

---

### ⬜ PHASE 7 — PERFORMANCE (Tối ưu hiệu năng) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Đảm bảo hệ thống xử lý được lượng traffic lớn mùa cao điểm (tháng 9-10).

| Hạng mục | Trạng thái |
| :--- | :--- |
| Redis Cache cho các API phổ biến | ⬜ |
| Materialized View refresh schedule | ⬜ |
| CDN (Cloudflare) cho static assets | ⬜ |
| Image Lazy Loading + WebP | ⬜ |
| Next.js Image Optimization | ⬜ |
| Query Optimization (EXPLAIN ANALYZE) | ⬜ |
| Index Review (unused, missing) | ⬜ |
| PgBouncer tuning | ⬜ |
| Database Connection Pool tuning | ⬜ |
| Load Testing (k6 hoặc Artillery) | ⬜ |
| Stress Test (peak traffic simulation) | ⬜ |

**Điều kiện hoàn thành:**
- [ ] API response P99 < 500ms dưới 1000 concurrent users
- [ ] Database slow query < 5% tổng queries

---

### ⬜ PHASE 8 — SECURITY (Bảo mật) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Đảm bảo an toàn dữ liệu người dùng và hệ thống.

| Hạng mục | Trạng thái |
| :--- | :--- |
| Rate Limiting (Redis) | ⬜ |
| XSS Protection (Content sanitization) | ⬜ |
| CSRF Protection | ⬜ |
| SQL Injection Prevention (Parameterized queries) | ⬜ |
| Content Security Policy (CSP headers) | ⬜ |
| CORS configuration | ⬜ |
| File upload validation (MIME, size, malware) | ⬜ |
| Secret Manager (không hardcode secret) | ⬜ |
| Database Backup strategy | ⬜ |
| Database Restore drill | ⬜ |
| Security Audit / Penetration Test | ⬜ |
| Monitoring & Alerting (Sentry) | ⬜ |

**Điều kiện hoàn thành:**
- [ ] Không có Critical hoặc High vulnerability
- [ ] Backup restore test thành công trong < 30 phút

---

### ⬜ PHASE 9 — TESTING (Kiểm thử) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Đảm bảo mọi chức năng hoạt động đúng trước khi ra mắt.

| Hạng mục | Trạng thái |
| :--- | :--- |
| Unit Test (Backend modules) | ⬜ |
| Integration Test (API + DB) | ⬜ |
| API Test (Postman/Bruno collection) | ⬜ |
| E2E Test (Playwright) | ⬜ |
| Manual Test (User Acceptance) | ⬜ |
| Cross-browser Test | ⬜ |
| Mobile responsive test | ⬜ |
| Bug Fix sprint | ⬜ |

**Điều kiện hoàn thành:**
- [ ] Unit Test coverage ≥ 70%
- [ ] Tất cả API test pass
- [ ] E2E test pass các luồng chính: xem homestay, tìm kiếm, đọc bài viết

---

### ⬜ PHASE 10 — DEPLOYMENT (Triển khai) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Đưa hệ thống lên môi trường Production ổn định.

| Hạng mục | Trạng thái |
| :--- | :--- |
| Docker image production build | ⬜ |
| Docker Compose / Kubernetes production | ⬜ |
| CI/CD pipeline (GitHub Actions) | ⬜ |
| VPS / Cloud setup | ⬜ |
| Nginx reverse proxy + config | ⬜ |
| SSL certificate (Let's Encrypt / Cloudflare) | ⬜ |
| Domain setup (hoangsuphi.vn) | ⬜ |
| Environment variables (production) | ⬜ |
| Database migration (production) | ⬜ |
| Monitoring setup (Uptime, Error rate) | ⬜ |
| Log aggregation | ⬜ |
| Backup cron job | ⬜ |
| Staging environment | ⬜ |

**Điều kiện hoàn thành:**
- [ ] Production deploy thành công, không downtime
- [ ] Monitoring hoạt động, nhận được alert khi có lỗi
- [ ] SSL A+ trên SSL Labs

---

### ⬜ PHASE 11 — CONTENT (Nội dung) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Điền nội dung thực tế — Đây là yếu tố quyết định SEO và traffic.

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| Import dữ liệu Regions (Xã, Bản) | ⬜ | Dữ liệu hành chính Hoàng Su Phì |
| Import dữ liệu Businesses | ⬜ | Homestay, nhà hàng, cafe... |
| Import dữ liệu Attractions | ⬜ | Điểm tham quan + tiện ích bản đồ |
| Viết bài Cẩm nang du lịch | ⬜ | Mục tiêu: 50 bài launch |
| Upload ảnh chất lượng cao | ⬜ | Tối thiểu 10 ảnh/địa điểm |
| SEO Optimization từng trang | ⬜ | Meta, title, description |
| Viết FAQ Hub | ⬜ | Tối thiểu 30 câu hỏi |
| Tạo Top Lists | ⬜ | Top 10 homestay, Top điểm check-in... |
| Import Reviews mẫu | ⬜ | Review thật từ Google Maps |
| Tạo Lịch trình mẫu | ⬜ | Lịch trình 2N1Đ, 3N2Đ |
| Weather Data integration | ⬜ | API thời tiết |
| Trang theo Mùa | ⬜ | Mùa lúa chín, mùa nước đổ... |

**Điều kiện hoàn thành:**
- [ ] Tối thiểu 50 bài viết cẩm nang chất lượng cao
- [ ] Tối thiểu 30 homestay/cơ sở đã có đầy đủ thông tin + ảnh
- [ ] Tối thiểu 20 điểm tham quan + đầy đủ tiện ích trên bản đồ

---

### ⬜ PHASE 12 — LAUNCH (Ra mắt) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Ra mắt chính thức và bắt đầu thu hút traffic tự nhiên.

| Hạng mục | Trạng thái |
| :--- | :--- |
| Kiểm tra toàn bộ chức năng final | ⬜ |
| Google Search Console setup | ⬜ |
| Submit Sitemap lên Google | ⬜ |
| robots.txt configuration | ⬜ |
| Google Analytics 4 setup | ⬜ |
| Bing Webmaster Tools | ⬜ |
| Backlink building strategy | ⬜ |
| Social Media (Facebook, Zalo OA) | ⬜ |
| Google Ads (nếu cần boost ban đầu) | ⬜ |
| Announce / PR | ⬜ |
| Theo dõi lỗi 24h sau launch | ⬜ |
| Monitor Core Web Vitals | ⬜ |

**Điều kiện hoàn thành:**
- [ ] Website indexable trên Google
- [ ] Sitemap đã được submit và Google bắt đầu crawl
- [ ] Không có lỗi 5xx trong 24h đầu

---

### ⬜ PHASE 13 — MAINTENANCE & EXPANSION (Vận hành & Mở rộng) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Duy trì và phát triển sản phẩm dài hạn.

| Hạng mục | Chu kỳ | Trạng thái |
| :--- | :--- | :--- |
| Cập nhật nội dung thường xuyên | Hàng tuần | ⬜ |
| Sửa lỗi phát sinh | Khi có | ⬜ |
| Backup kiểm tra | Hàng tháng | ⬜ |
| Theo dõi hiệu năng + tối ưu | Hàng tháng | ⬜ |
| Cập nhật dependencies | Hàng quý | ⬜ |
| Nâng cấp tính năng theo feedback | Liên tục | ⬜ |
| **Mở rộng sang các huyện khác (Hà Giang)** | 2027 | ⬜ |
| **Mở rộng toàn tỉnh Hà Giang** | 2027 | ⬜ |
| **Mở rộng Tây Bắc** | 2028 | ⬜ |
| **Mở rộng toàn quốc** | 2028+ | ⬜ |

---

## CẬP NHẬT LỊCH SỬ ROADMAP

> Ghi lại các thay đổi lớn về roadmap. Không được xóa.

| Ngày | Thay đổi | Lý do |
| :--- | :--- | :--- |
| 2026-07-06 | Tạo roadmap lần đầu | Phiên #002 — Kết thúc Phase Design |
| 2026-07-06 | Đánh dấu Phase 0 + Phase 1 hoàn thành | PRD V3 + DB Design V5 + project-context.md + project-roadmap.md đã xong |
| 2026-07-07 | Đánh dấu Phase 2 hoàn thành, khóa thiết kế v1.0 | Rà soát và phê duyệt 10 tài liệu cấu trúc hạ tầng API (02.01 -> 02.10) |
| 2026-07-07 | Cập nhật Phase 2 (Code hoàn thành), Phase 3 (Thiết kế Blueprint 3.1 & 3.2 hoàn thành) | Phiên #004 — Thực hiện code xong Foundation & thiết kế module Users/Regions |
| 2026-07-07 | Dựng local CSDL, viết xong Drizzle Schemas cho 8 bảng Core và sinh migration, viết seed script | Phiên #005 — Đã viết xong schema, sinh migration đầu tiên thành công |
| 2026-07-07 | Hoàn thành toàn bộ Regions Module (Domain → Repo → Service → DTO → Controller → Routes → Tests). Hoàn thành Tourist Places Repository + Mapper. | Phiên #006 — 22 unit/integration tests pass, build ✅, lint ✅ |
| 2026-07-08 | Rà soát tích hợp, sửa lỗi Transaction trong Repository, và chính thức khóa (LOCKED) Regions Module. | Phiên #006 — 22 unit/integration tests pass, build ✅, lint ✅ |
| 2026-07-08 | Hoàn thành và khóa (LOCKED) Tourist Places Module (Service → DTO → Route → Controller → Tests) | Phiên #007 — Hoàn tất Sub-phase 3.3 toàn diện |
| 2026-07-08 | Hoàn thành và khóa (LOCKED) Businesses & Amenities Module (Schema → Repo → Service → DTO → Route → Controller → Tests) | Phiên #008 — Hoàn tất Sub-phase 3.4 toàn diện |
| 2026-07-08 | Review kỹ thuật toàn diện, sửa lỗi Unique Slug logic với Soft Delete, bổ sung database indexes (B-tree & GIST), và chính thức khóa (LOCKED) Attractions & Utilities Module. | Phiên #009 — 131 tests pass, build ✅, lint ✅ |
| 2026-07-09 | Hoàn thành và khóa (LOCKED) Session #012 (Step 1-6: User Domain Entity, Repository Interfaces, Database ⇄ Domain Mappers, Drizzle Repository, Unit Tests). | Phiên #012 — Emitted user domain & repositories |
| 2026-07-09 | Hoàn thành và khóa (LOCKED) Session #013 (Step 1-3: PasswordService, TokenService, SessionService & Unit Tests). | Phiên #013 — Hoàn tất 3 services xác thực nền tảng, coverage 100% lines, linter & build ✅, Smoke Test on real DB ✅ |
| 2026-07-09 | Hoàn thành và khóa (LOCKED) Session #013 (Step 5/7: Authentication Middleware & Authorization Layer & Unit Tests). | Phiên #013 — Hoàn thành middleware, 100% Lines Coverage, sửa triệt độ lỗi SyntaxError db mocks chéo, linter & build ✅ |
| 2026-07-09 | Hoàn thành và khóa (LOCKED) Session #013 (Step 6/7: Identity Routes (API) & DTOs & Unit Tests). | Phiên #013 — Hoàn thành API endpoints (Hono routes & controllers), Zod validator, Drizzle repositories (Row Locking), và coverage 100% lines, build & lint ✅ |
| 2026-07-09 | Hoàn thành và khóa (LOCKED) Session #013 (Step 7/7: Integration Tests & Security Audit). | Phiên #013 — Hoàn tất middleware optimization (In-memory authz), clean up roles repositories, full integration tests pass 100% (354/354), và 🔒 LOCKED toàn bộ module Identity. |
| 2026-07-10 | Hoàn thành và khóa (LOCKED) Session #013 (Step 6/7: Identity Routes (API) & DTOs & Unit Tests). | Phiên #013 — Thực hiện code review toàn diện Step 6, loại bỏ header x-session-id dư thừa khỏi OpenAPI spec và tests, toàn bộ 353/353 tests pass 100% và LOCK Step 6. |
| 2026-07-10 | Hoàn thành và khóa (LOCKED) Session #013 (Step 7/7: Integration Tests & Security Audit). | Phiên #013 — Bổ sung integration tests kiểm tra bảo mật (expired tokens, revoked sessions, user status, RTR replay attack), pass 362/362 tests, coverage lines đạt 100%, và LOCK Step 7/7. |
| 2026-07-10 | Hoàn thành và khóa (LOCKED) Session #014 (Step 3/7: Repository Layer). | Phiên #014 — Viết xong Drizzle repositories cho Articles & Tags, tối ưu hóa các hàm builder chống đếm trùng (COUNT DISTINCT) và dòng trùng (DISTINCT ON), hoàn tất mapping DB errors mở rộng (23502, 23514, 40001/40P01), an toàn SQL ILIKE ESCAPE, unit tests đạt 440/440 tests pass 100% và LOCK Step 3/7. |
| 2026-07-11 | Khắc phục hoàn toàn lỗi tương thích Step 4 | Phiên #015 — Hoàn tác (revert) 100% các sửa đổi chéo của Step 1, 2, 3 đã LOCKED. Refactor duy nhất Service Layer (articles.service.ts và tests) thích nghi hoàn hảo với Domain & Repository gốc. Toàn bộ 467 tests pass 100%, linter & build sạch, LOCK Step 4. |
| 2026-07-12 | Triển khai Step 5/7: Presentation Layer (API) | Phiên #018 — Viết xong Hono Routers, Controllers, DTO validation schemas (Zod), và các Response Mappers riêng biệt. Đánh giá DTO hoàn tất. |
| 2026-07-12 | Hoàn thành và khóa (LOCKED) Step 6: Architecture Review | Phiên #018 — Toàn bộ 10 checklist Clean Architecture, SOLID, Domain, Repo, Service, Presentation, Security, Transaction, Performance và Code Quality đều PASS đạt chuẩn Production Ready. |
| 2026-07-12 | Hoàn thành và khóa (LOCKED) Step 7: Integration Tests & Final Audit | Phiên #019 — Hoàn tất chạy full 161 tests của module, linter & build ✅, test coverage lines đạt >94% (Entities/Services 100%), và chính thức LOCK toàn bộ Sub-phase 3.6 Articles & Tags. |
| 2026-07-12 | Hoàn thành và khóa (LOCKED) Step 1: Media Foundation của module Media Manager | Phiên #020 — Thiết kế 3 bảng CSDL polymorphic, Domain Entity quản lý lifecycle, Storage Contract và pass 17 unit tests với coverage >98%, build & lint ✅ |
| 2026-07-12 | Hoàn thành và khóa (LOCKED) Step 2: Upload Pipeline của module Media Manager | Phiên #020 — Triển khai MediaUploadService, LocalStorageAdapter, config size/MIME, SHA-256 duplicate checks, transaction safety storage cleanups, và pass 27 tests với coverage >98%, build & lint ✅ |
| 2026-07-12 | Hoàn thành và khóa (LOCKED) Step 3: EXIF & Processing Pipeline của module Media Manager | Phiên #020 — Triển khai MediaProcessingService, NativeImageProcessor đọc binary headers (PNG/JPEG/GIF/EXIF), sinh variants (thumbnail, medium, large), bọc safe errors, và pass 32 tests với coverage >98%, build & lint ✅ |
| 2026-07-12 | Hoàn thành và khóa (LOCKED) Step 4: API & Final Audit của module Media Manager | Phiên #020 — Triển khai Hono router, Controller, DTOs, response mappers, bind permission/auth guards, và pass 39 tests với coverage >98%, build & lint ✅ |
| 2026-07-13 | Hoàn thành và khóa (LOCKED) Step 1: Database & Domain Layer của Reviews & Favorites | Phiên #021 — Thiết kế CSDL polymorphic (reviews/favorites), unique indexes chống duplicate, rating check constraints, viết Rich Domain model entities và Value Object, pass 28 tests đạt 100% test coverage |
| 2026-07-13 | Hoàn thành toàn bộ Reviews & Favorites (Sub-phase 3.8) và Operational Utilities (Sub-phase 3.9) | Phiên #022 — Triển khai CRUD, Repo, Service, API, DI Container, và chạy pass 100% tests cho Weather, Notifications, Itineraries, FAQs, Top Lists |
| 2026-07-14 | Thực hiện Audit toàn diện Phase 3, viết báo cáo audit và đề xuất kế hoạch khắc phục | Phiên #023 — Hoàn tất Audit 10 levels, phát hiện các lỗi Critical/High (lọt transaction ở Identity, leak data ở Itineraries, roles rỗng) |
| 2026-07-14 | Hoàn thành toàn bộ Remediation sửa lỗi bảo mật (Articles IDOR, Default Role Assignment) & DI Container | Phiên #024 — Hoàn tất sửa lỗi IDOR trong Articles, sửa default role registry logic trong AuthService, hợp nhất DI container tự động, pass 883/883 tests, build & lint sạch |
| 2026-07-14 | Đồng bộ Phase 4.1 Steps 4.1.0–4.1.6 và kết quả benchmark prototypes | Phiên #025 — Search API đã triển khai end-to-end; Step 4.1.6 được phê duyệt ở trạng thái NO-GO production. Stored vector, bounded ranking và exact per-entity top-K chưa đạt đủ production performance gate. |
| 2026-07-14 | Chấp nhận ngoại lệ SLA `<100 ms`, tiếp tục closeout Phase 4.1 | Phiên #026 — Chưa LOCK; phải đóng Price, thumbnail, production decisions, integration tests, ba full benchmarks và final audit. Không chuyển backlog sang phase khác. |
| 2026-07-15 | Hoàn tất Price Architecture Decision và implementation | Phiên #027 — Thêm migration 0014, Business current price range VND, Search interval-overlap/price sort/exact cursor và PostgreSQL integration coverage; đồng thời sửa additive Media `uploaded_by` schema drift đã được duyệt. |
| 2026-07-15 | 🔒 LOCK Phase 4.1 Search & Advanced Filter | Phiên #027 — Full suite 1002 pass/0 fail (9 conditional integration entries skip), dedicated PostgreSQL integration 7/7, build/lint/typecheck/catalog/FTS/diff sạch. SLA `<100 ms` là ngoại lệ được chấp nhận và vẫn ghi là không đạt. Phase 4.2 chưa bắt đầu. |
| 2026-07-15 | Lập & hiệu chỉnh đặc tả Nearby Search | Phiên #028 — Thiết kế API Contract, điều kiện cursor, quy tắc làm tròn khoảng cách, spatial indexes, và lập đặc tả chi tiết (Amendment v3) tại [04.02.00-nearby-search-specification.md](file:///c:/Users/tony/Desktop/youtube/hoangsuphi/backend/docs/04.02.00-nearby-search-specification.md). |
| 2026-07-15 | Xác minh dữ liệu không gian & GiST index | Phiên #029 — Tạo migration 0015 thêm GiST indexes cho tourist_places và businesses, viết bộ integration tests và spatial fixtures cho data readiness, pass 8/8 tests. |
| 2026-07-15 | Triển khai Steps 4.2.2–4.2.5 Nearby Search | Phiên #030 — NearbyRepository (ST_DWithin + LEFT JOIN LATERAL), NearbySearchService (HMAC cursor, fingerprint), HTTP controller, route, DI, 47 unit tests pass, PostgreSQL integration tests suite hoàn tất. |
| 2026-07-16 | 🔒 LOCK Phase 4.2 Nearby Search sau final re-audit | Phiên #032 — Sửa benchmark fail-open và database isolation; loại SQL/EXPLAIN cũ; chạy 27 scenarios × 30 mẫu trên 9.700 entities + 9.700 reviews. 25 km DB p95 = 89,47 ms. 9 current-query EXPLAIN plans có non-zero rows, GiST + `reviews_owner_idx`; Nearby suite 85/85, full regression 1052 pass/0 fail, build/typecheck/biome/diff sạch. |
| 2026-07-19 | 🔒 LOCK Step 4.5.2 Verify Email | Phiên #041 — Resend/confirm routes, token security, Redis idempotency/rate limit, FakeEmailSender, PostgreSQL/Redis live integration; full backend 1246 pass, 67 skip, 0 fail. Step 4.5.3 chưa bắt đầu. |
| 2026-07-19 | ✅ CODE COMPLETE Phase 4.5 Email | Phiên #042 — Hoàn tất Forgot/Reset, Contact Form và Integration Audit. Toàn bộ tests pass. Production Activation (Step 4.5.6) Pending Domain. |
| 2026-07-19 | Đồng bộ trạng thái và chốt lộ trình Phase 4.6 | Phiên #043 — `project-context.md` được đồng bộ theo Phase 4.5 code-complete. Chốt Redirect Management theo ba step: registry/resolver, Next.js execution, verification/lock; contract MVP internal-path-only, additive migration, Redis TTL 60 giây và frontend fail-open. |
| 2026-07-19 | Repair migration history và re-verify Step 4.6.1 | Phiên #043 — Loại hai journal entry mồ côi chưa từng được áp dụng, chuẩn hóa migration thành `0018_redirect_registry`, migrate thành công local/test. Redirect PostgreSQL integration 5/5, module 24/24; full backend 1291 pass, 93 conditional skip, 0 fail. Step 4.6.1 chờ user approval. |
| 2026-07-19 | Review và remediation Step 4.6.2 Frontend Redirect Execution | Phiên #043 — Sửa middleware bypass/method/canonicalization/response validation và timeout fail-open; unit 39/39, runtime SSR + cross-crawl 25/25, typecheck/lint/build/diff check pass. Step 4.6.2 chờ user approval; Step 4.6.3 chưa bắt đầu. |
| 2026-07-19 | 🔒 LOCK Phase 4.6 Redirect Management | Phiên #043 — Chạy `0018_redirect_registry` idempotence trên PostgreSQL test, live PostgreSQL+Redis CRUD cache lifecycle và Next.js production redirect runtime. Backend 1303 pass/76 conditional skip/0 fail; frontend unit 39/39 và runtime 29/29; typecheck/lint/build/diff sạch. |
| 2026-07-19 | 🔒 LOCK Phase 4.7 Recommendation | Phiên #044 — SQL/PostGIS read model, strict cursor/visibility, permission, no-leak gates và full regression đã được người dùng phê duyệt. |
| 2026-07-20 | 🔒 LOCK Phase 4.8 Live Harvest Status | Phiên #045 — Admin lifecycle và public current/timeline hoàn tất; Harvest PostgreSQL 25/25, signed cursor, query count 1/2, no Redis/write/N+1 và READY IMAGE no-leak. |
| 2026-07-20 | 🔒 LOCK Phase 4 MVP code baseline | Phiên #045 — Re-audit Phase 4.1–4.8: backend 1429 pass/0 fail, frontend unit 39/39, runtime 29/29, typecheck/lint/build sạch. Giữ nguyên Search SLA exception và Resend/domain prerequisite. |
| 2026-07-20 | 📋 Chốt lộ trình Phase 5 Frontend | Phiên #046 — Bổ sung Steps 5.0–5.7, baseline kế thừa Phase 4, decision gates, feature coverage, phạm vi loại trừ và Definition of Done. Phase 5 chưa triển khai; Step 5.0 là bước tiếp theo. |
| 2026-07-20 | 🟡 Audit/remediate Step 5.0 | Phiên #047 — Sửa blueprint theo source thực tế; phát hiện public list/detail không public-safe, thiếu contact/taxonomy contract. Step 5.0 blocked chờ controlled unlock GAP-01–03 hoặc scope exception. Không sửa code Phase 3–4. |
| 2026-07-20 | ✅ Phê duyệt controlled unlock GAP-01–03 | Phiên #048 — Người dùng chọn hướng additive; contract public catalog/contact/taxonomy được tạo. Chưa sửa source code; Map/BFF/Profile/brand vẫn là gate riêng. |
| 2026-07-20 | ✅ Implement/verify controlled unlock GAP-01–03 | Phiên #049 — Thêm `/api/v1/public/catalog/*`, `/api/v1/public/references/*`, signed cursor, eligibility/media/reference projection và migration `business_public_contacts`; PostgreSQL 7/7, unit/HTTP 7/7, full backend 1353 pass/0 fail, typecheck/lint/build sạch. Chờ user acceptance; Map/BFF/Profile/brand vẫn pending. |
| 2026-07-20 | ✅ Phê duyệt DG-5.0-01–04 và điều chỉnh scope không interactive map | Phiên #050 — Không Mapbox/Leaflet/Google Maps JS/tile hay `/ban-do`; giữ public coordinates, Nearby distance list, fallback cơ sở/khu vực và Google Maps directions. Chốt BFF HttpOnly refresh, Profile reduced scope và brand direction. GAP closeout vẫn chờ user acceptance. |
| 2026-07-20 | 🔒 LOCK Step 5.0 Frontend Contract & UX Blueprint | Phiên #051 — Người dùng chấp nhận public-catalog closeout GAP-01 → GAP-03 → GAP-02; xác nhận DG-5.0-01–04 đã approved. Không thay đổi code; Step 5.1 được phép bắt đầu. |

---

- ✅ Phase 0 (Planning) — HOÀN THÀNH
- ✅ Phase 1 (Database Design) — HOÀN THÀNH
- ✅ Phase 2 (Backend Foundation) — HOÀN THÀNH
- ✅ Phase 3 (Core Modules) — HOÀN THÀNH (Remediation & Code Complete & 🔒 Locked)
  - Sub-phase 3.1 Identity: 🔒 **LOCKED**
  - Sub-phase 3.2 Regions: 🔒 **LOCKED**
  - Sub-phase 3.3 Tourist Places: 🔒 **LOCKED**
  - Sub-phase 3.4 Businesses & Amenities: 🔒 **LOCKED**
  - Sub-phase 3.5 Attractions & Utilities: 🔒 **LOCKED**
  - Sub-phase 3.6 Articles & Tags: 🔒 **LOCKED**
  - Sub-phase 3.7 Media Manager: 🔒 **LOCKED**
  - Sub-phase 3.8 Reviews & Favorites: 🔒 **LOCKED**
  - Sub-phase 3.9 Operational Utilities: 🔒 **LOCKED**
- 🔒 Phase 4 (Production Features) — MVP CODE BASELINE LOCKED
  - Sub-phase 4.1 Search & Advanced Filter: 🔒 **LOCKED**; SLA `<100 ms` exception recorded.

---

- ✅ Phase 0 (Planning) — HOÀN THÀNH
- ✅ Phase 1 (Database Design) — HOÀN THÀNH
- ✅ Phase 2 (Backend Foundation) — HOÀN THÀNH
- ✅ Phase 3 (Core Modules) — HOÀN THÀNH (Remediation & Code Complete & 🔒 Locked)
  - Sub-phase 3.1 Identity: 🔒 **LOCKED**
  - Sub-phase 3.2 Regions: 🔒 **LOCKED**
  - Sub-phase 3.3 Tourist Places: 🔒 **LOCKED**
  - Sub-phase 3.4 Businesses & Amenities: 🔒 **LOCKED**
  - Sub-phase 3.5 Attractions & Utilities: 🔒 **LOCKED**
  - Sub-phase 3.6 Articles & Tags: 🔒 **LOCKED**
  - Sub-phase 3.7 Media Manager: 🔒 **LOCKED**
  - Sub-phase 3.8 Reviews & Favorites: 🔒 **LOCKED**
  - Sub-phase 3.9 Operational Utilities: 🔒 **LOCKED**
- 🔒 Phase 4 (Production Features) — MVP CODE BASELINE LOCKED
  - Sub-phase 4.1 Search & Advanced Filter: 🔒 **LOCKED**; SLA `<100 ms` exception recorded.
  - Sub-phase 4.2 Nearby Search: 🔒 **LOCKED**; 25 km DB p95 = 89,47 ms, 85/85 Nearby tests.
  - Sub-phase 4.3 Media Upload: 🔒 **LOCKED**.
  - Sub-phase 4.4 SEO: 🔒 **LOCKED**.
  - Sub-phase 4.5 Email: 🔒 **CODE BASELINE LOCKED** — PRODUCTION ACTIVATION PENDING DOMAIN.
  - Sub-phase 4.6 Redirect Management: 🔒 **LOCKED**.
  - Sub-phase 4.7 Recommendation: 🔒 **LOCKED**.
  - Sub-phase 4.8 Live Harvest Status: 🔒 **LOCKED**.
- 📋 Phase 5 (Frontend) — **STEP 5.0 LOCKED; UI IMPLEMENTATION NOT STARTED**
  - Public catalog/contact/taxonomy implementation đã pass PostgreSQL/unit/regression và được user accept; Step 5.1 là bước tiếp theo được phép bắt đầu.
  - Các Step 5.1–5.7 chưa bắt đầu.

## Next Session

### Objective
Phase 4 đã đóng code baseline. Step 5.0 đã LOCK sau user acceptance controlled unlock GAP-01–03 và bốn gate đã approved; UI chưa bắt đầu. Step 4.5.6 vẫn chỉ kích hoạt khi domain `hoangsuphi.vn`, DNS và sender domain đã sẵn sàng.
- **Current Phase**: Phase 5 Step 5.1 — Design System & Frontend Foundation authorized, not started.
- **Current Session**: SESSION #051
- **Completed**: Step 5.0 route/API/UX blueprint, public catalog archive/detail, references, contact projection, migration, verification, decision gates và final user acceptance; Phase 4 code baseline ngoài scope vẫn 🔒 LOCKED.
- **Next Step**: Bắt đầu Step 5.1 theo brand direction đã duyệt, không thêm map SDK và không thay đổi các contract đã khóa.

### Phase 4.2 Completion Summary
- Repository: `ST_DWithin` + `ST_Distance` + `UNION ALL` 4 entity types + LEFT JOIN LATERAL reviews
- Service: HMAC-SHA256 cursor (fingerprint bound to lat/lng/radius/entityTypes)
- HTTP: Controller, route `/api/v1/nearby`, DI, RFC 7807 errors, lat/lng/cursor log redaction
- Tests: 85/85 pass, 0 fail, 0 skip với dedicated PostgreSQL/PostGIS database; full regression 1052 pass, 0 fail
- Performance: 25 km DB p95 = 89,47 ms < 150 ms; 27 scenarios × 30 mẫu; raw samples + 9 current-query EXPLAIN files
- Security: cursor replay protection, no internal data leak, log redaction clean

### Important Notes
- Phase 4.2 architecture is LOCKED. Do not modify nearby module without explicit unlock.
- Biome override for `**/benchmark/**/*.ts`: `noConsoleLog: off` added to biome.json.

---

*Tài liệu được tạo và bảo trì bởi AI Agent Antigravity (Google DeepMind)*
*Cập nhật lần cuối: 2026-07-16T00:30:00+07:00*

---

## AUTHORITATIVE CLOSEOUT — SESSION #045 (2026-07-20)

- 🔒 Phase 4 (Production Features) — **MVP CODE BASELINE LOCKED**.
- Phase 4.1–4.4 và 4.6–4.8: **LOCKED**.
- Phase 4.5: **CODE BASELINE LOCKED**; Step 4.5.6 production Resend activation vẫn chờ mua domain, xác minh DNS và sender.
- Fresh audit: backend **1429 pass, 0 fail, 3 conditional Cloudinary smoke skips**; frontend unit **39/39** và production runtime **29/29**; backend/frontend typecheck, lint và build đều pass.
- Giữ nguyên ngoại lệ đã duyệt: Search `<100 ms` không đạt. Cloudinary real-provider smoke evidence đã tồn tại trong closeout Phase 4.3.
- Phase 4.8 closeout: `backend/docs/04.08.02-harvest-public-read-model-closeout.md`.
- Phase 4 umbrella closeout: `backend/docs/04.00-phase-4-final-audit-closeout.md`.
- Chưa bắt đầu Phase 5.

---

## AUTHORITATIVE PLANNING RECORD — SESSION #046 (2026-07-20)

- 📋 Phase 5 Frontend roadmap đã được chốt và đưa vào tài liệu.
- Phase 5 implementation chưa bắt đầu; không có source code, dependency hoặc architecture runtime nào bị thay đổi trong phiên này.
- Step 5.0 Frontend Contract & UX Blueprint là next step duy nhất được phép bắt đầu khi có yêu cầu.
- Các gate Map provider, auth/session, Profile API, brand assets, public route taxonomy và aggregate/archive API phải được duyệt trước implementation liên quan.
- Phase 3–4 vẫn LOCKED; mọi backend gap chỉ được xử lý qua controlled-unlock riêng.

---

## CONTROLLED UNLOCK IMPLEMENTATION RECORD — SESSION #049 (2026-07-20)

- ✅ GAP-01 archive/detail read projection, GAP-03 public references và GAP-02 verified contact projection đã implement theo đúng thứ tự được duyệt.
- Migration `0021_modern_thena.sql` chỉ tạo bảng additive `business_public_contacts`, không alter/drop/backfill bảng Phase 3–4.
- Public routes read-only, no-store; strict slug/filter allowlist, HMAC keyset cursor, eligibility tại SQL boundary và DTO không lộ media/contact internals.
- Verification: public-catalog unit/HTTP 7/7; PostgreSQL/PostGIS thật 7/7, gồm benchmark 60-row fixture; backend 1.353 pass, 123 conditional skip, 0 fail; typecheck/lint/build/diff check pass.
- DG-5.0-01–04 đã được phê duyệt sau record này; xem `docs/phase-5/step-5.0/23-step-5.0-approved-decisions.md`.
- Step 5.0 đã LOCK theo user acceptance; UI Phase 5 chưa bắt đầu. Step 5.1 được phép bắt đầu.

---

## AUTHORITATIVE STEP 5.0 LOCK RECORD — SESSION #051 (2026-07-20)

- User đã chấp nhận closeout `GAP-01 → GAP-03 → GAP-02`; evidence giữ tại `docs/phase-5/step-5.0/22-public-catalog-implementation-closeout.md`.
- DG-5.0-01 đến DG-5.0-04 đã approved và được ghi tại `docs/phase-5/step-5.0/23-step-5.0-approved-decisions.md`.
- 🔒 **Step 5.0 Frontend Contract & UX Blueprint — LOCKED.**
- Không sửa source code, schema, dependency hoặc contract đã khóa trong phiên acceptance này.
- ⬜ **Step 5.1 Design System & Frontend Foundation — AUTHORIZED, NOT STARTED.**
