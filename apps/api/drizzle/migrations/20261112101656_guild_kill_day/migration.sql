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
--> statement-breakpoint
ALTER TABLE "GuildKillDay" ADD CONSTRAINT "GuildKillDay_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
-- Rolls every existing hourly bucket up into its Europe/Warsaw day. The upsert
-- recomputes whole days, so running this INSERT again after the new API is
-- live repairs the kills the previous API wrote between this migration and
-- the deployment.
INSERT INTO "GuildKillDay" ("guildId", "world", "npcId", "day", "npcName", "npcType", "npcLvl", "kills", "hours")
WITH local AS (
	SELECT "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "kills", "periodStart",
		("periodStart" AT TIME ZONE 'Europe/Warsaw') AS local_time
	FROM "GuildKillBucket"
),
hourly AS (
	SELECT "guildId", "world", "npcId", local_time::date AS day,
		extract(hour FROM local_time)::int AS hour, sum("kills")::int AS kills
	FROM local
	GROUP BY 1, 2, 3, 4, 5
),
daily AS (
	SELECT "guildId", "world", "npcId", day, sum(kills)::int AS kills,
		array_agg(hour) AS hours, array_agg(kills) AS hour_kills
	FROM hourly
	GROUP BY 1, 2, 3, 4
),
latest AS (
	SELECT DISTINCT ON ("guildId", "world", "npcId", local_time::date)
		"guildId", "world", "npcId", local_time::date AS day, "npcName", "npcType", "npcLvl"
	FROM local
	ORDER BY "guildId", "world", "npcId", local_time::date, "periodStart" DESC
)
SELECT latest."guildId", latest."world", latest."npcId", latest.day,
	latest."npcName", latest."npcType", latest."npcLvl", daily.kills,
	ARRAY(
		SELECT coalesce((SELECT x.kills FROM unnest(daily.hours, daily.hour_kills) AS x(hour, kills) WHERE x.hour = slot), 0)
		FROM generate_series(0, 23) AS slot ORDER BY slot
	)
FROM latest
JOIN daily USING ("guildId", "world", "npcId", day)
ON CONFLICT ("guildId", "world", "npcId", "day") DO UPDATE SET
	"kills" = EXCLUDED."kills", "hours" = EXCLUDED."hours",
	"npcName" = EXCLUDED."npcName", "npcType" = EXCLUDED."npcType", "npcLvl" = EXCLUDED."npcLvl";
