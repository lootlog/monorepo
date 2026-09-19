-- A vanity URL equal to another Organization's id used to resolve that id to
-- the wrong Organization. Clear every stored value the API now rejects: one
-- whose slug is empty, all digits (Organization ids are Discord snowflakes) or
-- the reserved `battles` route. The slug expression mirrors generateSlug in
-- apps/api/src/shared/generate-slug.ts. Affected Organizations stay reachable
-- by id and can pick a new vanity URL.
UPDATE "Guild"
SET "vanityUrl" = NULL
WHERE "vanityUrl" IS NOT NULL
  AND trim(BOTH '-' FROM regexp_replace(lower("vanityUrl"), '[^a-z0-9]+', '-', 'g'))
      ~ '^([0-9]*|battles)$';
--> statement-breakpoint
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_vanityUrl_not_id_like_check" CHECK ("vanityUrl" <> '' AND "vanityUrl" !~ '^[0-9]+$');
