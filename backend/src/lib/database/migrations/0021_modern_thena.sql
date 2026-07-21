CREATE TABLE IF NOT EXISTS "business_public_contacts" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"phone_e164" varchar(16),
	"zalo_url" varchar(512),
	"website_url" varchar(512),
	"publication_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"consent_confirmed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "business_public_contacts_publication_status_check" CHECK ("publication_status" IN ('draft', 'published')),
	CONSTRAINT "business_public_contacts_phone_format_check" CHECK ("phone_e164" IS NULL OR "phone_e164" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "business_public_contacts_zalo_url_check" CHECK ("zalo_url" IS NULL OR "zalo_url" ~ '^https://zalo[.]me/[A-Za-z0-9._-]+/?$'),
	CONSTRAINT "business_public_contacts_website_url_check" CHECK ("website_url" IS NULL OR "website_url" ~ '^https://[^[:space:]]+$'),
	CONSTRAINT "business_public_contacts_published_check" CHECK (
		"publication_status" <> 'published' OR (
			"deleted_at" IS NULL
			AND "consent_confirmed_at" IS NOT NULL
			AND "verified_at" IS NOT NULL
			AND ("phone_e164" IS NOT NULL OR "zalo_url" IS NOT NULL OR "website_url" IS NOT NULL)
		)
	)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_public_contacts" ADD CONSTRAINT "business_public_contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_public_contacts_published_idx" ON "business_public_contacts" USING btree ("verified_at","business_id") WHERE "business_public_contacts"."publication_status" = 'published' AND "business_public_contacts"."deleted_at" IS NULL;
