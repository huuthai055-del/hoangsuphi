CREATE TABLE IF NOT EXISTS "harvest_updates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region_id" uuid NOT NULL,
	"stage" varchar(50) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"title" varchar(150) NOT NULL,
	"summary" varchar(2000) NOT NULL,
	"advisory" varchar(1500),
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "regions" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "harvest_updates" ADD CONSTRAINT "harvest_updates_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "harvest_updates" ADD CONSTRAINT "harvest_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "harvest_updates_public_timeline_idx" ON "harvest_updates" USING btree ("region_id","observed_at","id") WHERE status = 'PUBLISHED' AND deleted_at IS NULL;