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
DROP TABLE "PlayerSnapshotMerge";--> statement-breakpoint
-- Deletes snapshots that nothing references: timer actors whose timer moved
-- to another snapshot, was deleted or pruned its history. Timer references
-- are ON DELETE SET NULL, so the rows are locked first and re-checked in a new
-- statement, which sees every reference committed before the locks instead of
-- nulling it. Running last keeps the locks to the final seconds; a request
-- that resolved one of these rows and references it after that fails its
-- foreign key check.
CREATE TEMPORARY TABLE "PlayerSnapshotOrphan" AS SELECT "id" FROM "PlayerSnapshot" WHERE NOT EXISTS (SELECT 1 FROM "LootPlayer" WHERE "LootPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "LootMapPlayer" WHERE "LootMapPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "Timer" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshot"."id") FOR UPDATE OF "PlayerSnapshot";--> statement-breakpoint
DELETE FROM "PlayerSnapshot" USING "PlayerSnapshotOrphan" WHERE "PlayerSnapshot"."id" = "PlayerSnapshotOrphan"."id" AND NOT EXISTS (SELECT 1 FROM "LootPlayer" WHERE "LootPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "LootMapPlayer" WHERE "LootMapPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "Timer" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshot"."id");--> statement-breakpoint
DROP TABLE "PlayerSnapshotOrphan";
