# 🗺️ PROJECT ROADMAP — CỔNG THÔNG TIN DU LỊCH HOÀNG SU PHÌ
 
> **Cập nhật lần cuối:** 2026-07-16 | **Phiên:** #032
> **Mục đích:** Theo dõi tiến độ toàn bộ vòng đời dự án từ ý tưởng đến vận hành.
 
---
 
## TỔNG QUAN TIẾN ĐỘ
 
```
Phase  0  Planning                ██████████  ✅ HOÀN THÀNH
Phase  1  Database Design         ██████████  ✅ HOÀN THÀNH
Phase  2  Backend Foundation      ██████████  ✅ HOÀN THÀNH (V1.0 Code & Docs Locked)
Phase  3  Core Modules            ██████████  ✅ PHASE COMPLETED (3.1 - 3.9 🔒 Locked)
Phase  4  Production Features (MVP Stable) ██░░░░░░░░  🚧 Đang thực hiện — 4.1 🔒; 4.2 🔒; 4.3–4.8 chưa bắt đầu
Phase  5  Frontend                ░░░░░░░░░░  ⬜ Chưa bắt đầu
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
🔒 4.1 Search     ⬜               ⬜               ⬜
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

### 🚧 PHASE 4 — PRODUCTION FEATURES (MVP STABLE) `ĐANG THỰC HIỆN`

> **Mục tiêu:** Hoàn thiện các tính năng giúp website vận hành ổn định ở quy mô cấp huyện, ưu tiên đơn giản, dễ bảo trì và có thể triển khai thực tế nhanh. Không tối ưu quá mức hay bổ sung hạ tầng phức tạp khi chưa cần thiết.

| Sub-phase | Tính năng | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **4.1** | **Search & Advanced Filter** | 🔒 LOCKED | Steps 4.1.0–4.1.6, Price và final audit hoàn tất. SLA `<100 ms` được ghi nhận là ngoại lệ, không đánh dấu pass. |
| **4.2** | **Nearby Search** | 🔒 LOCKED | PostGIS (`ST_DWithin`, `ST_Distance`) tìm địa điểm theo bán kính và sắp xếp theo khoảng cách. Warm DB p95 tại 25 km = 89,47 ms trong 30 mẫu. |
| **4.3** | **Media Upload** | ⬜ | Upload → Validate → Resize → WebP → Cloudinary → Lưu metadata. |
| **4.4** | **SEO** | ⬜ | Dynamic Sitemap, robots.txt, Canonical URL, OpenGraph, Schema.org JSON-LD. |
| **4.5** | **Email** | ✅ CODE COMPLETE | Phase 4.5 Code Complete. Production Activation (Step 4.5.6) Pending Domain. |
| **4.6** | **Redirect Management** | ⬜ | CRUD Redirects, hỗ trợ HTTP 301/302. |
| **4.7** | **Recommendation** | ⬜ | Gợi ý bằng SQL (Nearby, Top Rated, Newest, Same Region), chưa sử dụng AI. |
| **4.8** | **Live Harvest Status** | ⬜ | Module đặc thù HSP: CRUD, Timeline, Ảnh, Thông báo trạng thái mùa vụ. |

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
- [ ] Upload ảnh → Cloudinary hoạt động end-to-end.
- [ ] Ảnh tự động chuyển WebP và resize.
- [ ] Email Verify & Forgot Password hoạt động ổn định.
- [ ] Sitemap.xml và robots.txt được tạo tự động.
- [ ] Schema.org JSON-LD hiển thị đúng trên các trang chính.
- [ ] Redirect 301/302 hoạt động đúng.
- [ ] Recommendation trả kết quả phù hợp bằng SQL.
- [ ] Harvest Status hoàn chỉnh và sẵn sàng sử dụng thực tế.

> **Ngoại lệ được phê duyệt cho 4.1:** Điều kiện Search `<100 ms` không đạt nhưng được người dùng chấp nhận ngày 2026-07-14. Ô trên giữ nguyên chưa đạt để bảo toàn bằng chứng; ngoại lệ này không miễn các hạng mục closeout khác.

### Mục tiêu cuối Phase 4
- Website đủ ổn định để triển khai và kinh doanh ở quy mô cấp huyện.
- Dễ bảo trì bởi một lập trình viên.
- Có thể mở rộng lên Queue, Typesense hoặc AI trong tương lai mà không phải thay đổi kiến trúc Phase 3.

---

### ⬜ PHASE 5 — FRONTEND (Giao diện người dùng) `CHƯA BẮT ĐẦU`

> **Mục tiêu:** Xây dựng giao diện đẹp, tối ưu SEO và trải nghiệm người dùng.

| Trang / Component | Trạng thái |
| :--- | :--- |
| Design System (Colors, Typography, Components) | ⬜ |
| Landing Page / Trang chủ | ⬜ |
| Trang danh sách Homestay | ⬜ |
| Trang chi tiết Homestay | ⬜ |
| Trang danh sách Điểm tham quan | ⬜ |
| Trang chi tiết Điểm tham quan | ⬜ |
| Trang Khu vực / Region | ⬜ |
| Trang danh sách Bài viết / Cẩm nang | ⬜ |
| Trang chi tiết Bài viết | ⬜ |
| Trang Tìm kiếm + Bộ lọc | ⬜ |
| Trang Bản đồ (Interactive Map) | ⬜ |
| Trang FAQ Hub | ⬜ |
| Trang Tag | ⬜ |
| Trang Top Lists | ⬜ |
| Trang Đăng nhập / Đăng ký | ⬜ |
| Trang Profile người dùng | ⬜ |
| Trang Wishlist / Favorites | ⬜ |
| Responsive (Mobile first) | ⬜ |
| SEO Meta tags + OG tags | ⬜ |
| Schema.org JSON-LD trên từng trang | ⬜ |

**Điều kiện hoàn thành:**
- [ ] Lighthouse Score: Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 90
- [ ] Responsive từ 320px đến 1920px
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

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
- 🚧 Phase 4 (Production Features) — ĐANG THỰC HIỆN
  - Sub-phase 4.1 Search & Advanced Filter: 🔒 **LOCKED**; SLA `<100 ms` exception recorded.
  - Sub-phase 4.2 Nearby Search: 🔒 **LOCKED**; 25 km DB p95 = 89,47 ms, 85/85 Nearby tests.
  - Sub-phase 4.3 Media Upload: 🔒 **LOCKED**.
  - Sub-phase 4.4 SEO: 🔒 **LOCKED**.
  - Sub-phase 4.5 Email: ✅ **CODE COMPLETE** — PRODUCTION ACTIVATION PENDING DOMAIN.

## Next Session

### Objective
Chờ hoàn tất Step 4.5.6 (Mua domain & Production Email Activation) hoặc bắt đầu tính năng của Phase tiếp theo theo chỉ định của người dùng.

### Current Position
- **Current Phase**: Phase 4 (Production Features - MVP Stable)
- **Current Session**: SESSION #042
- **Completed**: Phase 4.1–4.4 🔒 LOCKED; Phase 4.5 ✅ CODE COMPLETE
- **Next Step**: Step 4.5.6 (Pending Domain) / Phase 4.6 Redirect Management

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
