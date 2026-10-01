-- The migrator runs in a transaction, which does not support CONCURRENTLY.
-- Building these indexes here would block loot writes for minutes on a
-- populated database, so they must be built first (see drizzle/README.md).
DO $$
BEGIN
  IF (SELECT "reltuples" FROM pg_class WHERE "oid" = '"LootItem"'::regclass) > 100000
    AND (
      SELECT count(*) FROM pg_index WHERE "indisvalid" AND "indexrelid" IN (
        to_regclass('"LootItem_hid_idx"'),
        to_regclass('"LootPlayer_lootId_id_key"'),
        to_regclass('"OrganizationLootRecord_archivedByMemberId_notnull_idx"')
      )
    ) < 3
  THEN
    RAISE EXCEPTION 'Build the db_audit_cleanup indexes concurrently first; see apps/api/drizzle/README.md';
  END IF;
END $$;--> statement-breakpoint
-- Loot rows without an Organization record are visible to no one; legacy
-- writers left them before August 2026. They are locked first and re-checked
-- in a new statement, which sees every record committed before the locks. A
-- record inserted later waits on the lock and then fails its foreign key check
-- instead of being removed by the ON DELETE CASCADE.
CREATE TEMPORARY TABLE "OrphanLoot" AS SELECT "id" FROM "Loot" WHERE NOT EXISTS (SELECT 1 FROM "OrganizationLootRecord" WHERE "OrganizationLootRecord"."lootId" = "Loot"."id") FOR UPDATE OF "Loot";--> statement-breakpoint
DELETE FROM "OrphanLoot" WHERE EXISTS (SELECT 1 FROM "OrganizationLootRecord" WHERE "OrganizationLootRecord"."lootId" = "OrphanLoot"."id");--> statement-breakpoint
ALTER TABLE "OrphanLoot" ADD PRIMARY KEY ("id");--> statement-breakpoint
ANALYZE "OrphanLoot";--> statement-breakpoint
CREATE TEMPORARY TABLE "OrphanItemSnapshot" AS SELECT DISTINCT "itemSnapshotId" AS "id" FROM "LootItem" INNER JOIN "OrphanLoot" ON "OrphanLoot"."id" = "LootItem"."lootId";--> statement-breakpoint
CREATE TEMPORARY TABLE "OrphanNpcSnapshot" AS SELECT DISTINCT "npcSnapshotId" AS "id" FROM "LootNpc" INNER JOIN "OrphanLoot" ON "OrphanLoot"."id" = "LootNpc"."lootId";--> statement-breakpoint
CREATE TEMPORARY TABLE "OrphanPlayerSnapshot" AS SELECT DISTINCT "playerSnapshotId" AS "id" FROM "LootPlayer" INNER JOIN "OrphanLoot" ON "OrphanLoot"."id" = "LootPlayer"."lootId";--> statement-breakpoint
DELETE FROM "LootItem" USING "OrphanLoot" WHERE "LootItem"."lootId" = "OrphanLoot"."id";--> statement-breakpoint
DELETE FROM "LootPlayer" USING "OrphanLoot" WHERE "LootPlayer"."lootId" = "OrphanLoot"."id";--> statement-breakpoint
DELETE FROM "LootNpc" USING "OrphanLoot" WHERE "LootNpc"."lootId" = "OrphanLoot"."id";--> statement-breakpoint
DELETE FROM "LootPublicationOutbox" USING "OrphanLoot" WHERE "LootPublicationOutbox"."lootId" = "OrphanLoot"."id";--> statement-breakpoint
DELETE FROM "Loot" USING "OrphanLoot" WHERE "Loot"."id" = "OrphanLoot"."id";--> statement-breakpoint
DROP TABLE "OrphanLoot";--> statement-breakpoint
-- Deletes the snapshots that only those loots referenced, with the same
-- lock-then-recheck order; a request that resolved one of them and references
-- it after the locks fails its foreign key check.
CREATE TEMPORARY TABLE "UnreferencedItemSnapshot" AS SELECT "ItemSnapshot"."id" FROM "ItemSnapshot" INNER JOIN "OrphanItemSnapshot" ON "OrphanItemSnapshot"."id" = "ItemSnapshot"."id" WHERE NOT EXISTS (SELECT 1 FROM "LootItem" WHERE "LootItem"."itemSnapshotId" = "ItemSnapshot"."id") FOR UPDATE OF "ItemSnapshot";--> statement-breakpoint
DELETE FROM "ItemSnapshot" USING "UnreferencedItemSnapshot" WHERE "ItemSnapshot"."id" = "UnreferencedItemSnapshot"."id" AND NOT EXISTS (SELECT 1 FROM "LootItem" WHERE "LootItem"."itemSnapshotId" = "ItemSnapshot"."id");--> statement-breakpoint
CREATE TEMPORARY TABLE "UnreferencedNpcSnapshot" AS SELECT "NpcSnapshot"."id" FROM "NpcSnapshot" INNER JOIN "OrphanNpcSnapshot" ON "OrphanNpcSnapshot"."id" = "NpcSnapshot"."id" WHERE NOT EXISTS (SELECT 1 FROM "LootNpc" WHERE "LootNpc"."npcSnapshotId" = "NpcSnapshot"."id") FOR UPDATE OF "NpcSnapshot";--> statement-breakpoint
DELETE FROM "NpcSnapshot" USING "UnreferencedNpcSnapshot" WHERE "NpcSnapshot"."id" = "UnreferencedNpcSnapshot"."id" AND NOT EXISTS (SELECT 1 FROM "LootNpc" WHERE "LootNpc"."npcSnapshotId" = "NpcSnapshot"."id");--> statement-breakpoint
CREATE TEMPORARY TABLE "UnreferencedPlayerSnapshot" AS SELECT "PlayerSnapshot"."id" FROM "PlayerSnapshot" INNER JOIN "OrphanPlayerSnapshot" ON "OrphanPlayerSnapshot"."id" = "PlayerSnapshot"."id" WHERE NOT EXISTS (SELECT 1 FROM "LootPlayer" WHERE "LootPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "LootMapPlayer" WHERE "LootMapPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "Timer" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshot"."id") FOR UPDATE OF "PlayerSnapshot";--> statement-breakpoint
DELETE FROM "PlayerSnapshot" USING "UnreferencedPlayerSnapshot" WHERE "PlayerSnapshot"."id" = "UnreferencedPlayerSnapshot"."id" AND NOT EXISTS (SELECT 1 FROM "LootPlayer" WHERE "LootPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "LootMapPlayer" WHERE "LootMapPlayer"."playerSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "Timer" WHERE "Timer"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."actorCharacterSnapshotId" = "PlayerSnapshot"."id") AND NOT EXISTS (SELECT 1 FROM "TimerHistoryEntry" WHERE "TimerHistoryEntry"."timerActorCharacterSnapshotId" = "PlayerSnapshot"."id");--> statement-breakpoint
DROP TABLE "OrphanItemSnapshot", "OrphanNpcSnapshot", "OrphanPlayerSnapshot", "UnreferencedItemSnapshot", "UnreferencedNpcSnapshot", "UnreferencedPlayerSnapshot";--> statement-breakpoint
-- Guild documents require active membership, so documents of Discord guilds
-- without an Organization row can no longer be read or written.
DELETE FROM "UserSettingDocument" WHERE "scopeType" = 'GUILD' AND NOT EXISTS (SELECT 1 FROM "Guild" WHERE "Guild"."id" = "UserSettingDocument"."scopeId");--> statement-breakpoint
DELETE FROM "LootlogConfigNpc" WHERE NOT EXISTS (SELECT 1 FROM "Guild" WHERE "Guild"."id" = "LootlogConfigNpc"."lootlogConfigId");--> statement-breakpoint
DELETE FROM "LootlogConfig" WHERE NOT EXISTS (SELECT 1 FROM "Guild" WHERE "Guild"."id" = "LootlogConfig"."id");--> statement-breakpoint
-- Settings documents replaced these tables; their rows were backfilled by
-- 20260910185220_settings_documents_backfill and nothing reads them since.
DROP TABLE "UserGameAccountSettings";--> statement-breakpoint
DROP TABLE "UserGuildTimerSettings";--> statement-breakpoint
DROP TABLE "UserSoundSettings";--> statement-breakpoint
DROP TABLE "UserTimerSettings";--> statement-breakpoint
-- Legacy ORM journal kept by databases created before the Drizzle baseline.
DROP TABLE IF EXISTS "_prisma_migrations";--> statement-breakpoint
-- Statements below lock their tables until commit; fail fast instead of
-- queueing loot writes behind a long-running reader.
SET LOCAL lock_timeout = '3s';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "LootItem_hid_idx" ON "LootItem" USING hash ("hid");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "LootPlayer_lootId_id_key" ON "LootPlayer" ("lootId","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "OrganizationLootRecord_archivedByMemberId_notnull_idx" ON "OrganizationLootRecord" ("archivedByMemberId") WHERE "archivedByMemberId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Member_guildId_id_idx" ON "Member" ("guildId","id");--> statement-breakpoint
DROP INDEX IF EXISTS "LootItem_hid_lootId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "LootPlayer_lootId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "OrganizationLootRecord_archivedByMemberId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "Member_id_guildId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "UserKillStatsBucket_userId_npcType_periodStart_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "NpcKillStatsBucket_guildId_npcType_periodStart_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "UserKillStats_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "UserKillStats_userId_npcType_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "NpcKillStats_guildId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "GuildKillSummary_guildId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "UserSettingDocument_userId_domain_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "UserSettings_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "Guild_vanityUrl_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "MapTemplate_guildId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "Timer_npcId_guildId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_timer_npc_name";--> statement-breakpoint
DROP INDEX IF EXISTS "Reservation_createdByUserId_endsAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ReservationShareInvitation_expiresAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "DiscordGuildChannelSnapshot_guildId_active_canSend_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "MemberRefreshJob_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "EventMap_mapId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "EventMap_mapName_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "EventHeroNpc_npcId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "EventRespawnWindowSummary_windowClosedAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "GuildDocument_guildId_deletedAt_updatedAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "GuildDocumentHistory_documentId_editedAt_idx";--> statement-breakpoint
-- The keys move onto existing unique indexes, which only renames them. They
-- run last because they lock the loot write path until the commit.
ALTER TABLE "LootSubmission" DROP CONSTRAINT "LootSubmission_pkey", ADD CONSTRAINT "LootSubmission_pkey" PRIMARY KEY USING INDEX "LootSubmission_organizationLootRecordId_memberId_key", DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "LootPlayer" DROP CONSTRAINT "LootPlayer_pkey", ADD CONSTRAINT "LootPlayer_pkey" PRIMARY KEY USING INDEX "LootPlayer_lootId_id_key";
