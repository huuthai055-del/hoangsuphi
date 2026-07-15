DO $migration$
BEGIN
	IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
		RAISE EXCEPTION 'Vietnamese FTS requires PostgreSQL 17.x; current server_version_num=%',
			current_setting('server_version_num');
	END IF;
END
$migration$;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";
--> statement-breakpoint
DO $migration$
DECLARE
	extension_schema text;
BEGIN
	SELECT namespace.nspname
	INTO extension_schema
	FROM pg_catalog.pg_extension AS extension
	INNER JOIN pg_catalog.pg_namespace AS namespace
		ON namespace.oid = extension.extnamespace
	WHERE extension.extname = 'unaccent';

	IF extension_schema IS DISTINCT FROM 'public' THEN
		RAISE EXCEPTION 'The unaccent extension must be installed in public; current schema=%',
			COALESCE(extension_schema, '<not-installed>');
	END IF;
END
$migration$;
--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION "public"."hsp_vietnamese" (
	COPY = "pg_catalog"."simple"
);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION "public"."hsp_vietnamese"
	ALTER MAPPING FOR
		asciiword,
		word,
		numword,
		asciihword,
		hword,
		numhword,
		hword_asciipart,
		hword_part,
		hword_numpart
	WITH "public"."unaccent", "pg_catalog"."simple";
--> statement-breakpoint
COMMENT ON TEXT SEARCH CONFIGURATION "public"."hsp_vietnamese"
	IS 'hsp-search/04.01.02/config-v1';
