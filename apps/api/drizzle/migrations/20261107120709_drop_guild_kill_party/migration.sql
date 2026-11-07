-- Boss kills keep their party in "BossKill", so the party columns
-- 20261107110054_guild_kill_party added to "GuildKillBucket" are no longer
-- written or read. Apply only once no API that writes them runs. Dropping a
-- column of the compressed hypertable does not rewrite its chunks.
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyKills";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "lootRolls";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyWarriors";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyPaladins";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyBladeDancers";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyMages";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyTrackers";--> statement-breakpoint
ALTER TABLE "GuildKillBucket" DROP COLUMN "partyHunters";