DO $$ BEGIN
 CREATE TYPE "public"."article_status" AS ENUM('draft', 'under_review', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_author_id_authors_id_fk";--> statement-breakpoint
DROP TABLE "article_versions";--> statement-breakpoint
DROP TABLE "authors";
--> statement-breakpoint
DROP INDEX IF EXISTS "article_categories_slug_unique_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "articles_category_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "articles_author_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "articles_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "articles_published_at_idx";--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "status" SET DATA TYPE article_status USING status::article_status;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "status" SET DEFAULT 'draft'::article_status;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "slug" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "description" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "article_categories" ADD COLUMN "code" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "thumbnail_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "article_categories_code_unique_idx" ON "article_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "article_tags_article_id_idx" ON "article_tags" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "article_tags_tag_id_idx" ON "article_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_status_published_idx" ON "articles" USING btree ("status","published_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_category_id_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_is_featured_idx" ON "tags" USING btree ("is_featured");--> statement-breakpoint
ALTER TABLE "article_categories" DROP COLUMN IF EXISTS "slug";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "cover_url";