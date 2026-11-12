import { sql, type SQLWrapper } from "drizzle-orm";
import { DateTime, Effect } from "effect";
import { DEFAULT_PERIOD, type Period } from "@lootlog/schema/http-scalars";

/**
 * Statistics of loots and kills count calendar days and weeks in this zone,
 * the zone Margonem's Polish worlds and their players live in.
 */
export const STATS_TIME_ZONE = "Europe/Warsaw";

const PERIOD_HOURS: Record<Exclude<Period, "all">, number> = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "14d": 336,
  "30d": 720,
  "90d": 2160,
  "180d": 4320,
};

/** A rolling statistics period of loots or kills. */
export type StatsPeriod = Period;

/** The UTC hour of an instant, the smallest unit kill statistics store. */
export const getKillStatsBucketStart = (date: Date): Date => {
  const bucketStart = new Date(date);
  bucketStart.setUTCMinutes(0, 0, 0);

  return bucketStart;
};

/** The requested period, or the shared default when the query omits it. */
export const resolveKillStatsPeriod = (period: Period | undefined): Period =>
  period ?? DEFAULT_PERIOD;

/**
 * Where a period of loot or kill statistics starts: its length back from
 * `now`, rounded down to the whole UTC hour kill statistics store, so both
 * count the same span. All-time statistics have no start.
 */
export function getStatsPeriodStart(
  period: Exclude<StatsPeriod, "all">,
  now: Date,
): Date;
export function getStatsPeriodStart(
  period: StatsPeriod | undefined,
  now: Date,
): Date | undefined;
export function getStatsPeriodStart(
  period: StatsPeriod | undefined,
  now: Date,
): Date | undefined {
  if (!period || period === "all") {
    return undefined;
  }

  const periodStart = new Date(now);
  periodStart.setUTCHours(periodStart.getUTCHours() - PERIOD_HOURS[period]);

  return getKillStatsBucketStart(periodStart);
}

/** `getStatsPeriodStart` at the current time of the Effect clock. */
export const currentStatsPeriodStart = (period: StatsPeriod | undefined) =>
  Effect.map(DateTime.nowAsDate, (now) => getStatsPeriodStart(period, now));

/** The calendar day of an instant in `STATS_TIME_ZONE`, as `YYYY-MM-DD`. */
export const toStatsDate = (instant: Date | string) =>
  DateTime.formatIsoDate(
    DateTime.setZoneNamedUnsafe(DateTime.makeUnsafe(instant), STATS_TIME_ZONE),
  );

/** The wall-clock hour (0-23) of an instant in `STATS_TIME_ZONE`. */
export const toStatsHour = (instant: Date) =>
  DateTime.getPart(
    DateTime.setZoneNamedUnsafe(DateTime.makeUnsafe(instant), STATS_TIME_ZONE),
    "hour",
  );

// A literal, not a parameter: grouping repeats the expression of the
// selection, and PostgreSQL matches them by text.
const statsTimeZone = sql.raw(`'${STATS_TIME_ZONE}'`);

/** Wall time in `STATS_TIME_ZONE` of a `timestamptz`. */
export const statsLocalTime = (instant: SQLWrapper) =>
  sql`(${instant} at time zone ${statsTimeZone})`;

/** Wall time in `STATS_TIME_ZONE` of a `timestamp` that holds UTC. */
export const statsLocalTimeOfUtc = (timestamp: SQLWrapper) =>
  sql`(${timestamp} at time zone 'UTC' at time zone ${statsTimeZone})`;

export type KillTimelineUnit = "hour" | "day";

/** Hours for the shortest periods, Warsaw calendar days otherwise. */
export const getKillTimelineUnit = (period: Period): KillTimelineUnit =>
  period === "24h" || period === "3d" ? "hour" : "day";

const HOUR_MS = 3_600_000;

const DAY_MS = 24 * HOUR_MS;

const timelineDate = (unit: KillTimelineUnit, date: Date) =>
  unit === "hour"
    ? getKillStatsBucketStart(date).toISOString()
    : toStatsDate(date);

const nextTimelineDate = (unit: KillTimelineUnit, date: string) =>
  unit === "hour"
    ? new Date(Date.parse(date) + HOUR_MS).toISOString()
    : new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS)
        .toISOString()
        .slice(0, 10);

/**
 * Every hour or day from the period start (or the first kill for all-time
 * statistics) through `now`, so a quiet stretch shows as zero instead of
 * disappearing from the chart.
 */
export const fillKillTimeline = (
  points: ReadonlyArray<{ readonly date: string; readonly kills: number }>,
  unit: KillTimelineUnit,
  periodStart: Date | undefined,
  now: Date,
) => {
  const first = periodStart ? timelineDate(unit, periodStart) : points[0]?.date;

  if (!first) return [];

  const last = timelineDate(unit, now);
  const killsByDate = new Map(points.map((point) => [point.date, point.kills]));
  const filled: Array<{ date: string; kills: number }> = [];

  for (let date = first; date <= last; date = nextTimelineDate(unit, date)) {
    filled.push({ date, kills: killsByDate.get(date) ?? 0 });
  }

  return filled;
};
