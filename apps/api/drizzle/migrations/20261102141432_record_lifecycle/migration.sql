ALTER TABLE "GuildDocumentHistory" DROP CONSTRAINT "GuildDocumentHistory_guildId_fkey", ADD CONSTRAINT "GuildDocumentHistory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "GuildDocument" DROP CONSTRAINT "GuildDocument_guildId_fkey", ADD CONSTRAINT "GuildDocument_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "GuildKillActivity" DROP CONSTRAINT "GuildKillActivity_guildId_Guild_id_fkey", ADD CONSTRAINT "GuildKillActivity_guildId_Guild_id_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "NotificationRule" DROP CONSTRAINT "NotificationRule_guildId_fkey", ADD CONSTRAINT "NotificationRule_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "ReservationShareInvitation" DROP CONSTRAINT "ReservationShareInvitation_targetGuildId_fkey", ADD CONSTRAINT "ReservationShareInvitation_targetGuildId_fkey" FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
-- Document history keeps the newest 100 entries per document (see
-- DOCUMENT_HISTORY_RETAINED_ENTRIES); saves prune older entries from now on.
DELETE FROM "GuildDocumentHistory" AS "history"
USING (
  SELECT "id"
  FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "documentId"
      ORDER BY "version" DESC, "editedAt" DESC, "id" DESC
    ) AS "position"
    FROM "GuildDocumentHistory"
  ) AS "ranked"
  WHERE "ranked"."position" > 100
) AS "stale"
WHERE "history"."id" = "stale"."id";
