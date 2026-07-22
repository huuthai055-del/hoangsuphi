# Page-to-API Matrix

| Page / Section | Verified contract | Render/cache | Status / constraint |
| :--- | :--- | :--- | :--- |
| Harvest current | `GET /api/v1/harvest-status` | Server, `no-store` | READY |
| Harvest region timeline | `GET /api/v1/harvest-status/regions/:slug` | Server, `no-store` | READY |
| Existing entity SEO shell | `GET /api/v1/seo/pages/:pageGroup/:slug` | Server, `no-store` | READY for metadata/public-safe projection |
| Homepage composition | Harvest plus public catalog modules | `Promise.allSettled`, component fallbacks | DATA CONTRACT LOCKED; không gọi legacy lists |
| Search/filter | `GET /api/v1/search` | SSR initial result + client island | READY; `q` min 2 if supplied, at least one criterion, signed cursor |
| Nearby / “Gần tôi” | `GET /api/v1/nearby?lat=&lng=&...` | Client distance-list island | READY; `lat`/`lng` required, signed cursor; không có map SDK/`/ban-do` |
| Recommendations | `GET /api/v1/recommendations` | Server/client island by page | READY only with its source/strategy contract |
| Public reviews | `GET /api/v1/owners/:ownerType/:ownerId/reviews` | Server/client island | READY; use uppercase owner types |
| Favorites | `GET/POST/DELETE /api/v1/favorites...` | BFF, `no-store` | DG-5.0-02 approved; BFF chưa triển khai; current pagination is offset |
| Login/register | `POST /api/v1/auth/login`, `/register` | BFF mutation, `no-store` | DG-5.0-02 approved; browser không giữ token thô |
| Verify/recovery | `/auth/email-verification/confirm`, `/auth/password/forgot`, `/auth/password/reset` | BFF mutation, `no-store` | Chỉ thêm theo allowlist/use case Phase 5 |
| Public catalog/archive/detail | `/api/v1/public/catalog/*` | Server, `no-store` | 🔒 ACCEPTED & LOCKED with Step 5.0 |
| Public references | `/api/v1/public/references/*` | Server/client filter source, `no-store` | IMPLEMENTED & VERIFIED; resolve nhãn filter, không hard-code UUID |
| Legacy Business/Place/Attraction/Region/Article lists | CRUD routes with `page`/`limit` | Do not use for public Phase 5 UI | BLOCKED — not public-safe/cursor contract |
| Contact / directions CTA | Business contact projection; public catalog `location` | Render có điều kiện | IMPLEMENTED DATA; CTA chỉ hiện khi contact/tọa độ hợp lệ |

*Rules:*

- Do not decode, mutate or replace Search/Nearby opaque cursors.
- Do not apply a `revalidate` policy to the existing SEO/Harvest fetches that currently require `no-store`.
- Never use `GET /api/v1/reviews` for public reviews: it is protected.
- `GET /api/v1/auth/me` does not exist and must not be implemented by a frontend mock.
