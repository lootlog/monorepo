CREATE TABLE "MemberKillPurge" (
	"memberId" integer PRIMARY KEY,
	"guildId" text NOT NULL,
	"before" timestamp(3) with time zone NOT NULL,
	"claimedUntil" timestamp(3) with time zone,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MemberKillPurge" ADD CONSTRAINT "MemberKillPurge_memberId_Member_id_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;