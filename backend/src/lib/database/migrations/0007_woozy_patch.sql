DROP INDEX IF EXISTS "article_tags_article_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tags_name_idx";--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_name_unique_idx" ON "tags" USING btree ("name");