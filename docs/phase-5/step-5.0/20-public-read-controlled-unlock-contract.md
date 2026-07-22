# Controlled Unlock Contract — Public Read, Contact and Taxonomy

**Trạng thái:** 🔒 LOCKED — implementation accepted by user on 2026-07-20

**Phạm vi được phê duyệt:** GAP-01, GAP-02 và GAP-03. Đây là controlled unlock additive, chỉ thêm public read model/contract; không thay đổi hành vi, DTO hay route CRUD legacy của Phase 3–4.

## 1. Mục tiêu và ranh giới

Tạo một lớp đọc công khai dành riêng cho giao diện khách truy cập để có thể phát hành archive, detail và CTA liên hệ an toàn.

- Không sửa các route legacy `/businesses`, `/places`, `/attractions`, `/articles`, `/regions`.
- Không dùng các route legacy làm implementation shortcut hay fallback cho public UI.
- Không thay đổi SEO projection/metadata/redirect contract Phase 4.4/4.6; public catalog là nguồn dữ liệu UI, SEO projection hiện hữu tiếp tục là nguồn metadata.
- Không thêm booking, payment, user profile, auth session, map provider hay admin CMS.
- Mọi endpoint mới read-only, không ghi DB/Redis và chỉ trả DTO whitelist.

## 2. Module và route additive đề xuất

Thêm module presentation/read-model riêng `public-catalog`, mount tại `/api/v1/public`.

| Route | Mục đích | Phase 5 consumer |
| --- | --- | --- |
| `GET /api/v1/public/catalog/businesses` | Archive cơ sở public-safe | `/co-so`, homepage cards |
| `GET /api/v1/public/catalog/businesses/:slug` | Detail cơ sở + contact đã xác minh | `/co-so/[slug]` |
| `GET /api/v1/public/catalog/places` và `/:slug` | Archive/detail địa điểm | `/dia-diem` và detail |
| `GET /api/v1/public/catalog/attractions` và `/:slug` | Archive/detail attraction/utility | `/tien-ich` và detail |
| `GET /api/v1/public/catalog/articles` và `/:slug` | Archive/detail cẩm nang | `/cam-nang` và detail |
| `GET /api/v1/public/catalog/regions` và `/:slug` | Khám phá khu vực và region navigation | `/khu-vuc` và detail |
| `GET /api/v1/public/references/business-types` | Loại cơ sở public | Filter Lưu trú/Ăn uống |
| `GET /api/v1/public/references/amenities` | Tiện ích public | Filter cơ sở |
| `GET /api/v1/public/references/article-categories` | Danh mục cẩm nang public | Filter cẩm nang |
| `GET /api/v1/public/references/attraction-categories` | Danh mục attraction public | Filter attraction/utility |
| `GET /api/v1/public/references/regions` | Region tree public | Điều hướng/filter/Search bridge |

Các route có thể được tách thành router con, nhưng URL public nêu trên là contract frontend. Không thêm route generic proxy hay endpoint trả raw entity.

## 3. Public eligibility (fail closed)

Một bản ghi chỉ xuất hiện ở **cả list và detail** khi toàn bộ điều kiện phù hợp đều đúng:

| Entity | Điều kiện tối thiểu |
| --- | --- |
| Business / Place / Attraction | `status = active`, không soft-delete, Region liên kết public/active; reference type/category nếu có phải active. |
| Article | `status = published`, `publishedAt <= now`, không soft-delete; category nếu có phải active. |
| Region | active, không soft-delete và thuộc cây region public. |
| Reference | active, không soft-delete; không trả record nội bộ/không còn hiệu lực. |
| Media | Chỉ URL public-safe/READY theo policy Media/SEO hiện hữu; không trả storage key, provider secret hoặc media draft. |

Mọi join không thỏa eligibility làm record không tồn tại với public caller (404 cho detail, không có trong list). Không trả lý do visibility để tránh enumeration.

## 4. DTO và pagination

### Archive card whitelist

Tất cả archive dùng discriminated DTO gồm: `kind`, `id`, `slug`, `name`/`title`, `summary`, `canonicalPath`, `region` (nếu có), `image` public-safe, `rating` aggregate public (nếu có), `price` chỉ với Business, và `updatedAt` public khi cần hiển thị.

Không trả trạng thái nội bộ, ownership, audit fields, raw media, permission, user/contact draft hay trường database không thuộc UI contract.

### Detail whitelist

