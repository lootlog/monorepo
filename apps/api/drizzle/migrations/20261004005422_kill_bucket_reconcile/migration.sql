-- Adds the kills the API before the bucket hypertables recorded after
-- 20261003233734_kill_bucket_hypertables copied its data: old buckets from the
-- cutover hour onwards, which only that API wrote, and commits that landed in
-- the hour before the cutover after the copy. Apply it only after no such API
-- process runs; see drizzle/README.md.
DO $$
BEGIN
  IF (SELECT max("updatedAt") FROM (
    SELECT max("updatedAt") AS "updatedAt" FROM "UserKillStatsBucket"
    UNION ALL SELECT max("updatedAt") FROM "NpcKillStatsBucket"
    UNION ALL SELECT max("updatedAt") FROM "GuildKillSummaryBucket"
  ) writes) > (now() AT TIME ZONE 'UTC') - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'An API older than the kill bucket hypertables wrote kills in the last 5 minutes; apply this after it stops (see apps/api/drizzle/README.md)';
  END IF;
END $$;--> statement-breakpoint
-- The hour before the cutover can sit in a compressed chunk, segmented by Organization.
SELECT set_config('timescaledb.max_tuples_decompressed_per_dml_transaction', '0', true);--> statement-breakpoint
CREATE TEMPORARY TABLE "LateUserKill" ON COMMIT DROP AS
SELECT o."periodStart" AT TIME ZONE 'UTC' AS "periodStart", o."userId", o."world", o."npcId", o."npcName", o."npcType", o."npcLvl", o."npcProf", o."npcIcon",
  o."totalKills" - coalesce(n."kills", 0) AS "kills", o."lastKilledAt" AT TIME ZONE 'UTC' AS "lastKilledAt"
FROM "UserKillStatsBucket" o
LEFT JOIN "UserKillBucket" n ON n."discordUserId" = o."userId" AND n."world" = o."world" AND n."npcId" = o."npcId"
  AND n."periodStart" = o."periodStart" AT TIME ZONE 'UTC'
  AND o."periodStart" < (SELECT "cutoverHour" FROM "KillBucketCutover")
WHERE o."periodStart" >= (SELECT "cutoverHour" - INTERVAL '1 hour' FROM "KillBucketCutover")
  AND o."totalKills" <> coalesce(n."kills", 0);--> statement-breakpoint
