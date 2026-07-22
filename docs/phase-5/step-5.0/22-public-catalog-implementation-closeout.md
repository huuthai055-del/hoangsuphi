# Public Catalog Controlled Unlock Closeout

**Ngày:** 2026-07-20  
**Phiên:** #049  
**Trạng thái:** 🔒 GAP-01, GAP-03 và GAP-02 implementation accepted and LOCKED by user on 2026-07-20.

## Kết quả

Đã triển khai đúng thứ tự được duyệt:

1. **GAP-01:** archive/detail public read projection cho Business, Place, Attraction, Article và Region; strict public eligibility, HMAC keyset cursor, media/rating/price/location projection và generic 404.
2. **GAP-03:** năm reference endpoint, resolve/filter bằng slug và fail-closed với taxonomy không có lifecycle flag.
3. **GAP-02:** bảng `business_public_contacts`, database constraints và Business detail contact projection có consent/verification.

Route additive được mount tại `/api/v1/public`; legacy CRUD/Search/Nearby/SEO/Redirect/Harvest contract không đổi.

## Migration evidence

- Migration: `backend/src/lib/database/migrations/0021_modern_thena.sql`.
- Chỉ tạo `business_public_contacts`, một FK cascade, một partial index và các check constraint.
- Không alter/drop/backfill bảng Phase 3–4.
- Đã migrate thành công trên database riêng `hoangsuphi_test`.

## Verification evidence

| Gate | Kết quả |
| --- | --- |
| Public-catalog unit/HTTP | 7 pass, 0 fail |
| PostgreSQL/PostGIS integration thật | 7 pass, 0 fail |
| Eligibility/list-detail parity | Pass |
| Stable signed cursor | Pass, không duplicate/omission |
| READY owner media + DTO no-leak | Pass |
| Contact constraint/CTA fail-closed | Pass |
| Reference eligibility | Pass |
| Query budget / zero-write | 1 query mỗi projection; zero-write pass |
| Representative performance | 60-row fixture; list 50/detail-related p95 < 500 ms |
| Full backend regression | 1.353 pass, 123 conditional skip, 0 fail |
| TypeScript / Biome / build | Pass / pass / pass |
| `git diff --check` | Pass |

Các conditional skip của full suite là integration/credential-gated suite hiện hữu; public-catalog PostgreSQL suite đã được chạy riêng với database thật và pass 7/7.

## Security/no-leak evidence

- Response không có `storageKey`, `storageProvider`, `nameKey`, contact publication/verification/consent hoặc audit field.
- Cursor bind kind, normalized filter, sort và limit; tamper/replay bị từ chối.
- Contact draft và contact thiếu consent/verification không xuất hiện.
- Phone không tự sinh Zalo URL; website HTTP và Zalo ngoài allowlist bị loại.
- Public endpoints không ghi PostgreSQL/Redis và mặc định `Cache-Control: no-store`.

## Phạm vi còn mở

DG-5.0-01 đến DG-5.0-04 đã được phê duyệt riêng tại `23-step-5.0-approved-decisions.md`; user đã chấp nhận closeout implementation này và Step 5.0 đã LOCK. BFF/UI Phase 5 cũng chưa được triển khai.
