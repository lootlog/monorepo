import { MARGONEM_TIME_ZONE } from "@lootlog/datetime";
import { sql, type SQLWrapper } from "drizzle-orm";
import { DateTime, Effect } from "effect";
import { DEFAULT_PERIOD, type Period } from "@lootlog/schema/http-scalars";

const PERIOD_HOURS: Record<Exclude<Period, "all">, number> = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "14d": 336,
  "30d": 720,
  "90d": 2160,
  "180d": 4320,
};

export type StatsPeriod = Period;

export const getKillStatsBucketStart = (date: Date): Date => {
  const bucketStart = new Date(date);
  bucketStart.setUTCMinutes(0, 0, 0);

  return bucketStart;
};

export const resolveKillStatsPeriod = (period: Period | undefined): Period =>
  period ?? DEFAULT_PERIOD;

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

export const currentStatsPeriodStart = (period: StatsPeriod | undefined) =>
  Effect.map(DateTime.nowAsDate, (now) => getStatsPeriodStart(period, now));

export const toStatsDate = (instant: Date | string) =>
  DateTime.formatIsoDate(
    DateTime.setZoneNamedUnsafe(
      DateTime.makeUnsafe(instant),
      MARGONEM_TIME_ZONE,
    ),
  );

export const toStatsHour = (instant: Date) =>
  DateTime.getPart(
    DateTime.setZoneNamedUnsafe(
      DateTime.makeUnsafe(instant),
      MARGONEM_TIME_ZONE,
    ),
    "hour",
  );

const statsTimeZone = sql.raw(`'${MARGONEM_TIME_ZONE}'`);

export const statsLocalTime = (instant: SQLWrapper) =>
  sql`(${instant} at time zone ${statsTimeZone})`;

export const statsLocalTimeOfUtc = (timestamp: SQLWrapper) =>
  sql`(${timestamp} at time zone 'UTC' at time zone ${statsTimeZone})`;

export type KillTimelineUnit = "hour" | "day";

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
