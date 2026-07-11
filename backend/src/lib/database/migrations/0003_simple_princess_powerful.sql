CREATE INDEX IF NOT EXISTS "attractions_region_id_idx" ON "attractions" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attractions_category_id_idx" ON "attractions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attractions_location_gist_idx" ON "attractions" USING gist ("location");