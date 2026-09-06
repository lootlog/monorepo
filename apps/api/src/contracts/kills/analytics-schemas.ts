import { FiniteNumber } from "@lootlog/schema/http-scalars";
import { Schema } from "effect";

const Count = FiniteNumber.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);
const NullableNumber = Schema.NullOr(FiniteNumber);
const NullableString = Schema.NullOr(Schema.String);

export const UserKillAnalyticsQuery = Schema.Struct({
  days: Schema.optionalKey(Schema.Literals([7, 30, 90, 365])),
  world: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  ),
});
export type UserKillAnalyticsQuery = typeof UserKillAnalyticsQuery.Type;
export const UserKillActivityQuery = Schema.Struct({
  world: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  ),
});
export type UserKillActivityQuery = typeof UserKillActivityQuery.Type;

export const KillAnalyticsMeta = Schema.Struct({
  timezone: Schema.Literal("Europe/Warsaw"),
  generatedAt: Schema.String,
  days: Count,
  world: NullableString,
  startDate: Schema.String,
  endDate: Schema.String,
  firstBucketAt: NullableString,
  coverage: Schema.Literals(["complete", "partial", "unavailable"]),
  allTimeKills: Count,
  timedKills: Count,
  untimedKills: Count,
  includesCurrentHour: Schema.Literal(true),
});
const DailyActivity = Schema.Struct({
  date: Schema.String,
  kills: NullableNumber,
  partial: Schema.Boolean,
});
const PeriodRecord = Schema.Struct({
  startDate: Schema.String,
  endDate: Schema.String,
  kills: Count,
  partial: Schema.Boolean,
});
const NpcAnalytics = Schema.Struct({
  world: Schema.String,
  npcId: FiniteNumber,
  npcName: Schema.String,
  npcType: Schema.String,
  npcLvl: FiniteNumber,
  npcProf: NullableString,
  npcIcon: NullableString,
  totalKills: Count,
  previousKills: Count,
  comparisonKills: Count,
  deltaKills: FiniteNumber,
  deltaPercent: NullableNumber,
  share: FiniteNumber,
  bestDay: Schema.NullOr(
    Schema.Struct({ date: Schema.String, kills: NullableNumber }),
  ),
});
export const UserKillActivityResponse = Schema.Struct({
  meta: KillAnalyticsMeta,
  daily: Schema.Array(DailyActivity),
}).annotate({ identifier: "UserKillActivityResponseDto_Output" });
export type UserKillActivityResponse = typeof UserKillActivityResponse.Type;

export const UserKillAnalyticsResponse = Schema.Struct({
  meta: KillAnalyticsMeta,
  overview: Schema.Struct({
    totalKills: Count,
    activeDays: Count,
    averagePerDay: NullableNumber,
    currentStreak: Count,
    longestStreak: Count,
    uniqueNpcs: Count,
  }),
  daily: Schema.Array(DailyActivity),
  weekly: Schema.Array(PeriodRecord),
  comparison: Schema.Struct({
    currentKills: Count,
    previousKills: Count,
    deltaKills: FiniteNumber,
    deltaPercent: NullableNumber,
    currentThrough: Schema.String,
    previousThrough: Schema.String,
    partial: Schema.Boolean,
  }),
  records: Schema.Struct({
    bestDay: Schema.NullOr(PeriodRecord),
    bestWeek: Schema.NullOr(PeriodRecord),
    bestMonth: Schema.NullOr(PeriodRecord),
  }),
  hourlyWeekday: Schema.Array(
    Schema.Struct({ weekday: Count, hour: Count, kills: Count }),
  ),
  types: Schema.Array(
    Schema.Struct({
      npcType: Schema.String,
      totalKills: Count,
      uniqueNpcs: Count,
      share: FiniteNumber,
    }),
  ),
  npcs: Schema.Array(NpcAnalytics),
  npcGains: Schema.Array(NpcAnalytics),
  worlds: Schema.Array(
    Schema.Struct({
      world: Schema.String,
      totalKills: Count,
      comparisonKills: Count,
      previousKills: Count,
      deltaKills: FiniteNumber,
      deltaPercent: NullableNumber,
      share: FiniteNumber,
      daily: Schema.Array(
        Schema.Struct({ date: Schema.String, kills: NullableNumber }),
      ),
    }),
  ),
}).annotate({ identifier: "UserKillAnalyticsResponseDto_Output" });
export type UserKillAnalyticsResponse = typeof UserKillAnalyticsResponse.Type;
