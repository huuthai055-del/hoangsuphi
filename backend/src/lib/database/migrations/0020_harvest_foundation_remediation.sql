DO $$ BEGIN
  ALTER TABLE "harvest_updates"
    ADD CONSTRAINT "harvest_updates_stage_check"
    CHECK (stage IN ('PREPARING', 'TRANSPLANTING', 'GREEN', 'RIPENING', 'GOLDEN', 'HARVESTING', 'OFF_SEASON'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "harvest_updates"
    ADD CONSTRAINT "harvest_updates_status_check"
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "harvest_updates"
    ADD CONSTRAINT "harvest_updates_published_at_check"
    CHECK (
      (status = 'DRAFT' AND published_at IS NULL)
      OR (status IN ('PUBLISHED', 'ARCHIVED') AND published_at IS NOT NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "permissions" ("code", "name", "description")
VALUES ('harvest:write', 'Harvest Write', 'Create and manage harvest status updates')
ON CONFLICT ("code") DO UPDATE
SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "updated_at" = now();
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT roles.id, permissions.id
FROM "roles"
CROSS JOIN "permissions"
WHERE roles.code IN ('admin', 'editor')
  AND permissions.code = 'harvest:write'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
