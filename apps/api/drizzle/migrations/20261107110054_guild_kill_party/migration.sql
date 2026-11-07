-- Organization kills start recording their party: the loot rolls it got
-- and its members of each profession, for drop rates per roll. Kills before
-- this, and kills older Game clients report, have none. The bucket is a
-- compressed hypertable; columns with a constant default are added without
-- rewriting its chunks.
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyKills" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "lootRolls" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyWarriors" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyPaladins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyBladeDancers" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyMages" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyTrackers" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "GuildKillBucket" ADD COLUMN "partyHunters" integer DEFAULT 0 NOT NULL;