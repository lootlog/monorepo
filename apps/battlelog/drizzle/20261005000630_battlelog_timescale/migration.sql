-- Stored battle times are UTC. Converting them in a UTC session keeps every value.
SET LOCAL TimeZone = 'UTC';
--> statement-breakpoint
-- This migration only creates the battle tables. A database that already holds
-- battles is migrated online by scripts/battlelog-timescale-cutover.ts, which
-- builds the tables below in another schema, copies the battles and records
-- this migration; see drizzle/README.md.
DO $$
BEGIN
	IF EXISTS (SELECT FROM "battles") THEN
		RAISE EXCEPTION 'battles holds rows: migrate them with scripts/battlelog-timescale-cutover.ts';
	END IF;
END $$;
--> statement-breakpoint
DROP TABLE "battle_warriors";
--> statement-breakpoint
DROP TABLE "battles";
--> statement-breakpoint
-- BEGIN battle tables
--> statement-breakpoint
-- The battle time a UUIDv7 battle ID encodes in its first 48 bits.
CREATE OR REPLACE FUNCTION public.battle_id_created_at(id uuid) RETURNS timestamp(3) with time zone
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN to_timestamp(('x' || left(replace(id::text, '-', ''), 12))::bit(48)::bigint / 1000.0);
--> statement-breakpoint
CREATE TABLE "battles" (
	"id" uuid PRIMARY KEY,
	"createdAt" timestamp(3) with time zone NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"characterId" text NOT NULL,
	"semanticFingerprint" text,
	"world" text NOT NULL,
	"duration" double precision NOT NULL,
	"type" text NOT NULL,
	"winner" text NOT NULL,
	"loser" text NOT NULL,
	"winningTeam" integer NOT NULL,
	"losingTeam" integer NOT NULL,
	"honorPoints" integer DEFAULT 0 NOT NULL,
	"hasFlee" boolean DEFAULT false NOT NULL,
	"matchmaking" boolean DEFAULT false NOT NULL,
	"difficultyRank" integer,
	"result" integer,
	"ratingDelta" integer,
	"opponentLvl" integer,
	"opponentOplvl" integer,
	"opponentRating" integer,
	"rating" integer,
	"status" integer,
	"pointsGained" integer,
	"placementCur" integer,
	"placementMax" integer,
	"dailyStageId" integer,
	"dailyPointsCur" integer,
	"dailyPointsMax" integer,
	"dailyPointsStep" integer,
	"dailyRewardsLast" integer,
	"dailyRewardsCur" integer,
	"dailyRewardsMax" integer,
	CONSTRAINT "battles_id_createdAt_check" CHECK (battle_id_created_at("id") = "createdAt")
);
--> statement-breakpoint
CREATE TABLE "battle_warriors" (
	"battleId" uuid,
	"originalId" text,
	"name" text NOT NULL,
	"lvl" integer NOT NULL,
	"prof" text NOT NULL,
	"icon" text NOT NULL,
	"team" integer NOT NULL,
	"turns" integer NOT NULL,
	"turnsLost" integer DEFAULT 0 NOT NULL,
	"steps" integer DEFAULT 0 NOT NULL,
	"normalAttacks" integer DEFAULT 0 NOT NULL,
	"spellsUsed" integer DEFAULT 0 NOT NULL,
	"spellsUsedMap" jsonb DEFAULT '{}' NOT NULL,
	"isDead" boolean DEFAULT false NOT NULL,
	"surrendered" boolean DEFAULT false NOT NULL,
	"fled" boolean DEFAULT false NOT NULL,
	"maxHp" integer DEFAULT 0 NOT NULL,
	"damageDealt" integer DEFAULT 0 NOT NULL,
	"distanceDamage" integer DEFAULT 0 NOT NULL,
	"meleeDamage" integer DEFAULT 0 NOT NULL,
	"auxiliaryDamage" integer DEFAULT 0 NOT NULL,
	"fireDamage" integer DEFAULT 0 NOT NULL,
	"frostDamage" integer DEFAULT 0 NOT NULL,
	"lightningDamage" integer DEFAULT 0 NOT NULL,
	"thirdAttDamage" integer DEFAULT 0 NOT NULL,
	"damageDealtAfterDefensive" integer DEFAULT 0 NOT NULL,
	"damageDealtAfterDefensivePercentage" double precision DEFAULT 0 NOT NULL,
	"damageTaken" integer DEFAULT 0 NOT NULL,
	"distanceDamageTaken" integer DEFAULT 0 NOT NULL,
	"meleeDamageTaken" integer DEFAULT 0 NOT NULL,
	"auxiliaryDamageTaken" integer DEFAULT 0 NOT NULL,
	"fireDamageTaken" integer DEFAULT 0 NOT NULL,
	"frostDamageTaken" integer DEFAULT 0 NOT NULL,
	"lightningDamageTaken" integer DEFAULT 0 NOT NULL,
	"thirdAttDamageTaken" integer DEFAULT 0 NOT NULL,
	"flatDamageTaken" integer DEFAULT 0 NOT NULL,
	"rageDamageDealt" integer DEFAULT 0 NOT NULL,
	"trueDamageDealt" integer DEFAULT 0 NOT NULL,
	"trueDamageTaken" integer DEFAULT 0 NOT NULL,
	"stigmaDamageDealt" integer DEFAULT 0 NOT NULL,
	"stigmaDamageTaken" integer DEFAULT 0 NOT NULL,
	"passiveHealing" integer DEFAULT 0 NOT NULL,
	"activeHealing" integer DEFAULT 0 NOT NULL,
	"armorPierces" integer DEFAULT 0 NOT NULL,
	"criticalHits" integer DEFAULT 0 NOT NULL,
	"reducedArmor" integer DEFAULT 0 NOT NULL,
	"reducedPoisonResistance" integer DEFAULT 0 NOT NULL,
	"magicResistanceDestroyed" integer DEFAULT 0 NOT NULL,
	"evasions" integer DEFAULT 0 NOT NULL,
	"attacksEvaded" integer DEFAULT 0 NOT NULL,
	"counters" integer DEFAULT 0 NOT NULL,
	"fastArrows" integer DEFAULT 0 NOT NULL,
	"blocks" integer DEFAULT 0 NOT NULL,
	"attacksBlocked" integer DEFAULT 0 NOT NULL,
	"blockedDamage" integer DEFAULT 0 NOT NULL,
	"woundDamageTaken" integer DEFAULT 0 NOT NULL,
	"poisonDamageTaken" integer DEFAULT 0 NOT NULL,
	"injureDamageTaken" integer DEFAULT 0 NOT NULL,
	"injures" integer DEFAULT 0 NOT NULL,
	"critWoundDamageTaken" integer DEFAULT 0 NOT NULL,
	"firePassiveDamageTaken" integer DEFAULT 0 NOT NULL,
	"lightningPassiveDamageTaken" integer DEFAULT 0 NOT NULL,
	"destroyedEnergy" integer DEFAULT 0 NOT NULL,
	"destroyedMana" integer DEFAULT 0 NOT NULL,
	"regeneratedEnergy" integer DEFAULT 0 NOT NULL,
	"regeneratedMana" integer DEFAULT 0 NOT NULL,
	"reflectedDamage" integer DEFAULT 0 NOT NULL,
	"reflectedDamageTaken" integer DEFAULT 0 NOT NULL,
	"legbons" integer DEFAULT 0 NOT NULL,
	"legbonCurse" integer DEFAULT 0 NOT NULL,
	"legbonCleanse" integer DEFAULT 0 NOT NULL,
	"legbonLastheal" integer DEFAULT 0 NOT NULL,
	"legbonLasthealValue" integer DEFAULT 0 NOT NULL,
	"legbonGlare" integer DEFAULT 0 NOT NULL,
	"legbonHolytouch" integer DEFAULT 0 NOT NULL,
	"legbonHolytouchValue" integer DEFAULT 0 NOT NULL,
	"legbonCritredValue" integer DEFAULT 0 NOT NULL,
	"legbonFacadeValue" integer DEFAULT 0 NOT NULL,
	"legbonPunctureValue" integer DEFAULT 0 NOT NULL,
	"legbonVerycrit" integer DEFAULT 0 NOT NULL,
	"legbonAnguish" integer DEFAULT 0 NOT NULL,
	"legbonAnguishDamageTaken" integer DEFAULT 0 NOT NULL,
	"ph" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "battle_warriors_pkey" PRIMARY KEY("battleId","originalId")
);
--> statement-breakpoint
CREATE TABLE "battle_timelines" (
	"battleId" uuid PRIMARY KEY,
	"userId" text NOT NULL,
	"events" bytea NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_submissions" (
	"userId" text,
	"submissionId" text,
	"battleId" uuid NOT NULL,
	CONSTRAINT "battle_submissions_pkey" PRIMARY KEY("userId","submissionId")
);
--> statement-breakpoint
CREATE TABLE "battle_legacy_ids" (
	"legacyId" text PRIMARY KEY,
	"battleId" uuid NOT NULL CONSTRAINT "battle_legacy_ids_battleId_key" UNIQUE
);
--> statement-breakpoint
CREATE INDEX "battle_submissions_battleId_idx" ON "battle_submissions" ("battleId");
--> statement-breakpoint
CREATE INDEX "battle_timelines_userId_battleId_idx" ON "battle_timelines" ("userId","battleId");
--> statement-breakpoint
CREATE INDEX "battle_warriors_originalId_battleId_idx" ON "battle_warriors" ("originalId","battleId");
--> statement-breakpoint
CREATE INDEX "battles_userId_id_idx" ON "battles" ("userId","id");
--> statement-breakpoint
CREATE INDEX "battles_userId_world_id_idx" ON "battles" ("userId","world","id");
--> statement-breakpoint
CREATE INDEX "battles_characterId_id_idx" ON "battles" ("characterId","id");
--> statement-breakpoint
CREATE INDEX "battles_semanticFingerprint_id_idx" ON "battles" ("semanticFingerprint","id");
--> statement-breakpoint
-- Participants stay a plain table: analytics look up a battle's participants
-- one battle at a time, which decompresses a whole batch per battle on
-- compressed chunks. PGlite in tests has no TimescaleDB, so the tables stay
-- plain there. Only
-- superusers may read shared_preload_libraries, so the check uses the catalog.
DO $$
BEGIN
	IF EXISTS (SELECT FROM pg_available_extensions WHERE name = 'timescaledb') THEN
		CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public;
		PERFORM create_hypertable('battles', by_range('id', INTERVAL '7 days'), create_default_indexes => false);
		PERFORM create_hypertable('battle_timelines', by_range('battleId', INTERVAL '7 days'), create_default_indexes => false);
		EXECUTE 'ALTER TABLE battles SET (timescaledb.enable_columnstore, timescaledb.segmentby = ''"userId"'', timescaledb.orderby = ''id DESC'')';
		CALL add_columnstore_policy('battles', after => INTERVAL '7 days');
	END IF;
END $$;
--> statement-breakpoint
-- END battle tables
--> statement-breakpoint
ALTER TABLE "battle_object_deletions" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone USING "createdAt"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "battle_object_deletions" ALTER COLUMN "retryAt" SET DATA TYPE timestamp with time zone USING "retryAt"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "lastSeenAt" SET DATA TYPE timestamp with time zone USING "lastSeenAt"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone USING "createdAt"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_characters" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp with time zone USING "updatedAt"::timestamp with time zone;
