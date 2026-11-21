CREATE TABLE "NpcSpawnPosition" (
	"gameVersion" "GameVersion",
	"mapId" integer,
	"npcName" text,
	"x" smallint,
	"y" smallint,
	"mapName" text NOT NULL,
	"templateId" integer,
	"reports" integer DEFAULT 1 NOT NULL,
	"firstReportedAt" timestamp(3) DEFAULT now() NOT NULL,
	"lastReportedAt" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "NpcSpawnPosition_pkey" PRIMARY KEY("gameVersion","mapId","npcName","x","y")
);
