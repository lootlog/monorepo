import { DateTime, Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  UserKillActivityResponse,
  UserKillAnalyticsResponse,
  type UserKillAnalyticsQuery,
  type UserKillActivityQuery,
} from "#src/contracts/kills/analytics-schemas";
import {
  buildKillQueryCacheKey,
  type KillQueryCache,
} from "./kill-query-support.js";
import {
  getKillAnalyticsRange,
  userKillAnalyticsSql,
  type KillAnalyticsRange,
} from "./user-kill-analytics-query.js";

const RawDaily = Schema.Struct({
  date: Schema.String,
  world: Schema.String,
  kills: Schema.Number,
});
const RawBase = Schema.Struct({
  allTimeKills: Schema.Number,
  timedKills: Schema.Number,
  firstBucketAt: Schema.NullOr(Schema.String),
  daily: Schema.Array(RawDaily),
});
const RawNpc = Schema.Struct({
  world: Schema.String,
  npcId: Schema.Number,
  npcName: Schema.String,
  npcType: Schema.String,
  npcLvl: Schema.Number,
  npcProf: Schema.NullOr(Schema.String),
  npcIcon: Schema.NullOr(Schema.String),
  totalKills: Schema.Number,
  previousKills: Schema.Number,
  comparisonKills: Schema.Number,
  deltaKills: Schema.Number,
  bestDay: Schema.NullOr(
    Schema.Struct({ date: Schema.String, kills: Schema.Number }),
  ),
});
const RawAnalytics = Schema.Struct({
  ...RawBase.fields,
  currentKills: Schema.Number,
  previousKills: Schema.Number,
  uniqueNpcs: Schema.Number,
  hourlyWeekday: Schema.Array(
    Schema.Struct({
      weekday: Schema.Number,
      hour: Schema.Number,
      kills: Schema.Number,
    }),
  ),
  types: Schema.Array(
    Schema.Struct({
      npcType: Schema.String,
      totalKills: Schema.Number,
      uniqueNpcs: Schema.Number,
    }),
  ),
  npcs: Schema.Array(RawNpc),
  npcGains: Schema.Array(RawNpc),
  worldComparisons: Schema.Array(
    Schema.Struct({
      world: Schema.String,
      comparisonKills: Schema.Number,
      previousKills: Schema.Number,
    }),
  ),
});
type DailyPoint = UserKillActivityResponse["daily"][number];
const localDate = (date: string) =>
  DateTime.makeZonedUnsafe(date, {
    timeZone: "Europe/Warsaw",
    adjustForTimeZone: true,
  });
const dateAfter = (date: string, days: number) =>
  DateTime.formatIsoDate(DateTime.add(localDate(date), { days }));
const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / previous) * 100;

export const buildKillActivity = (
  raw: typeof RawBase.Type,
  range: KillAnalyticsRange,
  world?: string,
): UserKillActivityResponse => {
  const firstDate = raw.firstBucketAt
    ? DateTime.formatIsoDate(
        DateTime.setZoneNamedUnsafe(
          DateTime.makeUnsafe(raw.firstBucketAt),
          "Europe/Warsaw",
        ),
      )
    : null;
  const untimedKills = Math.max(0, raw.allTimeKills - raw.timedKills);
  const byDate = new Map<string, number>();
  const worldsByDate = new Map<string, Set<string>>();
  for (const row of raw.daily) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.kills);
    if (row.kills > 0) {
      const worlds = worldsByDate.get(row.date) ?? new Set<string>();
      worlds.add(row.world);
      worldsByDate.set(row.date, worlds);
    }
  }
  const daily = Array.from({ length: range.days }, (_, index) => {
    const date = dateAfter(range.startDate, index);
    const unknown =
      untimedKills > 0 && (firstDate === null || date < firstDate);
    return {
      date,
      kills: unknown ? null : (byDate.get(date) ?? 0),
      worlds: [...(worldsByDate.get(date) ?? [])].sort(),
      partial:
        unknown ||
        date === range.endDate ||
        (untimedKills > 0 && date === firstDate),
    };
  });
  const coverage =
    raw.timedKills === 0 && raw.allTimeKills > 0
      ? "unavailable"
      : raw.allTimeKills !== raw.timedKills
        ? "partial"
        : "complete";
  return {
    meta: {
      timezone: "Europe/Warsaw",
      generatedAt: range.generatedAt,
      days: range.days,
      world: world ?? null,
      startDate: range.startDate,
      endDate: range.endDate,
      firstBucketAt: raw.firstBucketAt,
      coverage,
      allTimeKills: raw.allTimeKills,
      timedKills: raw.timedKills,
      untimedKills,
      includesCurrentHour: true,
    },
    daily,
  };
};

