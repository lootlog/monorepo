CREATE TABLE "GuildKillBucket" (
	"periodStart" timestamp(3) with time zone,
	"guildId" text,
	"world" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "GuildKillBucket_pkey" PRIMARY KEY("guildId","world","npcId","periodStart")
);
--> statement-breakpoint
CREATE TABLE "GuildKillTotal" (
	"guildId" text,
	"world" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "GuildKillTotal_pkey" PRIMARY KEY("guildId","world","npcId")
);
--> statement-breakpoint
CREATE TABLE "MemberKillBucket" (
	"periodStart" timestamp(3) with time zone,
	"guildId" text,
	"memberId" integer,
	"discordUserId" text NOT NULL,
	"world" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "MemberKillBucket_pkey" PRIMARY KEY("guildId","memberId","world","npcId","periodStart")
);
--> statement-breakpoint
CREATE TABLE "MemberKillTotal" (
	"guildId" text,
	"memberId" integer,
	"discordUserId" text NOT NULL,
	"world" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "MemberKillTotal_pkey" PRIMARY KEY("guildId","memberId","world","npcId")
);
--> statement-breakpoint
CREATE TABLE "UserKillBucket" (
	"periodStart" timestamp(3) with time zone,
	"discordUserId" text,
	"world" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "UserKillBucket_pkey" PRIMARY KEY("discordUserId","world","npcId","periodStart")
);
--> statement-breakpoint
CREATE TABLE "UserKillTotal" (
	"discordUserId" text,
	"world" text,
	"npcId" integer,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcProf" text,
	"npcIcon" text,
	"kills" integer NOT NULL,
	"lastKilledAt" timestamp(3) with time zone NOT NULL,
	CONSTRAINT "UserKillTotal_pkey" PRIMARY KEY("discordUserId","world","npcId")
);
--> statement-breakpoint
CREATE INDEX "GuildKillBucket_guildId_periodStart_idx" ON "GuildKillBucket" ("guildId","periodStart" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "MemberKillBucket_guildId_periodStart_idx" ON "MemberKillBucket" ("guildId","periodStart" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "UserKillBucket_discordUserId_periodStart_idx" ON "UserKillBucket" ("discordUserId","periodStart" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "UserKillTotal" SET (fillfactor = 70);--> statement-breakpoint
ALTER TABLE "MemberKillTotal" SET (fillfactor = 70);--> statement-breakpoint
ALTER TABLE "GuildKillTotal" SET (fillfactor = 70);--> statement-breakpoint
-- Hypertables and compression where the TimescaleDB library is loaded (the
-- production API cluster preloads it). PGlite test databases cannot load it and
-- keep plain tables with the same keys; the API reads and writes both the same way.
DO $$
BEGIN
  IF current_setting('shared_preload_libraries', true) ~ '(^|[ ,])timescaledb($|[ ,])' THEN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    PERFORM create_hypertable('"UserKillBucket"', by_range('periodStart', INTERVAL '7 days'), create_default_indexes => false);
    PERFORM create_hypertable('"MemberKillBucket"', by_range('periodStart', INTERVAL '7 days'), create_default_indexes => false);
    PERFORM create_hypertable('"GuildKillBucket"', by_range('periodStart', INTERVAL '7 days'), create_default_indexes => false);
    EXECUTE 'ALTER TABLE "UserKillBucket" SET (timescaledb.enable_columnstore, timescaledb.segmentby = ''"discordUserId"'', timescaledb.orderby = ''"periodStart" DESC'')';
    EXECUTE 'ALTER TABLE "MemberKillBucket" SET (timescaledb.enable_columnstore, timescaledb.segmentby = ''"guildId"'', timescaledb.orderby = ''"periodStart" DESC'')';
    EXECUTE 'ALTER TABLE "GuildKillBucket" SET (timescaledb.enable_columnstore, timescaledb.segmentby = ''"guildId"'', timescaledb.orderby = ''"periodStart" DESC'')';
    CALL add_columnstore_policy('"UserKillBucket"', after => INTERVAL '2 days');
    CALL add_columnstore_policy('"MemberKillBucket"', after => INTERVAL '2 days');
    CALL add_columnstore_policy('"GuildKillBucket"', after => INTERVAL '2 days');
  END IF;
END $$;--> statement-breakpoint
SET LOCAL work_mem = '256MB';--> statement-breakpoint
-- The running API keeps incrementing the old tables until the new API replaces
-- it. The new tables receive everything before the current hour; the follow-up
-- migration adds the old-table increments from this hour onwards to both the
-- buckets and the totals (see drizzle/README.md). Totals and buckets were
-- incremented in one transaction, so subtracting this hour's buckets gives the
-- totals as of the cutover.
CREATE TABLE "KillBucketCutover" ("cutoverHour" timestamp(3) NOT NULL);--> statement-breakpoint
INSERT INTO "KillBucketCutover" VALUES (date_trunc('hour', now() AT TIME ZONE 'UTC'));--> statement-breakpoint
INSERT INTO "UserKillBucket" ("periodStart", "discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT "periodStart" AT TIME ZONE 'UTC', "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "totalKills", "lastKilledAt" AT TIME ZONE 'UTC'
FROM "UserKillStatsBucket" WHERE "periodStart" < (SELECT "cutoverHour" FROM "KillBucketCutover") ORDER BY "periodStart";--> statement-breakpoint
INSERT INTO "MemberKillBucket" ("periodStart", "guildId", "memberId", "discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT "periodStart" AT TIME ZONE 'UTC', "guildId", "memberId", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "memberKills", "lastKilledAt" AT TIME ZONE 'UTC'
FROM "NpcKillStatsBucket" WHERE "periodStart" < (SELECT "cutoverHour" FROM "KillBucketCutover") ORDER BY "periodStart";--> statement-breakpoint
INSERT INTO "GuildKillBucket" ("periodStart", "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT "periodStart" AT TIME ZONE 'UTC', "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "uniqueKills", "lastKilledAt" AT TIME ZONE 'UTC'
FROM "GuildKillSummaryBucket" WHERE "periodStart" < (SELECT "cutoverHour" FROM "KillBucketCutover") ORDER BY "periodStart";--> statement-breakpoint
INSERT INTO "UserKillTotal" ("discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT t."userId", t."world", t."npcId", t."npcName", t."npcType", t."npcLvl", t."npcProf", t."npcIcon", t."totalKills" - coalesce(r."kills", 0), t."lastKilledAt" AT TIME ZONE 'UTC'
FROM "UserKillStats" t
LEFT JOIN (
  SELECT "userId", "world", "npcId", sum("totalKills") AS "kills" FROM "UserKillStatsBucket"
  WHERE "periodStart" >= (SELECT "cutoverHour" FROM "KillBucketCutover") GROUP BY "userId", "world", "npcId"
) r ON r."userId" = t."userId" AND r."world" = t."world" AND r."npcId" = t."npcId"
WHERE t."totalKills" > coalesce(r."kills", 0);--> statement-breakpoint
INSERT INTO "MemberKillTotal" ("guildId", "memberId", "discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT t."guildId", t."memberId", t."userId", t."world", t."npcId", t."npcName", t."npcType", t."npcLvl", t."npcProf", t."npcIcon", t."memberKills" - coalesce(r."kills", 0), t."lastKilledAt" AT TIME ZONE 'UTC'
FROM "NpcKillStats" t
LEFT JOIN (
  SELECT "guildId", "memberId", "world", "npcId", sum("memberKills") AS "kills" FROM "NpcKillStatsBucket"
  WHERE "periodStart" >= (SELECT "cutoverHour" FROM "KillBucketCutover") GROUP BY "guildId", "memberId", "world", "npcId"
) r ON r."guildId" = t."guildId" AND r."memberId" = t."memberId" AND r."world" = t."world" AND r."npcId" = t."npcId"
WHERE t."memberKills" > coalesce(r."kills", 0);--> statement-breakpoint
INSERT INTO "GuildKillTotal" ("guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT t."guildId", t."world", t."npcId", t."npcName", t."npcType", t."npcLvl", t."npcProf", t."npcIcon", t."uniqueKills" - coalesce(r."kills", 0), t."lastKilledAt" AT TIME ZONE 'UTC'
FROM "GuildKillSummary" t
LEFT JOIN (
  SELECT "guildId", "world", "npcId", sum("uniqueKills") AS "kills" FROM "GuildKillSummaryBucket"
  WHERE "periodStart" >= (SELECT "cutoverHour" FROM "KillBucketCutover") GROUP BY "guildId", "world", "npcId"
) r ON r."guildId" = t."guildId" AND r."world" = t."world" AND r."npcId" = t."npcId"
WHERE t."uniqueKills" > coalesce(r."kills", 0);--> statement-breakpoint
-- Checked once over the copied rows instead of row by row during the copy.
ALTER TABLE "GuildKillBucket" ADD CONSTRAINT "GuildKillBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "GuildKillTotal" ADD CONSTRAINT "GuildKillTotal_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "MemberKillBucket" ADD CONSTRAINT "MemberKillBucket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "MemberKillBucket" ADD CONSTRAINT "MemberKillBucket_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "MemberKillTotal" ADD CONSTRAINT "MemberKillTotal_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "MemberKillTotal" ADD CONSTRAINT "MemberKillTotal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ANALYZE "UserKillBucket", "MemberKillBucket", "GuildKillBucket", "UserKillTotal", "MemberKillTotal", "GuildKillTotal";
