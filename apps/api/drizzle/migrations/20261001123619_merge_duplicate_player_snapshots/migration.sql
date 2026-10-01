-- Deletes player snapshots that nothing references: timer actors whose timer
-- moved on to another snapshot and whose history entries were pruned. Running
-- before the merge keeps the probes below free of the merge's dead rows.
DELETE FROM "PlayerSnapshot" WHERE NOT EXISTS (SELECT 1 FROM "LootPlayer" WHERE "LootPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "LootMapPlayer" WHERE "LootMapPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "Timer" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshot"."id");--> statement-breakpoint
-- Legacy writers hashed the same character data with the full profession and
-- with its shortname, so one snapshot content can have two rows. Each content
-- keeps its lowest id, the row resolvePlayerSnapshots already selects, so a
-- writer running during the migration never references a merged row.
CREATE TEMPORARY TABLE "PlayerSnapshotMerge" AS SELECT "id", "survivorId" FROM (SELECT "id", min("id") OVER (PARTITION BY "world", "accountId", "characterId", "name", "prof", "icon") AS "survivorId" FROM "PlayerSnapshot") AS "grouped" WHERE "id" <> "survivorId";--> statement-breakpoint
ALTER TABLE "PlayerSnapshotMerge" ADD PRIMARY KEY ("id");--> statement-breakpoint
ANALYZE "PlayerSnapshotMerge";--> statement-breakpoint
UPDATE "LootPlayer" SET "playerSnapshotId" = "PlayerSnapshotMerge"."survivorId" FROM "PlayerSnapshotMerge" WHERE "LootPlayer"."playerSnapshotId" = "PlayerSnapshotMerge"."id";--> statement-breakpoint
UPDATE "LootMapPlayer" SET "playerSnapshotId" = "PlayerSnapshotMerge"."survivorId" FROM "PlayerSnapshotMerge" WHERE "LootMapPlayer"."playerSnapshotId" = "PlayerSnapshotMerge"."id";--> statement-breakpoint
-- Timer resets wait on remapped timer rows until commit, so timers are
-- remapped last and the slow foreign key probes run before that.
DELETE FROM "PlayerSnapshot" USING "PlayerSnapshotMerge" WHERE "PlayerSnapshot"."id" = "PlayerSnapshotMerge"."id" AND NOT EXISTS (SELECT 1 FROM "Timer" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshot"."id");--> statement-breakpoint
UPDATE "TimerHistoryEntry" SET "actorCharacterSnapshotId" = "PlayerSnapshotMerge"."survivorId" FROM "PlayerSnapshotMerge" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshotMerge"."id";--> statement-breakpoint
UPDATE "TimerHistoryEntry" SET "timerActorCharacterSnapshotId" = "PlayerSnapshotMerge"."survivorId" FROM "PlayerSnapshotMerge" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshotMerge"."id";--> statement-breakpoint
UPDATE "Timer" SET "actorCharacterSnapshotId" = "PlayerSnapshotMerge"."survivorId" FROM "PlayerSnapshotMerge" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshotMerge"."id";--> statement-breakpoint
DELETE FROM "PlayerSnapshot" USING "PlayerSnapshotMerge" WHERE "PlayerSnapshot"."id" = "PlayerSnapshotMerge"."id";--> statement-breakpoint
DROP TABLE "PlayerSnapshotMerge";
