-- The migrator runs in a transaction, which does not support CONCURRENTLY.
CREATE INDEX "LootPublicationOutbox_lastAttemptAt_id_idx" ON "LootPublicationOutbox" ("lastAttemptAt" NULLS FIRST,"id");
