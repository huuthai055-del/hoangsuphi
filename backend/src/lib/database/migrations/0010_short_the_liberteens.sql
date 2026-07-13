DO $$ BEGIN
 CREATE TYPE "public"."itinerary_item_owner_type" AS ENUM('PLACE', 'BUSINESS', 'ATTRACTION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."itinerary_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."itinerary_visibility" AS ENUM('PUBLIC', 'PRIVATE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "itineraries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"visibility" "itinerary_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"status" "itinerary_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "itinerary_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"owner_type" "itinerary_item_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"display_order" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "itineraries_created_by_idx" ON "itineraries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "itineraries_status_idx" ON "itineraries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "itineraries_created_at_idx" ON "itineraries" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "itinerary_items_uniq_idx" ON "itinerary_items" USING btree ("itinerary_id","owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "itinerary_items_day_order_uniq_idx" ON "itinerary_items" USING btree ("itinerary_id","day_number","display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "itinerary_items_itinerary_id_idx" ON "itinerary_items" USING btree ("itinerary_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "itinerary_items_owner_idx" ON "itinerary_items" USING btree ("owner_type","owner_id");--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_day_number_check" CHECK ("day_number" >= 1 AND "day_number" <= 365);--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_display_order_check" CHECK ("display_order" >= 1);