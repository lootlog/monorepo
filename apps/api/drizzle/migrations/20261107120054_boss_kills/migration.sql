-- Boss kills counted once across Organizations, for drop rates: one row per
-- kill with the Organizations that recorded it and its party, when a report
-- named it. Kills before this have none and drop rates count from the first
-- row on. The party moves here from "GuildKillBucket", where it counted a
-- kill once per Organization that recorded it; the API stops writing the
-- bucket's party columns, and a later migration drops them.
CREATE TABLE "BossKill" (
	"world" text,
	"npcId" integer,
	"killedAt" timestamp(3) with time zone,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"guildIds" text[] NOT NULL,
	"lootRolls" double precision,
	"partyWarriors" integer,
	"partyPaladins" integer,
	"partyBladeDancers" integer,
	"partyMages" integer,
	"partyTrackers" integer,
	"partyHunters" integer,
	CONSTRAINT "BossKill_pkey" PRIMARY KEY("world","npcId","killedAt")
);
--> statement-breakpoint
CREATE INDEX "BossKill_killedAt_idx" ON "BossKill" ("killedAt" DESC NULLS LAST);--> statement-breakpoint
-- Kills are upserted only within the dedup window after the first report, so
-- they never touch a compressed chunk. Drop rates read every kill by boss.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_available_extensions WHERE name = 'timescaledb') THEN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    PERFORM create_hypertable('"BossKill"', by_range('killedAt', INTERVAL '7 days'), create_default_indexes => false);
    EXECUTE 'ALTER TABLE "BossKill" SET (timescaledb.enable_columnstore, timescaledb.segmentby = ''"world"'', timescaledb.orderby = ''"npcId", "killedAt" DESC'')';
    CALL add_columnstore_policy('"BossKill"', after => INTERVAL '2 days');
  END IF;
END $$;
