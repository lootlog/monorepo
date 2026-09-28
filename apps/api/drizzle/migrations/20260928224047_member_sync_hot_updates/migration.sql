-- Fail instead of queuing Member traffic behind the foreign key and index drop.
-- The migrator rolls back the table, constraint, drop and journal entry together;
-- retry when traffic allows.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
CREATE TABLE "MemberSyncDelivery" (
	"memberId" integer PRIMARY KEY,
	"permissionsChanged" boolean NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"claimedUntil" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MemberSyncDelivery" ADD CONSTRAINT "MemberSyncDelivery_memberId_Member_id_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Drop last: the migrator holds this index's stronger table lock until commit.
DROP INDEX "Member_userId_guildId_active_lastDiscordSyncAt_idx";--> statement-breakpoint
SET LOCAL lock_timeout = DEFAULT;
