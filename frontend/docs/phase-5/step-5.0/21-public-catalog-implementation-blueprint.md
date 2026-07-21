# Public Catalog Implementation Blueprint & Test Plan

**Ngày:** 2026-07-20
**Phạm vi:** controlled unlock additive GAP-01 → GAP-03 → GAP-02
**Contract nguồn:** `20-public-read-controlled-unlock-contract.md`

## 1. Mục tiêu

Cung cấp read-model riêng cho giao diện khách truy cập, không dùng legacy CRUD làm public fallback và không thay đổi hành vi của các module Phase 3–4 đã khóa.

Các public path mới đều read-only, `no-store`, strict validation và chỉ trả DTO whitelist:

- Archive/detail: Business, Place, Attraction, Article và Region.
- Reference: Business Type, Amenity, Article Category, Attraction Category và Region.
- Contact: chỉ Business đã publish, verify và xác nhận consent.

Map provider, frontend BFF/Auth, Profile và Brand không thuộc unlock này.

## 2. Kiến trúc

```text
GET /api/v1/public/*
        │
        ▼
PublicCatalogController
        │ strict Zod params/query
        ▼
PublicCatalogService
        │ DTO whitelist + signed cursor + URL/contact safety
        ▼
DrizzlePublicCatalogRepository
        │ parameterized SQL, eligibility at query boundary
        ▼
PostgreSQL/PostGIS + READY owner-scoped Media
```

Module additive đặt tại `backend/src/modules/public-catalog/`:

- `public-catalog.dto.ts`: query/slug/kind allowlist.
- `public-catalog.cursor.ts`: opaque HMAC cursor bind kind/filter/sort/limit.
- `public-catalog.repository.ts`: read-model SQL riêng, một query cho mỗi list/detail/reference.
- `public-catalog.service.ts`: public DTO, canonical path, media URL và contact mapper.
- `public-catalog.controller.ts` + `public-catalog.route.ts`: HTTP boundary và `no-store`.

Schema additive đặt tại `backend/src/lib/database/schema/public-catalog.ts`; migration `0021_modern_thena.sql` chỉ tạo `business_public_contacts`, FK/index/check constraints và không alter/drop bảng legacy.

## 3. Eligibility fail-closed

| Projection | Điều kiện public |
| --- | --- |
| Business | `active`, chưa xóa, Region chưa xóa, Business Type active |
| Place | `active`, chưa xóa, Region chưa xóa |
| Attraction | `active`, chưa xóa, Region chưa xóa |
| Article | `published`, `publishedAt <= now`, chưa xóa |
| Region | chưa xóa |
| Review aggregate | chỉ `APPROVED`, chưa xóa |
| Media | đúng owner, `IMAGE`, `READY`, chưa xóa; ưu tiên large → medium → original |
| Contact | Business eligible; contact `published`, chưa xóa, có consent và verification |

Schema hiện hữu chỉ có `business_types.is_active` và `regions.deleted_at`; Amenity/Article Category/Attraction Category không có lifecycle flag. Để không alter bảng đã khóa, reference không có lifecycle flag chỉ được public khi đang được một entity public-eligible sử dụng. Đây là projection fail-closed additive, không phải thay đổi domain schema.

## 4. API contract

- `GET /api/v1/public/catalog/:kind`
- `GET /api/v1/public/catalog/:kind/:slug`
- `GET /api/v1/public/references/:kind`

Catalog kind: `businesses`, `places`, `attractions`, `articles`, `regions`.
Reference kind: `business-types`, `amenities`, `article-categories`, `attraction-categories`, `regions`.

List mặc định `limit=20`, tối đa 50; cursor HMAC có deterministic keyset và tie-breaker UUID. Query lạ, lặp, sai slug hoặc filter không thuộc entity đều bị từ chối. Unknown/ineligible detail trả generic 404, không tiết lộ trạng thái nội bộ.

## 5. Contact governance

`business_public_contacts` là quan hệ một-một với Business. Database check constraints bảo đảm:

- status chỉ `draft|published`;
- phone đúng E.164 nếu có;
- Zalo chỉ `https://zalo.me/...`;
- website chỉ HTTPS;
- contact `published` bắt buộc có consent, verification, chưa xóa và ít nhất một CTA.

Public DTO chỉ có `phoneTel`, `phoneDisplay`, `zaloUrl`, `websiteUrl`; không trả publication/verification/consent/audit field và không suy diễn Zalo từ phone.

## 6. Test plan

1. Unit/HTTP: strict query, slug/kind allowlist, HMAC roundtrip/tamper/replay, DTO whitelist, canonical path, no-store, generic 404.
2. PostgreSQL: active/draft/deleted/future eligibility, list-detail parity, reference eligibility, stable cursor, READY owner media, contact consent/verification constraints.
3. Query budget: mỗi list/detail/reference dùng đúng một DB query, không N+1.
4. Zero-write: snapshot fixture không đổi sau các public request.
5. Regression: full backend tests, TypeScript, Biome lint và production build.

## 7. Điều kiện hoàn thành unlock

- GAP-01 archive/detail projection pass unit + PostgreSQL integration.
- GAP-03 reference endpoints chỉ trả public-eligible taxonomy.
- GAP-02 contact projection không lộ draft/unverified/no-consent data.
- Migration không có drift ngoài bảng additive.
- Phase 3–4 regression không đổi.

