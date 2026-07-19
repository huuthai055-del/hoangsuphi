CREATE TABLE IF NOT EXISTS "redirects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_path" text NOT NULL,
	"target_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "redirects" ADD CONSTRAINT "status_code_check" CHECK ("redirects"."status_code" IN (301, 302));
--> statement-breakpoint
ALTER TABLE "redirects" ADD CONSTRAINT "source_target_check" CHECK ("redirects"."source_path" <> "redirects"."target_path");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "redirects" ADD CONSTRAINT "redirects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "redirects_active_source_idx" ON "redirects" USING btree ("source_path") WHERE "redirects"."is_active" = true AND "redirects"."deleted_at" IS NULL;
