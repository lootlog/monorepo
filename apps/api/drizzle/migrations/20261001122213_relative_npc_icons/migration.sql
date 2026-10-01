-- Stores every NPC icon in the relative form of normalizeNpcIcon
-- (@lootlog/domain/npc-icon): the old interface reported the rendered CDN URL
-- of an icon Margonem keeps relative to /obrazki/npc/, and some timers carry
-- that prefix twice. Both regexp_replace calls mirror that function: every
-- repeated directory prefix, then one leading slash.
--
-- An NPC revision whose normalized icon repeats another revision of the same
-- NPC is merged into the one more loots link (the lower id on a tie): its loot
-- links move there and it is deleted. Every other affected revision keeps its
-- id and links; its icon and snapshotHash are rewritten, the hash with the
-- formula of createNpcSnapshotHash (packages/database/src/snapshot-hash.ts).
-- A revision without a hash keeps none. Kill statistics, timers, their history
-- and event heroes only change the icon; their updatedAt and every other value
-- stay. Kill statistics come first: their tables need full scans, and the rows
-- updated later stay locked only for the rest of the migration.
UPDATE "NpcKillStats" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
UPDATE "NpcKillStatsBucket" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
UPDATE "UserKillStats" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
UPDATE "UserKillStatsBucket" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
UPDATE "GuildKillSummary" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
UPDATE "GuildKillSummaryBucket" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
UPDATE "GuildKillActivity" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';--> statement-breakpoint
CREATE TEMPORARY TABLE "NpcIconRepair" AS
SELECT "id", regexp_replace(regexp_replace("icon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '') AS "icon"
FROM "NpcSnapshot"
WHERE "icon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "icon" LIKE '/%';--> statement-breakpoint
CREATE TEMPORARY TABLE "NpcRevisionMerge" AS
WITH "normalized" AS (
	SELECT "revision"."id", "revision"."npcId", "revision"."identityNamespace", "revision"."gameVersion", "revision"."name", "revision"."type", "revision"."lvl", coalesce("repair"."icon", "revision"."icon") AS "icon", "revision"."prof", "revision"."wt", "revision"."margonemType", "repair"."id" IS NOT NULL AS "repaired"
	FROM "NpcSnapshot" AS "revision"
	LEFT JOIN "NpcIconRepair" AS "repair" ON "repair"."id" = "revision"."id"
	WHERE "revision"."npcId" IN (SELECT "npcId" FROM "NpcSnapshot" WHERE "id" IN (SELECT "id" FROM "NpcIconRepair"))
), "grouped" AS (
	SELECT "id", count(*) OVER "observation" AS "revisions", bool_or("repaired") OVER "observation" AS "repaired", min("id") OVER "observation" AS "observationId"
	FROM "normalized"
	WINDOW "observation" AS (PARTITION BY "npcId", "identityNamespace", "gameVersion", "name", "type", "lvl", "icon", "prof", "wt", "margonemType")
), "linked" AS (
	SELECT "grouped"."id", "grouped"."observationId", (SELECT count(*) FROM "LootNpc" WHERE "LootNpc"."npcSnapshotId" = "grouped"."id") AS "links"
	FROM "grouped"
	WHERE "grouped"."revisions" > 1 AND "grouped"."repaired"
), "ranked" AS (
	SELECT "id", first_value("id") OVER (PARTITION BY "observationId" ORDER BY "links" DESC, "id") AS "targetId"
	FROM "linked"
)
SELECT "id", "targetId" FROM "ranked" WHERE "id" <> "targetId";--> statement-breakpoint
UPDATE "LootNpc" SET "npcSnapshotId" = "NpcRevisionMerge"."targetId"
FROM "NpcRevisionMerge"
WHERE "LootNpc"."npcSnapshotId" = "NpcRevisionMerge"."id";--> statement-breakpoint
DELETE FROM "NpcSnapshot" WHERE "id" IN (SELECT "id" FROM "NpcRevisionMerge");--> statement-breakpoint
UPDATE "NpcSnapshot" SET
	"icon" = "NpcIconRepair"."icon",
	"snapshotHash" = CASE WHEN "NpcSnapshot"."snapshotHash" IS NULL THEN NULL ELSE encode(sha256(convert_to('[' || concat_ws(',',
		to_json('npc-observation-v2'::text)::text,
		to_json("NpcSnapshot"."identityNamespace")::text,
		to_json("NpcSnapshot"."gameVersion"::text)::text,
		to_json("NpcSnapshot"."npcId")::text,
		to_json("NpcSnapshot"."name")::text,
		coalesce(to_json("NpcSnapshot"."type"::text)::text, 'null'),
		coalesce(to_json("NpcSnapshot"."lvl")::text, 'null'),
		to_json("NpcIconRepair"."icon")::text,
		coalesce(to_json("NpcSnapshot"."prof"::text)::text, 'null'),
		coalesce(to_json("NpcSnapshot"."wt")::text, 'null'),
		coalesce(to_json("NpcSnapshot"."margonemType")::text, 'null')
	) || ']', 'UTF8')), 'hex') END
FROM "NpcIconRepair"
WHERE "NpcSnapshot"."id" = "NpcIconRepair"."id";--> statement-breakpoint
DROP TABLE "NpcRevisionMerge";--> statement-breakpoint
DROP TABLE "NpcIconRepair";--> statement-breakpoint
UPDATE "Timer" SET "npc" = jsonb_set("npc", '{icon}', to_jsonb(regexp_replace(regexp_replace("npc"->>'icon', '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')))
WHERE jsonb_typeof("npc"->'icon') = 'string' AND ("npc"->>'icon' ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npc"->>'icon' LIKE '/%');--> statement-breakpoint
UPDATE "TimerHistoryEntry" SET "npc" = jsonb_set("npc", '{icon}', to_jsonb(regexp_replace(regexp_replace("npc"->>'icon', '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')))
WHERE jsonb_typeof("npc"->'icon') = 'string' AND ("npc"->>'icon' ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npc"->>'icon' LIKE '/%');--> statement-breakpoint
UPDATE "EventHeroNpc" SET "npcIcon" = regexp_replace(regexp_replace("npcIcon", '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+', '', 'i'), '^/', '')
WHERE "npcIcon" ~* '^(?:(?:(?:[a-z][a-z0-9+.-]*:)?//[^/?#]*)?/obrazki/npc/)+' OR "npcIcon" LIKE '/%';
