CREATE TABLE "MemberSyncDelivery" (
	"memberId" integer PRIMARY KEY,
	"permissionsChanged" boolean NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MemberSyncDelivery" ADD CONSTRAINT "MemberSyncDelivery_memberId_Member_id_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Drop last: the migrator holds this index's stronger table lock until commit.
DROP INDEX "Member_userId_guildId_active_lastDiscordSyncAt_idx";
