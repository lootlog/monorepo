-- A vanity URL that is empty, all digits, or a reserved route could shadow
-- another Organization's id or an application route. Clear existing offenders
-- so their Organizations stay reachable by id, then forbid the id-like forms.
UPDATE "Guild"
SET "vanityUrl" = NULL
WHERE "vanityUrl" = ''
   OR "vanityUrl" ~ '^[0-9]+$'
   OR "vanityUrl" = 'battles';
--> statement-breakpoint
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_vanityUrl_not_id_like_check" CHECK ("vanityUrl" <> '' AND "vanityUrl" !~ '^[0-9]+$');