const periodRecords = (
  daily: ReadonlyArray<DailyPoint>,
  unit: "day" | "week" | "month",
) => {
  const periods = new Map<
    string,
    {
      startDate: string;
      endDate: string;
      kills: number;
      partial: boolean;
      days: number;
    }
  >();
  for (const point of daily) {
    if (point.kills === null) continue;
    const date = localDate(point.date);
    const start = DateTime.startOf(date, unit, { weekStartsOn: 1 });
    const next =
      unit === "day"
        ? DateTime.add(start, { days: 1 })
        : unit === "week"
          ? DateTime.add(start, { days: 7 })
          : DateTime.add(start, { months: 1 });
    const startDate = DateTime.formatIsoDate(start);
    const endDate = DateTime.formatIsoDate(
      DateTime.subtract(next, { days: 1 }),
    );
    const previous = periods.get(startDate);
    periods.set(startDate, {
      startDate,
      endDate,
      kills: (previous?.kills ?? 0) + point.kills,
      partial: (previous?.partial ?? false) || point.partial,
      days: (previous?.days ?? 0) + 1,
    });
  }
  return [...periods.values()].map(({ days, ...record }) => {
    let expectedDays = 0;
    for (
      let date = record.startDate;
      date <= record.endDate;
      date = dateAfter(date, 1)
    )
      expectedDays++;
    return { ...record, partial: record.partial || days < expectedDays };
  });
};
const bestRecord = (records: ReturnType<typeof periodRecords>) =>
  records
    .filter((record) => record.kills > 0)
    .sort(
      (a, b) => b.kills - a.kills || a.startDate.localeCompare(b.startDate),
    )[0] ?? null;

const killStreaks = (daily: ReadonlyArray<DailyPoint>) => {
  let longestStreak = 0,
    streak = 0;
  for (const day of daily) {
    streak = (day.kills ?? 0) > 0 ? streak + 1 : 0;
    longestStreak = Math.max(streak, longestStreak);
  }
  let currentStreak = 0;
  let index = daily.length - 1;
  if ((daily[index]?.kills ?? 0) === 0) index--;
  for (; index >= 0 && (daily[index]?.kills ?? 0) > 0; index--) currentStreak++;
  return { currentStreak, longestStreak };
};

