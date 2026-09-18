-- A vanity URL that is empty, all digits, or a reserved route could shadow
-- another Organization's id or an application route. Clear existing offenders
-- so their Organizations stay reachable by id, then forbid the id-like forms.
-- The reserved names are the first path segments lootlog.pl already routes
-- elsewhere, so an Organization was never reachable under them.
UPDATE "Guild"
SET "vanityUrl" = NULL
WHERE "vanityUrl" = ''
   OR "vanityUrl" ~ '^[0-9]+$'
   OR "vanityUrl" IN (
     'battles', 'signin', 'init', 'assets', 'brand', 'lottie', 'themes',
     'docs', 'docs-assets', 'landing-assets', 'screenshots',
     'privacy-policy', 'terms-of-service'
   );
--> statement-breakpoint
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_vanityUrl_not_id_like_check" CHECK ("vanityUrl" <> '' AND "vanityUrl" !~ '^[0-9]+$');
