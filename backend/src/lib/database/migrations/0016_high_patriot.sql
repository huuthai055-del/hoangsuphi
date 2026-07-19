-- Giai đoạn 1: Preflight Data Cleanup & Hard Gates (Bảo vệ dữ liệu)
DO $$
BEGIN
  -- 1. Kiểm tra duplicate variants
  IF EXISTS (
    SELECT 1 FROM media_variants GROUP BY media_id, variant_type HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: Duplicate variants detected in media_variants table. Please run the cleanup runbook script first.';
  END IF;

  -- 2. Kiểm tra duplicate metadata
  IF EXISTS (
    SELECT 1 FROM media_metadata GROUP BY media_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: Duplicate metadata detected in media_metadata table. Please run the cleanup runbook script first.';
  END IF;

  -- 3. Kiểm tra active unbound duplicates (uploaded_by, hash)
  IF EXISTS (
    SELECT 1 FROM media 
    WHERE owner_type IS NULL AND owner_id IS NULL AND deleted_at IS NULL AND status IN ('UPLOADING', 'PROCESSING', 'READY')
    GROUP BY uploaded_by, hash 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: Duplicate active unbound media (uploaded_by, hash) detected in media table. Please run the cleanup runbook script first.';
  END IF;

  -- 4. Kiểm tra active unbound rows có uploaded_by IS NULL
  IF EXISTS (
    SELECT 1 FROM media 
    WHERE owner_type IS NULL AND owner_id IS NULL AND deleted_at IS NULL AND status IN ('UPLOADING', 'PROCESSING', 'READY') AND uploaded_by IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: Active unbound media rows with NULL uploaded_by detected. Please run the cleanup runbook script first.';
  END IF;

  -- 5. Kiểm tra owner pair lệch (một trong 2 trường null và trường còn lại không null)
  IF EXISTS (
    SELECT 1 FROM media 
    WHERE (owner_type IS NULL AND owner_id IS NOT NULL) OR (owner_type IS NOT NULL AND owner_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: Invalid owner pairs detected (one of owner_type or owner_id is NULL). Please run the cleanup runbook script first.';
  END IF;
END $$;--> statement-breakpoint

-- Giai đoạn 2: Additive DDL (Transactional)
ALTER TABLE "media" ADD COLUMN "storage_provider" varchar(50) DEFAULT 'LOCAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_storage_provider_check" CHECK (storage_provider IN ('LOCAL', 'CLOUDINARY'));--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "alt_text" varchar(255);--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "caption" varchar(500);--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_pair_check" CHECK (
  (owner_type IS NULL AND owner_id IS NULL)
  OR
  (owner_type IS NOT NULL AND owner_id IS NOT NULL)
);