Detail thêm mô tả đầy đủ, public location, media gallery public-safe, taxonomy/amenity public, rating public và related item public-safe. Business detail có thêm trường `contact` theo phần 5. `contact` luôn `null` khi thiếu hoặc không được xuất bản; frontend phải ẩn CTA tương ứng.

### Cursor

- List dùng keyset cursor opaque, signed HMAC; `limit` mặc định 20, tối đa 50.
- Cursor bind với version, entity kind, normalized filter/sort/limit và các sort key; frontend không decode hoặc sửa cursor.
- Sort chỉ dùng allowlist và luôn có tie-breaker `id`; default order được ghi rõ theo entity trong implementation spec.
- Cursor tamper, sai filter hoặc sai entity trả RFC 7807 validation error; không quay về offset/page.
- Query public chỉ nhận allowlist filter. URL UI ưu tiên slug có public reference (`businessTypeSlug`, `regionSlug`, `amenitySlugs`, category slug); server resolve slug trong read repository, không hardcode UUID ở frontend.

## 5. Contact projection (Business P0)

Thêm bảng additive `business_public_contacts`, khóa một-một theo Business, không thêm cột vào entity Business locked.

| Field | Quy tắc public |
| --- | --- |
| `businessId` | FK, không được public nếu Business không eligible. |
| `phoneE164` | nullable; chỉ trả `phoneTel` đã chuẩn hóa và `phoneDisplay` khi có consent/verification. |
| `zaloUrl` | nullable; chỉ `https://zalo.me/...` hoặc URL được allowlist; không suy diễn từ phone. |
| `websiteUrl` | nullable HTTPS URL đã kiểm tra. |
| `publicationStatus`, `verifiedAt`, `updatedAt` | Nội bộ; chỉ dùng để quyết định public eligibility, không mặc định expose. |

Chỉ contact có `publicationStatus = published`, `verifiedAt` hợp lệ và Business eligible mới đi vào detail DTO. Các CTA Gọi/Zalo/Website render độc lập theo field có mặt. Attraction/Place giữ CTA chỉ đường; contact cho các entity này là scope extension riêng.

## 6. Kiến trúc thực thi và migration

1. Migration chỉ tạo bảng `business_public_contacts` và indexes additive cần thiết; không alter/drop bảng Phase 3–4, không backfill dữ liệu giả.
2. `public-catalog` có repository SQL/read model riêng, service projection, Zod query validation, DTO mapper, controller và route.
3. Repository áp dụng eligibility tại query boundary, fetch batch media/rating/reference để tránh N+1 và không gọi Domain Service CRUD locked.
4. Không cache công khai theo mặc định trong unlock đầu tiên; fetch policy frontend giữ `no-store` cho đến khi có cache contract được audit riêng.
5. Seed/fixture contact chỉ có khi dữ liệu consent/verified; thiếu dữ liệu phải chứng minh CTA bị ẩn.

## 7. Verification gate trước khi khóa lại

- Unit/contract tests: query validation, DTO whitelist, canonical path, cursor signing/replay/tamper.
- PostgreSQL integration: inactive/draft/deleted/future records, inactive region/reference, list-detail parity, media safety, stable cursor không duplicate/omission và zero write.
- Contact tests: draft/unverified/no-consent contact không lộ; phone không tạo Zalo; `zaloUrl` invalid bị loại; deleted/inactive Business không lộ contact.
- Performance: query count/batch evidence, không N+1; benchmark representative list/detail trên PostgreSQL.
- Regression: toàn bộ test Phase 3–4, SEO/redirect runtime và legacy CRUD contract tiếp tục pass không đổi.
- Security review: response không lộ internal ID/key/audit/ownership, cursor/request logs redacted và tất cả public paths read-only.

## 8. Trình tự implementation được phép

1. Viết implementation blueprint/test plan cho module `public-catalog` và migration contact.
2. Implement + verify GAP-01 public catalog/read projection.
3. Implement + verify GAP-03 reference endpoints.
4. Implement + verify GAP-02 contact projection; chỉ sau đó mở direct-contact CTA ở frontend.
5. Cập nhật Step 5.0 closeout bằng evidence; Step 5.1 UI chỉ bắt đầu khi các gate phụ thuộc của nó cũng được phê duyệt.

Approval controlled unlock này không tự phê duyệt các gate khác. Các gate DG-5.0-01 đến DG-5.0-04 sau đó đã được quyết định riêng tại `23-step-5.0-approved-decisions.md`.