INSERT INTO "UserKillBucket" ("periodStart", "discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT "periodStart", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt" FROM "LateUserKill"
ON CONFLICT ("discordUserId", "world", "npcId", "periodStart") DO UPDATE SET
  "kills" = "UserKillBucket"."kills" + excluded."kills",
  "lastKilledAt" = greatest("UserKillBucket"."lastKilledAt", excluded."lastKilledAt");--> statement-breakpoint
INSERT INTO "UserKillTotal" ("discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT DISTINCT ON ("userId", "world", "npcId") "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon",
  sum("kills") OVER (PARTITION BY "userId", "world", "npcId"), max("lastKilledAt") OVER (PARTITION BY "userId", "world", "npcId")
FROM "LateUserKill" ORDER BY "userId", "world", "npcId", "periodStart" DESC
ON CONFLICT ("discordUserId", "world", "npcId") DO UPDATE SET
  "kills" = "UserKillTotal"."kills" + excluded."kills",
  "lastKilledAt" = greatest("UserKillTotal"."lastKilledAt", excluded."lastKilledAt");--> statement-breakpoint
CREATE TEMPORARY TABLE "LateMemberKill" ON COMMIT DROP AS
SELECT o."periodStart" AT TIME ZONE 'UTC' AS "periodStart", o."guildId", o."memberId", o."userId", o."world", o."npcId", o."npcName", o."npcType", o."npcLvl", o."npcProf", o."npcIcon",
  o."memberKills" - coalesce(n."kills", 0) AS "kills", o."lastKilledAt" AT TIME ZONE 'UTC' AS "lastKilledAt"
FROM "NpcKillStatsBucket" o
LEFT JOIN "MemberKillBucket" n ON n."guildId" = o."guildId" AND n."memberId" = o."memberId" AND n."world" = o."world" AND n."npcId" = o."npcId"
  AND n."periodStart" = o."periodStart" AT TIME ZONE 'UTC'
  AND o."periodStart" < (SELECT "cutoverHour" FROM "KillBucketCutover")
WHERE o."periodStart" >= (SELECT "cutoverHour" - INTERVAL '1 hour' FROM "KillBucketCutover")
  AND o."memberKills" <> coalesce(n."kills", 0);--> statement-breakpoint
INSERT INTO "MemberKillBucket" ("periodStart", "guildId", "memberId", "discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT "periodStart", "guildId", "memberId", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt" FROM "LateMemberKill"
ON CONFLICT ("guildId", "memberId", "world", "npcId", "periodStart") DO UPDATE SET
  "kills" = "MemberKillBucket"."kills" + excluded."kills",
  "lastKilledAt" = greatest("MemberKillBucket"."lastKilledAt", excluded."lastKilledAt");--> statement-breakpoint
INSERT INTO "MemberKillTotal" ("guildId", "memberId", "discordUserId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT DISTINCT ON ("guildId", "memberId", "world", "npcId") "guildId", "memberId", "userId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon",
  sum("kills") OVER (PARTITION BY "guildId", "memberId", "world", "npcId"), max("lastKilledAt") OVER (PARTITION BY "guildId", "memberId", "world", "npcId")
FROM "LateMemberKill" ORDER BY "guildId", "memberId", "world", "npcId", "periodStart" DESC
ON CONFLICT ("guildId", "memberId", "world", "npcId") DO UPDATE SET
  "kills" = "MemberKillTotal"."kills" + excluded."kills",
  "lastKilledAt" = greatest("MemberKillTotal"."lastKilledAt", excluded."lastKilledAt");--> statement-breakpoint
CREATE TEMPORARY TABLE "LateGuildKill" ON COMMIT DROP AS
SELECT o."periodStart" AT TIME ZONE 'UTC' AS "periodStart", o."guildId", o."world", o."npcId", o."npcName", o."npcType", o."npcLvl", o."npcProf", o."npcIcon",
  o."uniqueKills" - coalesce(n."kills", 0) AS "kills", o."lastKilledAt" AT TIME ZONE 'UTC' AS "lastKilledAt"
FROM "GuildKillSummaryBucket" o
LEFT JOIN "GuildKillBucket" n ON n."guildId" = o."guildId" AND n."world" = o."world" AND n."npcId" = o."npcId"
  AND n."periodStart" = o."periodStart" AT TIME ZONE 'UTC'
  AND o."periodStart" < (SELECT "cutoverHour" FROM "KillBucketCutover")
WHERE o."periodStart" >= (SELECT "cutoverHour" - INTERVAL '1 hour' FROM "KillBucketCutover")
  AND o."uniqueKills" <> coalesce(n."kills", 0);--> statement-breakpoint
INSERT INTO "GuildKillBucket" ("periodStart", "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT "periodStart", "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt" FROM "LateGuildKill"
ON CONFLICT ("guildId", "world", "npcId", "periodStart") DO UPDATE SET
  "kills" = "GuildKillBucket"."kills" + excluded."kills",
  "lastKilledAt" = greatest("GuildKillBucket"."lastKilledAt", excluded."lastKilledAt");--> statement-breakpoint
INSERT INTO "GuildKillTotal" ("guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon", "kills", "lastKilledAt")
SELECT DISTINCT ON ("guildId", "world", "npcId") "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "npcProf", "npcIcon",
  sum("kills") OVER (PARTITION BY "guildId", "world", "npcId"), max("lastKilledAt") OVER (PARTITION BY "guildId", "world", "npcId")
FROM "LateGuildKill" ORDER BY "guildId", "world", "npcId", "periodStart" DESC
ON CONFLICT ("guildId", "world", "npcId") DO UPDATE SET
  "kills" = "GuildKillTotal"."kills" + excluded."kills",
  "lastKilledAt" = greatest("GuildKillTotal"."lastKilledAt", excluded."lastKilledAt");
