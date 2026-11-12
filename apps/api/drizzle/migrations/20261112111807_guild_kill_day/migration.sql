CREATE TABLE "GuildKillDay" (
	"guildId" text,
	"world" text,
	"npcId" integer,
	"day" date,
	"npcName" text NOT NULL,
	"npcType" "NpcType" NOT NULL,
	"npcLvl" integer NOT NULL,
	"kills" integer NOT NULL,
	"hours" integer[] NOT NULL,
	CONSTRAINT "GuildKillDay_pkey" PRIMARY KEY("guildId","world","npcId","day")
);
