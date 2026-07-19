DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM media
    WHERE owner_type IS NULL
      AND owner_id IS NULL
      AND deleted_at IS NULL
      AND status IN ('UPLOADING', 'PROCESSING', 'READY')
      AND uploaded_by IS NULL
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: Active unbound media rows require uploaded_by before adding media_active_unbound_uploader_check.';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "media" ADD CONSTRAINT "media_active_unbound_uploader_check" CHECK (
  NOT (
    owner_type IS NULL
    AND owner_id IS NULL
    AND deleted_at IS NULL
    AND status IN ('UPLOADING', 'PROCESSING', 'READY')
    AND uploaded_by IS NULL
  )
);
