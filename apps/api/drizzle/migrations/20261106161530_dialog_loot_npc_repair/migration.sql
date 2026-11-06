-- Game clients until #1158 (2026-07-23) named a dialog loot after every NPC the
-- event removed from the map, such as a mined pickaxe next to the wizard who
-- handed out the item. A dialog loot with one NPC names the NPC that gave its
-- items, so those loots tell which NPC gives an item. In a dialog loot with
-- several NPCs, the one monster that is such a source of every item keeps its
-- earliest link and the other links are removed. Loots where no monster or
-- several monsters qualify keep every NPC.
CREATE TEMPORARY TABLE "DialogItemSource" AS SELECT DISTINCT "ItemSnapshot"."itemId", "NpcSnapshot"."gameVersion", "NpcSnapshot"."name" FROM (SELECT "LootNpc"."lootId", min("LootNpc"."npcSnapshotId") AS "npcSnapshotId" FROM "LootNpc" INNER JOIN "Loot" ON "Loot"."id" = "LootNpc"."lootId" WHERE "Loot"."source" = 'DIALOG' GROUP BY "LootNpc"."lootId" HAVING count(*) = 1) AS "single" INNER JOIN "NpcSnapshot" ON "NpcSnapshot"."id" = "single"."npcSnapshotId" INNER JOIN "LootItem" ON "LootItem"."lootId" = "single"."lootId" INNER JOIN "ItemSnapshot" ON "ItemSnapshot"."id" = "LootItem"."itemSnapshotId";--> statement-breakpoint
ALTER TABLE "DialogItemSource" ADD PRIMARY KEY ("itemId", "gameVersion", "name");--> statement-breakpoint
ANALYZE "DialogItemSource";--> statement-breakpoint
CREATE TEMPORARY TABLE "DialogLootNpcCandidate" AS SELECT "LootNpc"."lootId", "LootNpc"."id", "NpcSnapshot"."gameVersion", "NpcSnapshot"."name", bool_and("DialogItemSource"."itemId" IS NOT NULL) AS "givesEveryItem" FROM "LootNpc" INNER JOIN "Loot" ON "Loot"."id" = "LootNpc"."lootId" INNER JOIN "NpcSnapshot" ON "NpcSnapshot"."id" = "LootNpc"."npcSnapshotId" INNER JOIN "LootItem" ON "LootItem"."lootId" = "LootNpc"."lootId" INNER JOIN "ItemSnapshot" ON "ItemSnapshot"."id" = "LootItem"."itemSnapshotId" LEFT JOIN "DialogItemSource" ON "DialogItemSource"."itemId" = "ItemSnapshot"."itemId" AND "DialogItemSource"."gameVersion" = "NpcSnapshot"."gameVersion" AND "DialogItemSource"."name" = "NpcSnapshot"."name" WHERE "Loot"."source" = 'DIALOG' AND EXISTS (SELECT 1 FROM "LootNpc" AS "other" WHERE "other"."lootId" = "LootNpc"."lootId" AND "other"."id" <> "LootNpc"."id") GROUP BY "LootNpc"."lootId", "LootNpc"."id", "NpcSnapshot"."gameVersion", "NpcSnapshot"."name";--> statement-breakpoint
CREATE TEMPORARY TABLE "DialogLootNpcSurvivor" AS SELECT "lootId", min("id") FILTER (WHERE "givesEveryItem") AS "survivorId" FROM "DialogLootNpcCandidate" GROUP BY "lootId" HAVING count(DISTINCT ("gameVersion", "name")) FILTER (WHERE "givesEveryItem") = 1;--> statement-breakpoint
ALTER TABLE "DialogLootNpcSurvivor" ADD PRIMARY KEY ("lootId");--> statement-breakpoint
ANALYZE "DialogLootNpcSurvivor";--> statement-breakpoint
DELETE FROM "LootNpc" USING "DialogLootNpcSurvivor" WHERE "LootNpc"."lootId" = "DialogLootNpcSurvivor"."lootId" AND "LootNpc"."id" <> "DialogLootNpcSurvivor"."survivorId";--> statement-breakpoint
DROP TABLE "DialogLootNpcSurvivor";--> statement-breakpoint
DROP TABLE "DialogLootNpcCandidate";--> statement-breakpoint
DROP TABLE "DialogItemSource";
