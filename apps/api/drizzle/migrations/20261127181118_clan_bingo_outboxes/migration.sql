CREATE TABLE "BingoKillOutbox" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"memberId" integer NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"killedAt" timestamp(3) NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BingoMilestoneOutbox" (
	"id" serial PRIMARY KEY,
	"guildId" text NOT NULL,
	"event" jsonb NOT NULL,
	"lastAttemptAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "BingoKillOutbox_lastAttemptAt_id_idx" ON "BingoKillOutbox" ("lastAttemptAt" NULLS FIRST,"id");--> statement-breakpoint
CREATE INDEX "BingoMilestoneOutbox_lastAttemptAt_id_idx" ON "BingoMilestoneOutbox" ("lastAttemptAt" NULLS FIRST,"id");--> statement-breakpoint
ALTER TABLE "BingoKillOutbox" ADD CONSTRAINT "BingoKillOutbox_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoKillOutbox" ADD CONSTRAINT "BingoKillOutbox_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "BingoMilestoneOutbox" ADD CONSTRAINT "BingoMilestoneOutbox_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;