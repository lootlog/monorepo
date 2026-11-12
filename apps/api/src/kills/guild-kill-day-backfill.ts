import { BunRuntime } from "@effect/platform-bun";
import { migrationClient } from "@lootlog/database/migration";
import { Effect } from "effect";
import type { Client } from "pg";
import { ApiDatabaseLive } from "#src/database/drizzle/database";

/**
 * Rolls one Organization's hourly buckets up into `GuildKillDay`, replacing
 * the rows of the days it finds. A full raw statement: the builder cannot
 * express the per-day array of 24 hourly counters built from `unnest` and
 * `generate_series`. It takes no table lock beyond row locks on the Organization's
 * own day rows, so live kill writes keep running; a kill committed while this
 * statement runs for the same Organization and day can be missed, so run it
 * once more for the current day after deploying the API that writes the rollup.
 */
export const GUILD_KILL_DAY_BACKFILL_SQL = `
INSERT INTO "GuildKillDay" ("guildId", "world", "npcId", "day", "npcName", "npcType", "npcLvl", "kills", "hours")
WITH local AS (
	SELECT "guildId", "world", "npcId", "npcName", "npcType", "npcLvl", "kills", "periodStart",
		("periodStart" AT TIME ZONE 'Europe/Warsaw') AS local_time
	FROM "GuildKillBucket"
	WHERE "guildId" = $1
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
	"npcName" = EXCLUDED."npcName", "npcType" = EXCLUDED."npcType", "npcLvl" = EXCLUDED."npcLvl"
`;

/** One short transaction per Organization, so no write waits for the whole history. */
export const backfillGuildKillDay = async (
  client: Pick<Client, "query">,
  log: (message: string) => void = () => {},
) => {
  const { rows } = await client.query<{ guildId: string }>(
    `SELECT DISTINCT "guildId" FROM "GuildKillBucket" ORDER BY 1`,
  );

  for (const [index, { guildId }] of rows.entries()) {
    const { rowCount } = await client.query(GUILD_KILL_DAY_BACKFILL_SQL, [
      guildId,
    ]);

    log(`${index + 1}/${rows.length} ${guildId}: ${rowCount} day rows`);
  }

  return rows.length;
};

if (import.meta.main) {
  BunRuntime.runMain(
    Effect.gen(function* () {
      const client = yield* migrationClient;

      yield* Effect.tryPromise(() =>
        backfillGuildKillDay(client, (message) => console.log(message)),
      );
    }).pipe(Effect.scoped, Effect.provide(ApiDatabaseLive)),
  );
}
