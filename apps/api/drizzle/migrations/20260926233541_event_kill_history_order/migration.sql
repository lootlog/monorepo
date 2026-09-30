DROP INDEX "EventHeroKill_heroNpcId_idx";--> statement-breakpoint
DROP INDEX "EventHeroKill_heroNpcId_killedAt_idx";--> statement-breakpoint
DROP INDEX "EventHeroKill_killedAt_idx";--> statement-breakpoint
DROP INDEX "EventKillPoint_memberId_idx";--> statement-breakpoint
CREATE INDEX "EventHeroKill_heroNpcId_killedAt_id_idx" ON "EventHeroKill" ("heroNpcId","killedAt" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "EventHeroKill_killedAt_id_idx" ON "EventHeroKill" ("killedAt" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "EventKillPoint_memberId_killId_idx" ON "EventKillPoint" ("memberId","killId");