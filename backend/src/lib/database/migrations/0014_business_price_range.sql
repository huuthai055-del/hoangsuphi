ALTER TABLE "businesses" ADD COLUMN "price_min" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "price_max" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_price_range_check" CHECK (
  ("price_min" IS NULL AND "price_max" IS NULL)
  OR (
    "price_min" IS NOT NULL
    AND "price_max" IS NOT NULL
    AND "price_min" >= 0
    AND "price_max" >= "price_min"
  )
);--> statement-breakpoint
-- Phase 3 security drift fix: Media ownership code already persists this field, but migration history omitted it.
ALTER TABLE "media" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_active_price_min_idx" ON "businesses" USING btree ("price_min") WHERE "businesses"."deleted_at" IS NULL AND "businesses"."status" = 'active' AND "businesses"."price_min" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_active_price_max_idx" ON "businesses" USING btree ("price_max") WHERE "businesses"."deleted_at" IS NULL AND "businesses"."status" = 'active' AND "businesses"."price_max" IS NOT NULL;