export const buildKillAnalytics = (
  raw: typeof RawAnalytics.Type,
  range: KillAnalyticsRange,
  world?: string,
): UserKillAnalyticsResponse => {
  const activity = buildKillActivity(raw, range, world);
  const { daily } = activity;
  const { currentStreak, longestStreak } = killStreaks(daily);
  const totalKills = daily.reduce((total, day) => total + (day.kills ?? 0), 0);
  const activeDays = daily.filter((day) => (day.kills ?? 0) > 0).length;
  const weekly = periodRecords(daily, "week");
  const mapNpc = (npc: typeof RawNpc.Type) => ({
    ...npc,
    share: totalKills ? (npc.totalKills / totalKills) * 100 : 0,
    deltaPercent: percentChange(npc.comparisonKills, npc.previousKills),
  });
  const worlds = new Map<
    string,
    {
      world: string;
      totalKills: number;
      comparisonKills: number;
      previousKills: number;
      daily: Array<{ date: string; kills: number | null }>;
    }
  >();
  for (const previous of raw.worldComparisons)
    worlds.set(previous.world, {
      world: previous.world,
      totalKills: 0,
      comparisonKills: previous.comparisonKills,
      previousKills: previous.previousKills,
      daily: [],
    });
  for (const row of raw.daily) {
    if (row.date < range.startDate) continue;
    const entry = worlds.get(row.world) ?? {
      world: row.world,
      totalKills: 0,
      comparisonKills:
        raw.worldComparisons.find((value) => value.world === row.world)
          ?.comparisonKills ?? 0,
      previousKills:
        raw.worldComparisons.find((value) => value.world === row.world)
          ?.previousKills ?? 0,
      daily: [],
    };
    entry.totalKills += row.kills;
    entry.daily.push({ date: row.date, kills: row.kills });
    worlds.set(row.world, entry);
  }
  for (const entry of worlds.values()) {
    const counts = new Map(entry.daily.map((day) => [day.date, day.kills]));
    entry.daily = daily.map((day) => ({
      date: day.date,
      kills: day.kills === null ? null : (counts.get(day.date) ?? 0),
    }));
  }
  return {
    ...activity,
    overview: {
      totalKills,
      activeDays,
      averagePerDay: activeDays ? totalKills / activeDays : null,
      currentStreak,
      longestStreak,
      uniqueNpcs: raw.uniqueNpcs,
    },
    weekly,
    comparison: {
      currentKills: raw.currentKills,
      previousKills: raw.previousKills,
      deltaKills: raw.currentKills - raw.previousKills,
      deltaPercent: percentChange(raw.currentKills, raw.previousKills),
      currentThrough: range.through,
      previousThrough: range.previousThrough,
      partial: true,
    },
    records: {
      bestDay: bestRecord(periodRecords(daily, "day")),
      bestWeek: bestRecord(weekly),
      bestMonth: bestRecord(periodRecords(daily, "month")),
    },
    hourlyWeekday: Array.from({ length: 168 }, (_, i) => ({
      weekday: Math.floor(i / 24) + 1,
      hour: i % 24,
      kills:
        raw.hourlyWeekday.find(
          (row) =>
            row.weekday === Math.floor(i / 24) + 1 && row.hour === i % 24,
        )?.kills ?? 0,
    })),
    types: raw.types.map((type) => ({
      ...type,
      share: totalKills ? (type.totalKills / totalKills) * 100 : 0,
    })),
    npcs: raw.npcs.map(mapNpc),
    npcGains: raw.npcGains.map(mapNpc),
    worlds: [...worlds.values()]
      .map((entry) => ({
        ...entry,
        deltaKills: entry.comparisonKills - entry.previousKills,
        deltaPercent: percentChange(entry.comparisonKills, entry.previousKills),
        share: totalKills ? (entry.totalKills / totalKills) * 100 : 0,
      }))
      .sort(
        (a, b) => b.totalKills - a.totalKills || a.world.localeCompare(b.world),
      ),
  };
};

export const makeUserKillAnalytics = (
  database: typeof ApiDatabase.Service,
  cache: KillQueryCache,
) => {
  const getUserKillAnalytics = Effect.fn("kills.user-analytics")(function* (
    userId: string,
    query: UserKillAnalyticsQuery,
  ) {
    const range = getKillAnalyticsRange(yield* DateTime.now, query.days ?? 30);
    const load = Effect.gen(function* () {
      const rows = yield* database.execute(
        userKillAnalyticsSql(userId, query.world, range, false),
      );
      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.Struct({
          rows: Schema.Array(Schema.Struct({ payload: RawAnalytics })),
        }),
      )(rows);
      const row = decoded.rows[0];
      if (!row)
        return yield* Effect.fail(
          new Error("Missing kill analytics aggregate"),
        );
      return buildKillAnalytics(row.payload, range, query.world);
    });
    return yield* cache.getOrSet(
      buildKillQueryCacheKey("user-analytics", userId, {
        days: query.days ?? 30,
        world: query.world,
        through: range.through,
        version: 2,
      }),
      UserKillAnalyticsResponse,
      load,
      30,
    );
  });
  const getUserKillActivity = Effect.fn("kills.user-activity")(function* (
    userId: string,
    query: UserKillActivityQuery,
  ) {
    const range = getKillAnalyticsRange(yield* DateTime.now, 112);
    const load = Effect.gen(function* () {
      const rows = yield* database.execute(
        userKillAnalyticsSql(userId, query.world, range, true),
      );
      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.Struct({
          rows: Schema.Array(Schema.Struct({ payload: RawBase })),
        }),
      )(rows);
      const row = decoded.rows[0];
      if (!row)
        return yield* Effect.fail(new Error("Missing kill activity aggregate"));
      return buildKillActivity(row.payload, range, query.world);
    });
    return yield* cache.getOrSet(
      buildKillQueryCacheKey("user-activity", userId, {
        days: range.days,
        world: query.world,
        through: range.through,
        version: 2,
      }),
      UserKillActivityResponse,
      load,
      30,
    );
  });
  return { getUserKillAnalytics, getUserKillActivity };
};
