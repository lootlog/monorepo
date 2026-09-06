CREATE TABLE "GuildKillActivity" (
	"id" text PRIMARY KEY,
	"guildId" text NOT NULL,
	"world" text NOT NULL,
	"npcId" integer NOT NULL,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"npcIcon" text,
	"occurredAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "GuildKillActivity_guildId_occurredAt_idx" ON "GuildKillActivity" ("guildId","occurredAt");--> statement-breakpoint
CREATE INDEX "GuildKillActivity_occurredAt_idx" ON "GuildKillActivity" ("occurredAt");--> statement-breakpoint
ALTER TABLE "GuildKillActivity" ADD CONSTRAINT "GuildKillActivity_guildId_Guild_id_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE;
