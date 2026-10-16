CREATE TABLE "UserCharacterKillBucket" (
	"periodStart" timestamp(3) with time zone,
	"discordUserId" text,
	"world" text,
	"characterId" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "UserCharacterKillBucket_pkey" PRIMARY KEY("discordUserId","world","characterId","npcId","periodStart")
);
--> statement-breakpoint
CREATE TABLE "UserKillCharacter" (
	"discordUserId" text,
	"world" text,
	"characterId" text,
	"name" text,
	"level" integer,
	"profession" text,
	"icon" text,
	"kills" integer NOT NULL,
	"firstKilledAt" timestamp(3) with time zone NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "UserKillCharacter_pkey" PRIMARY KEY("discordUserId","world","characterId")
);
--> statement-breakpoint
CREATE INDEX "UserCharacterKillBucket_character_periodStart_idx" ON "UserCharacterKillBucket" ("discordUserId","characterId","periodStart" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "UserKillCharacter" SET (fillfactor = 70);--> statement-breakpoint
-- New, empty tables: existing kills have no character and stay only in the
-- account-wide tables, so nothing is copied and account totals are unchanged.
-- Hypertable and compression settings match "UserKillBucket" where TimescaleDB
-- is installed (see 20261003233734_kill_bucket_hypertables).
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_available_extensions WHERE name = 'timescaledb') THEN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    PERFORM create_hypertable('"UserCharacterKillBucket"', by_range('periodStart', INTERVAL '7 days'), create_default_indexes => false);
    EXECUTE 'ALTER TABLE "UserCharacterKillBucket" SET (timescaledb.enable_columnstore, timescaledb.segmentby = ''"discordUserId"'', timescaledb.orderby = ''"periodStart" DESC'')';
    CALL add_columnstore_policy('"UserCharacterKillBucket"', after => INTERVAL '2 days');
  END IF;
END $$;
