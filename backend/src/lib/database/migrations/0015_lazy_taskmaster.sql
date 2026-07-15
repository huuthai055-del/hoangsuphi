-- MIGRATION 0015: ADD SPATIAL GIST INDEXES
-- WARNING: This migration uses standard CREATE INDEX which locks writes on the tables.
-- FOR PRODUCTION: Execute these statements outside of a transaction block using CONCURRENTLY:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "tourist_places_location_gist_idx" ON "tourist_places" USING gist ("location");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "businesses_location_gist_idx" ON "businesses" USING gist ("location");

CREATE INDEX IF NOT EXISTS "tourist_places_location_gist_idx" ON "tourist_places" USING gist ("location");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_location_gist_idx" ON "businesses" USING gist ("location");