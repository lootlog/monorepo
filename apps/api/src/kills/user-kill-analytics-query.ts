import { sql } from "drizzle-orm";
import { DateTime } from "effect";

export const KILL_ANALYTICS_TIMEZONE = "Europe/Warsaw";
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

/** Both variants aggregate inside PostgreSQL. The activity variant never computes NPC ranks or hourly grids. */
export const userKillAnalyticsSql = (
  userId: string,
  world: string | undefined,
  range: KillAnalyticsRange,
  activityOnly: boolean,
) => {
  const scope = sql`"userId" = ${userId} ${world ? sql`and world = ${world}` : sql``}`;
  const start = sql`${range.start}::timestamptz at time zone 'UTC'`;
  const previousThrough = sql`${range.previousThrough}::timestamptz at time zone 'UTC'`;
  const through = sql`${range.through}::timestamptz at time zone 'UTC'`;
  return sql`
    with lifetime as (
      select coalesce(sum("totalKills"), 0)::float8 as total from "UserKillStats" where ${scope}
    ), coverage as (
      select coalesce(sum("totalKills"), 0)::float8 as timed,
        to_char(min("periodStart"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as first
      from "UserKillStatsBucket" where ${scope}
    ), buckets as materialized (
      select *, ("periodStart" at time zone 'UTC' at time zone 'Europe/Warsaw') as local_time
      from "UserKillStatsBucket" where ${scope}
        and "periodStart" >= ${activityOnly ? range.start : range.previousStart}::timestamptz at time zone 'UTC'
        and "periodStart" <= ${through}
    ), daily as (
      select to_char(local_time, 'YYYY-MM-DD') as date, world, sum("totalKills")::float8 as kills
      from buckets group by 1, 2
    )
    ${
      activityOnly
        ? sql``
        : sql`, npc_days as (
      select world, "npcId", local_time::date as date, sum("totalKills")::float8 as kills
      from buckets where "periodStart" >= ${start} group by 1,2,3
    ), npc_totals as (
      select world, "npcId", (array_agg("npcName" order by "periodStart" desc))[1] as "npcName",
        (array_agg("npcType" order by "periodStart" desc))[1]::text as "npcType",
        (array_agg("npcLvl" order by "periodStart" desc))[1] as "npcLvl",
        (array_agg("npcProf" order by "periodStart" desc))[1] as "npcProf",
        (array_agg("npcIcon" order by "periodStart" desc))[1] as "npcIcon",
        coalesce(sum("totalKills") filter (where "periodStart" >= ${start}), 0)::float8 as "totalKills",
        coalesce(sum("totalKills") filter (where "periodStart" >= ${start} and "periodStart" < ${through}), 0)::float8 as "comparisonKills",
        coalesce(sum("totalKills") filter (where "periodStart" < ${previousThrough}), 0)::float8 as "previousKills"
      from buckets group by world, "npcId"
    ), npc_best_days as (
      select distinct on (world, "npcId") world, "npcId", json_build_object('date', date::text, 'kills', kills) as "bestDay"
      from npc_days order by world, "npcId", kills desc, date asc
    ), npc_ranked as (
      select n.*, (n."comparisonKills" - n."previousKills") as "deltaKills", d."bestDay"
      from npc_totals n left join npc_best_days d using (world, "npcId")
    )`
    }
    select json_build_object(
      'allTimeKills', lifetime.total, 'timedKills', coverage.timed, 'firstBucketAt', coverage.first,
      'daily', coalesce((select json_agg(d order by d.date, d.world) from daily d), '[]'::json)
      ${
        activityOnly
          ? sql``
          : sql`,
      'currentKills', (select coalesce(sum("totalKills"),0)::float8 from buckets where "periodStart" >= ${start} and "periodStart" < ${through}),
      'previousKills', (select coalesce(sum("totalKills"),0)::float8 from buckets where "periodStart" < ${previousThrough}),
      'uniqueNpcs', (select count(*)::int from npc_totals where "totalKills">0),
      'hourlyWeekday', coalesce((select json_agg(h) from (
        select extract(isodow from local_time)::int as weekday, extract(hour from local_time)::int as hour, sum("totalKills")::float8 as kills
        from buckets where "periodStart" >= ${start} group by 1,2 order by 1,2
      ) h), '[]'::json),
      'types', coalesce((select json_agg(t) from (
        select "npcType" as "npcType", sum("totalKills")::float8 as "totalKills", count(*)::int as "uniqueNpcs"
        from npc_totals where "totalKills">0 group by "npcType" order by sum("totalKills") desc, "npcType"
      ) t), '[]'::json),
      'npcs', coalesce((select json_agg(n) from (select * from npc_ranked where "totalKills">0 order by "totalKills" desc, world, "npcId" limit 20) n), '[]'::json),
      'npcGains', coalesce((select json_agg(n) from (select * from npc_ranked where "deltaKills">0 order by "deltaKills" desc, world, "npcId" limit 10) n), '[]'::json),
      'worldComparisons', coalesce((select json_agg(w) from (
        select world, coalesce(sum("totalKills") filter(where "periodStart" >= ${start} and "periodStart" < ${through}),0)::float8 as "comparisonKills",
          coalesce(sum("totalKills") filter(where "periodStart" < ${previousThrough}),0)::float8 as "previousKills"
        from buckets group by world
      ) w), '[]'::json)
      `
      }
    ) as payload from lifetime cross join coverage`;
};
