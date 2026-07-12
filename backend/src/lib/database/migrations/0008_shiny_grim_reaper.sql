CREATE TABLE IF NOT EXISTS "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"media_type" varchar(50) NOT NULL,
	"file_size" integer NOT NULL,
	"hash" varchar(64) NOT NULL,
	"status" varchar(50) DEFAULT 'UPLOADING' NOT NULL,
	"owner_type" varchar(50),
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_metadata" (
	"id" uuid PRIMARY KEY NOT NULL,
	"media_id" uuid NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"media_id" uuid NOT NULL,
	"variant_type" varchar(50) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"width" integer,
	"height" integer,
	"file_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_metadata" ADD CONSTRAINT "media_metadata_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_hash_idx" ON "media" USING btree ("hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_owner_idx" ON "media" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_status_idx" ON "media" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_metadata_media_id_idx" ON "media_metadata" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_variants_media_id_idx" ON "media_variants" USING btree ("media_id");