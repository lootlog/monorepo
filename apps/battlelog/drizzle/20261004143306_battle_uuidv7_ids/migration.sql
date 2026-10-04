-- Stored battle times are UTC. Converting them in a UTC session keeps every value.
SET LOCAL TimeZone = 'UTC';--> statement-breakpoint
-- The battle time a UUIDv7 battle ID encodes in its first 48 bits.
CREATE FUNCTION battle_id_created_at(id uuid) RETURNS timestamp(3) with time zone
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN to_timestamp(('x' || left(replace(id::text, '-', ''), 12))::bit(48)::bigint / 1000.0);--> statement-breakpoint
-- Every existing battle gets a UUIDv7 for its createdAt. Battles saved in the
-- same millisecond keep their previous ID order in the 12 bits after the
-- version; the remaining 62 bits come from a hash of the old ID.
CREATE TABLE "battle_legacy_ids" (
	"legacyId" text NOT NULL,
	"battleId" uuid NOT NULL
);--> statement-breakpoint
INSERT INTO "battle_legacy_ids" ("legacyId", "battleId")
SELECT
	"id",
	(
		lpad(to_hex((extract(epoch FROM "createdAt") * 1000)::bigint), 12, '0')
		|| to_hex(28672 + "tieRank")
		|| to_hex(32768 + (('x' || substr("hash", 1, 4))::bit(16)::int & 16383))
		|| substr("hash", 5, 12)
	)::uuid
FROM (
	SELECT
		"id",
		"createdAt",
		(row_number() OVER (PARTITION BY "createdAt" ORDER BY "id") - 1)::int AS "tieRank",
		md5("id") AS "hash"
	FROM "battles"
) AS "legacy";--> statement-breakpoint
ALTER TABLE "battle_legacy_ids" ADD CONSTRAINT "battle_legacy_ids_pkey" PRIMARY KEY ("legacyId");--> statement-breakpoint
ALTER TABLE "battle_legacy_ids" ADD CONSTRAINT "battle_legacy_ids_battleId_key" UNIQUE ("battleId");--> statement-breakpoint
CREATE FUNCTION pg_temp.legacy_battle_id(legacy_id text) RETURNS uuid
LANGUAGE sql STABLE STRICT
RETURN (SELECT "battleId" FROM "battle_legacy_ids" WHERE "legacyId" = legacy_id);--> statement-breakpoint
DROP INDEX "battles_userId_createdAt_idx";--> statement-breakpoint
DROP INDEX "battles_world_createdAt_idx";--> statement-breakpoint
DROP INDEX "battles_userId_world_createdAt_idx";--> statement-breakpoint
DROP INDEX "battles_characterId_createdAt_idx";--> statement-breakpoint
DROP INDEX "battles_semanticFingerprint_createdAt_idx";--> statement-breakpoint
DROP INDEX "battles_public_createdAt_idx";--> statement-breakpoint
-- Databases created before Drizzle use the older constraint name.
ALTER TABLE "battle_warriors" DROP CONSTRAINT IF EXISTS "battle_warriors_battleId_fkey";--> statement-breakpoint
ALTER TABLE "battle_warriors" DROP CONSTRAINT IF EXISTS "battle_warriors_battleId_battles_id_fkey";--> statement-breakpoint
ALTER TABLE "battle_warriors" ALTER COLUMN "battleId" SET DATA TYPE uuid USING pg_temp.legacy_battle_id("battleId");--> statement-breakpoint
ALTER TABLE "battles"
	ALTER COLUMN "id" SET DATA TYPE uuid USING pg_temp.legacy_battle_id("id"),
	ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt"::timestamp(3) with time zone,
	ALTER COLUMN "createdAt" DROP DEFAULT,
	ADD CONSTRAINT "battles_id_createdAt_check" CHECK (battle_id_created_at("id") = "createdAt");--> statement-breakpoint
ALTER TABLE "battle_warriors" ADD CONSTRAINT "battle_warriors_battleId_battles_id_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "battle_legacy_ids" ADD CONSTRAINT "battle_legacy_ids_battleId_battles_id_fkey" FOREIGN KEY ("battleId") REFERENCES "battles"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "battles_userId_id_idx" ON "battles" ("userId","id");--> statement-breakpoint
CREATE INDEX "battles_world_id_idx" ON "battles" ("world","id");--> statement-breakpoint
CREATE INDEX "battles_userId_world_id_idx" ON "battles" ("userId","world","id");--> statement-breakpoint
CREATE INDEX "battles_characterId_id_idx" ON "battles" ("characterId","id");--> statement-breakpoint
CREATE INDEX "battles_semanticFingerprint_id_idx" ON "battles" ("semanticFingerprint","id");--> statement-breakpoint
CREATE INDEX "battles_public_id_idx" ON "battles" ("public","id");
