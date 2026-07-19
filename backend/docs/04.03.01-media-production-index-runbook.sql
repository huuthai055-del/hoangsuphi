-- =============================================================================
-- PRODUCTION INDEX RUNBOOK: PHASE 4.3 — MEDIA UPLOAD
-- =============================================================================
-- Mô tả: Chứa các lệnh tạo index concurrently và catalog validation check ngoài transaction.
-- Cách chạy: Chạy trực tiếp qua psql hoặc Client tool ngoài transaction block.
-- Tuyệt đối KHÔNG gộp vào file migration chính chạy qua transactional runner.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BƯỚC 1: TẠO INDEX CONCURRENTLY
-- -----------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS "media_scoped_hash_idx" 
ON "media" ("uploaded_by", "owner_type", "owner_id", "hash");

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "media_unbound_active_hash_unique_idx" 
ON "media" ("uploaded_by", "hash")
WHERE "owner_type" IS NULL 
  AND "owner_id" IS NULL 
  AND "deleted_at" IS NULL 
  AND "status" IN ('UPLOADING', 'PROCESSING', 'READY');

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "media_variants_media_id_variant_type_unique_idx" 
ON "media_variants" ("media_id", "variant_type");

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "media_metadata_media_id_unique_idx" 
ON "media_metadata" ("media_id");

-- -----------------------------------------------------------------------------
-- BƯỚC 2: XÁC MINH CẤU TRÚC VÀ TÍNH HỢP LỆ CỦA INDEX (CATALOG VALIDATION CHECK)
-- -----------------------------------------------------------------------------
-- Chạy truy vấn sau để đối chiếu chi tiết:
SELECT 
  i.relname AS index_name,
  ix.indisvalid,
  ix.indisready,
  ix.indisunique AS is_unique,
  pg_get_indexdef(ix.indexrelid) AS index_definition
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE i.relname IN (
  'media_scoped_hash_idx',
  'media_unbound_active_hash_unique_idx',
  'media_variants_media_id_variant_type_unique_idx',
  'media_metadata_media_id_unique_idx'
);

-- =============================================================================
-- MANIFEST ĐỊNH NGHĨA KỲ VỌNG:
-- =============================================================================
-- 1. media_scoped_hash_idx:
--    - indisvalid = true
--    - indisready = true
--    - is_unique = false
--    - index_definition chứa: USING btree (uploaded_by, owner_type, owner_id, hash)
--
-- 2. media_unbound_active_hash_unique_idx:
--    - indisvalid = true
--    - indisready = true
--    - is_unique = true
--    - index_definition chứa: USING btree (uploaded_by, hash) WHERE ((owner_type IS NULL) AND (owner_id IS NULL) AND (deleted_at IS NULL) AND ((status)::text = ANY ((ARRAY['UPLOADING'::character varying, 'PROCESSING'::character varying, 'READY'::character varying])::text[])))
--
-- 3. media_variants_media_id_variant_type_unique_idx:
--    - indisvalid = true
--    - indisready = true
--    - is_unique = true
--    - index_definition chứa: USING btree (media_id, variant_type)
--
-- 4. media_metadata_media_id_unique_idx:
--    - indisvalid = true
--    - indisready = true
--    - is_unique = true
--    - index_definition chứa: USING btree (media_id)
-- =============================================================================

-- *HÀNH ĐỘNG KHI GẶP LỖI (FORWARD-FIX):
-- Nếu indisvalid hoặc indisready trả về false, hoặc index_definition lệch so với manifest kỳ vọng:
-- Quản trị viên chạy:
-- DROP INDEX CONCURRENTLY IF EXISTS "index_name";
-- Sau đó thực thi lại câu lệnh tạo index concurrently tương ứng.

-- -----------------------------------------------------------------------------
-- BƯỚC 3: CẬP NHẬT OPTIMIZER STATISTICS
-- -----------------------------------------------------------------------------
ANALYZE "media";
ANALYZE "media_variants";
ANALYZE "media_metadata";
