import { and, eq, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { DateTime } from "effect";
import {
  userCharacterKillBucketTable,
  userKillBucketTable,
  userKillCharacterTable,
  userKillTotalTable,
} from "#src/database/drizzle/schema";

const KILL_ANALYTICS_TIMEZONE = "Europe/Warsaw";

export const getKillAnalyticsRange = (now: DateTime.Utc, days: number) => {
  const zoned = DateTime.setZoneNamedUnsafe(now, KILL_ANALYTICS_TIMEZONE);
  const today = DateTime.startOf(zoned, "day");
  const start = DateTime.subtract(today, { days: days - 1 });
  const previousStart = DateTime.subtract(start, { days });
  // Round the instant, not a local wall hour: the repeated autumn hour is distinct.
  const through = DateTime.startOf(now, "hour");

  const previousThrough = DateTime.subtract(
    DateTime.setZoneNamedUnsafe(through, KILL_ANALYTICS_TIMEZONE),
    { days },
  );

  return {
    days,
    generatedAt: DateTime.formatIso(now),
    startDate: DateTime.formatIsoDate(start),
    endDate: DateTime.formatIsoDate(today),
    start: DateTime.formatIso(start),
    previousStart: DateTime.formatIso(previousStart),
    through: DateTime.formatIso(through),
    previousThrough: DateTime.formatIso(previousThrough),
  };
};

export type KillAnalyticsRange = ReturnType<typeof getKillAnalyticsRange>;

export type UserKillAnalyticsScope = {
  readonly world?: string;
  /** Reads the character's own tables, which start when per-character tracking began. */
  readonly characterId?: string;
};

const ISO_UTC = 'YYYY-MM-DD"T"HH24:MI:SS"Z"';

/**
 * Every monster an account kills in a year fits: the heaviest accounts kill
 * about 400 different bosses. The bound keeps the response finite, not the
 * ranking short.
 */
const USER_KILL_ANALYTICS_NPC_LIMIT = 500;

/** Both variants aggregate inside PostgreSQL. The activity variant never computes NPC ranks or hourly grids. */
export const userKillAnalyticsSql = (
  discordUserId: string,
  { world, characterId }: UserKillAnalyticsScope,
  range: KillAnalyticsRange,
  activityOnly: boolean,
  npcType?: string,
) => {
  const bucket = characterId
    ? userCharacterKillBucketTable
    : userKillBucketTable;

  const total = characterId ? userKillCharacterTable : userKillTotalTable;

  const scope = (table: {
    readonly discordUserId: AnyPgColumn;
    readonly world: AnyPgColumn;
    readonly characterId?: AnyPgColumn;
  }) =>
    and(
      eq(table.discordUserId, discordUserId),
      world ? eq(table.world, world) : undefined,
      characterId && table.characterId
        ? eq(table.characterId, characterId)
        : undefined,
    );

  // Every kill since the user's first per-character kill has a character, so
  // a character's history is known from then on, even before its own first kill.
  const trackedSince = characterId
    ? sql`(select to_char(min(${userKillCharacterTable.firstKilledAt}) at time zone 'UTC', ${ISO_UTC})
        from ${userKillCharacterTable} where ${eq(userKillCharacterTable.discordUserId, discordUserId)})`
    : sql`null`;

  const start = sql`${range.start}::timestamptz`;
  const previousThrough = sql`${range.previousThrough}::timestamptz`;
  const through = sql`${range.through}::timestamptz`;
  const rankedType = npcType ? sql`and "npcType" = ${npcType}` : sql``;

  return sql`
    with lifetime as (
      select coalesce(sum(${total.kills}), 0)::float8 as total from ${total} where ${scope(total)}
    ), coverage as (
      select coalesce(sum(${bucket.kills}), 0)::float8 as timed,
        to_char(min(${bucket.periodStart}) at time zone 'UTC', ${ISO_UTC}) as first
      from ${bucket} where ${scope(bucket)}
    ), buckets as materialized (
      select ${bucket.world} as world, ${bucket.npcId} as "npcId", ${bucket.npcName} as "npcName",
        ${bucket.npcType} as "npcType", ${bucket.npcLvl} as "npcLvl", ${bucket.npcProf} as "npcProf",
        ${bucket.npcIcon} as "npcIcon", ${bucket.kills} as kills, ${bucket.periodStart} as "periodStart",
        (${bucket.periodStart} at time zone 'Europe/Warsaw') as local_time
      from ${bucket} where ${scope(bucket)}
        and ${bucket.periodStart} >= ${activityOnly ? range.start : range.previousStart}::timestamptz
        and ${bucket.periodStart} <= ${through}
    ), daily as (
      select to_char(local_time, 'YYYY-MM-DD') as date, world, sum(kills)::float8 as kills
      from buckets group by 1, 2
    )
    ${
      activityOnly
        ? sql``
        : sql`, npc_totals as (
      select world, "npcId", (array_agg("npcName" order by "periodStart" desc))[1] as "npcName",
        (array_agg("npcType" order by "periodStart" desc))[1]::text as "npcType",
        (array_agg("npcLvl" order by "periodStart" desc))[1] as "npcLvl",
        (array_agg("npcProf" order by "periodStart" desc))[1] as "npcProf",
        (array_agg("npcIcon" order by "periodStart" desc))[1] as "npcIcon",
        coalesce(sum(kills) filter (where "periodStart" >= ${start}), 0)::float8 as "totalKills",
        coalesce(sum(kills) filter (where "periodStart" >= ${start} and "periodStart" < ${through}), 0)::float8 as "comparisonKills",
        coalesce(sum(kills) filter (where "periodStart" < ${previousThrough}), 0)::float8 as "previousKills"
      from buckets group by world, "npcId"
    ), npc_ranked as (
      select n.*, (n."comparisonKills" - n."previousKills") as "deltaKills"
      from npc_totals n
    )`
    }
    select json_build_object(
      'allTimeKills', lifetime.total, 'timedKills', coverage.timed, 'firstBucketAt', coverage.first, 'trackedSince', ${trackedSince},
      'daily', coalesce((select json_agg(d order by d.date, d.world) from daily d), '[]'::json)
      ${
        activityOnly
          ? sql``
          : sql`,
      'currentKills', (select coalesce(sum(kills),0)::float8 from buckets where "periodStart" >= ${start} and "periodStart" < ${through}),
      'previousKills', (select coalesce(sum(kills),0)::float8 from buckets where "periodStart" < ${previousThrough}),
      'uniqueNpcs', (select count(*)::int from npc_totals where "totalKills">0),
      'hourlyWeekday', coalesce((select json_agg(h) from (
        select extract(isodow from local_time)::int as weekday, extract(hour from local_time)::int as hour, sum(kills)::float8 as kills
        from buckets where "periodStart" >= ${start} group by 1,2 order by 1,2
      ) h), '[]'::json),
      'types', coalesce((select json_agg(t) from (
        select "npcType" as "npcType", sum("totalKills")::float8 as "totalKills", count(*)::int as "uniqueNpcs"
        from npc_totals where "totalKills">0 group by "npcType" order by sum("totalKills") desc, "npcType"
      ) t), '[]'::json),
      'npcs', coalesce((select json_agg(n) from (select * from npc_ranked where "totalKills">0 ${rankedType} order by "totalKills" desc, world, "npcId" limit ${USER_KILL_ANALYTICS_NPC_LIMIT}) n), '[]'::json),
      'worldComparisons', coalesce((select json_agg(w) from (
        select world, coalesce(sum(kills) filter(where "periodStart" >= ${start} and "periodStart" < ${through}),0)::float8 as "comparisonKills",
          coalesce(sum(kills) filter(where "periodStart" < ${previousThrough}),0)::float8 as "previousKills"
        from buckets group by world
      ) w), '[]'::json)
      `
      }
    ) as payload from lifetime cross join coverage`;
};
