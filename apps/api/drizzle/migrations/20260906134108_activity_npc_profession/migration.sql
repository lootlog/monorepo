ALTER TABLE "GuildKillActivity" ADD COLUMN "npcProf" text;
--> statement-breakpoint
UPDATE "GuildKillActivity" AS activity
SET "npcProf" = summary."npcProf"
FROM "GuildKillSummary" AS summary
WHERE activity."npcProf" IS NULL
  AND activity."guildId" = summary."guildId"
  AND activity.world = summary.world
  AND activity."npcId" = summary."npcId"
  AND activity."occurredAt" = summary."lastKilledAt"
  AND activity."npcName" = summary."npcName"
  AND activity."npcType" = summary."npcType"
  AND activity."npcLvl" = summary."npcLvl"
  AND summary."npcProf" IS NOT NULL;
