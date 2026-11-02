-- Reclassifies event heroes stored as heroes. Until now every NPC of weight
-- 80-89 was a HERO; getNpcType (@lootlog/domain/npc-type) now makes it an
-- EVENT_HERO when Margonem flags its template or its graphic is in the event
-- directory `hev/`. Stored rows never kept the flag, so the graphic decides
-- here. A HERO always has a weight of 80-89, so rows without a weight only
-- need the type and the graphic. Event colossi and event monsters keep their
-- type.
--
-- Kill statistics come first: their tables need full scans, and the rows
-- updated later stay locked only for the rest of the migration. Their keys do
-- not contain the type, so only the type changes. The buckets are compressed
-- hypertables segmented by Organization or user, and nearly every segment
-- holds an event hero, so the transaction lifts the decompression limit.
SELECT set_config('timescaledb.max_tuples_decompressed_per_dml_transaction', '0', true);--> statement-breakpoint
UPDATE "GuildKillTotal" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "GuildKillBucket" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "MemberKillTotal" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "MemberKillBucket" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "UserKillTotal" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "UserKillBucket" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "UserCharacterKillBucket" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
UPDATE "GuildKillActivity" SET "npcType" = 'EVENT_HERO' WHERE "npcType" = 'HERO' AND "npcIcon" LIKE 'hev/%';--> statement-breakpoint
-- The type is part of an NPC revision's snapshotHash, so each reclassified
-- revision gets the hash of createNpcSnapshotHash
-- (packages/database/src/snapshot-hash.ts) with the new type; a revision
-- without a hash keeps none. An API revision that already classifies event
-- heroes may have stored the same observation as an EVENT_HERO revision: the
-- old revision is then merged into it, its loot links move there and it is
-- deleted.
CREATE TEMPORARY TABLE "EventHeroRevision" AS
SELECT "id", "npcId", CASE WHEN "snapshotHash" IS NULL THEN NULL ELSE encode(sha256(convert_to('[' || concat_ws(',',
	to_json('npc-observation-v2'::text)::text,
	to_json("identityNamespace")::text,
	to_json("gameVersion"::text)::text,
	to_json("npcId")::text,
	to_json("name")::text,
	to_json('EVENT_HERO'::text)::text,
	coalesce(to_json("lvl")::text, 'null'),
	to_json("icon")::text,
	coalesce(to_json("prof"::text)::text, 'null'),
	to_json("wt")::text,
	coalesce(to_json("margonemType")::text, 'null')
) || ']', 'UTF8')), 'hex') END AS "snapshotHash"
FROM "NpcSnapshot"
WHERE "type" = 'HERO' AND "icon" LIKE 'hev/%' AND "wt" BETWEEN 80 AND 89;--> statement-breakpoint
CREATE TEMPORARY TABLE "EventHeroRevisionMerge" AS
SELECT "revision"."id", min("existing"."id") AS "targetId"
FROM "EventHeroRevision" AS "revision"
JOIN "NpcSnapshot" AS "existing" ON "existing"."npcId" = "revision"."npcId" AND "existing"."snapshotHash" = "revision"."snapshotHash" AND "existing"."type" = 'EVENT_HERO'
GROUP BY "revision"."id";--> statement-breakpoint
UPDATE "LootNpc" SET "npcSnapshotId" = "EventHeroRevisionMerge"."targetId"
FROM "EventHeroRevisionMerge"
WHERE "LootNpc"."npcSnapshotId" = "EventHeroRevisionMerge"."id";--> statement-breakpoint
DELETE FROM "NpcSnapshot" WHERE "id" IN (SELECT "id" FROM "EventHeroRevisionMerge");--> statement-breakpoint
UPDATE "NpcSnapshot" SET "type" = 'EVENT_HERO', "snapshotHash" = "EventHeroRevision"."snapshotHash"
FROM "EventHeroRevision"
WHERE "NpcSnapshot"."id" = "EventHeroRevision"."id" AND "EventHeroRevision"."id" NOT IN (SELECT "id" FROM "EventHeroRevisionMerge");--> statement-breakpoint
DROP TABLE "EventHeroRevisionMerge";--> statement-breakpoint
DROP TABLE "EventHeroRevision";--> statement-breakpoint
-- Timers keep the NPC as JSON; every other value and updatedAt stay.
UPDATE "Timer" SET "npc" = jsonb_set("npc", '{type}', '"EVENT_HERO"')
WHERE "npc"->>'type' = 'HERO' AND "npc"->>'icon' LIKE 'hev/%';--> statement-breakpoint
UPDATE "TimerHistoryEntry" SET "npc" = jsonb_set("npc", '{type}', '"EVENT_HERO"')
WHERE "npc"->>'type' = 'HERO' AND "npc"->>'icon' LIKE 'hev/%';
