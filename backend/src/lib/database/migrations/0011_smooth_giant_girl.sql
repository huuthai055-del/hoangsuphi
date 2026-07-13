DO $$ BEGIN
 CREATE TYPE "public"."faq_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."top_list_item_owner_type" AS ENUM('PLACE', 'BUSINESS', 'ATTRACTION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."top_list_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100),
	"display_order" integer DEFAULT 1 NOT NULL,
	"status" "faq_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "top_list_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"top_list_id" uuid NOT NULL,
	"owner_type" "top_list_item_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "top_lists" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"slug" varchar(255) NOT NULL,
	"category" varchar(100),
	"featured" boolean DEFAULT false NOT NULL,
	"status" "top_list_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "top_list_items" ADD CONSTRAINT "top_list_items_top_list_id_top_lists_id_fk" FOREIGN KEY ("top_list_id") REFERENCES "public"."top_lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "top_lists" ADD CONSTRAINT "top_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_status_idx" ON "faqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_category_idx" ON "faqs" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_display_order_idx" ON "faqs" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_deleted_at_idx" ON "faqs" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "top_list_items_uniq_idx" ON "top_list_items" USING btree ("top_list_id","owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "top_list_items_display_order_uniq_idx" ON "top_list_items" USING btree ("top_list_id","display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "top_list_items_top_list_id_idx" ON "top_list_items" USING btree ("top_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "top_list_items_owner_idx" ON "top_list_items" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "top_lists_slug_uniq_idx" ON "top_lists" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "top_lists_status_idx" ON "top_lists" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "top_lists_category_idx" ON "top_lists" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "top_lists_featured_idx" ON "top_lists" USING btree ("featured");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "top_lists_deleted_at_idx" ON "top_lists" USING btree ("deleted_at");