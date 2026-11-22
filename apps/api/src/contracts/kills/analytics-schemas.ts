import { MARGONEM_TIME_ZONE } from "@lootlog/datetime";
import { FiniteNumber, WorldParam } from "@lootlog/schema/http-scalars";
import { Schema } from "effect";
import { NpcType } from "./schemas.js";

const Count = FiniteNumber.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
);

const NullableNumber = Schema.NullOr(FiniteNumber);

const NullableString = Schema.NullOr(Schema.String);

export const CharacterIdQuery = Schema.optionalKey(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
);

export const characterNeedsWorld = Schema.makeFilter(
  ({ world, characterId }: { world?: string; characterId?: string }) =>
    characterId === undefined || world !== undefined,
  { expected: "a world alongside characterId" },
);

export const UserStatsDays = Schema.Literals([7, 30, 90, 365]);

export const UserKillAnalyticsQuery = Schema.Struct({
  days: Schema.optionalKey(UserStatsDays),
  world: Schema.optionalKey(WorldParam),
  npcType: Schema.optionalKey(NpcType),
  characterId: CharacterIdQuery,
}).check(characterNeedsWorld);

export type UserKillAnalyticsQuery = typeof UserKillAnalyticsQuery.Type;

export const UserKillActivityQuery = Schema.Struct({
  world: Schema.optionalKey(WorldParam),
  characterId: CharacterIdQuery,
}).check(characterNeedsWorld);

export type UserKillActivityQuery = typeof UserKillActivityQuery.Type;

const KillAnalyticsMeta = Schema.Struct({
  timezone: Schema.Literal(MARGONEM_TIME_ZONE),
  generatedAt: Schema.String,
  days: Count,
  world: NullableString,
  characterId: NullableString,
  trackedSince: NullableString,
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
  worlds: Schema.Array(Schema.String),
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

export const UserKillCharactersResponse = Schema.Struct({
  characters: Schema.Array(
    Schema.Struct({
      characterId: Schema.String,
      world: Schema.String,
      name: NullableString,
      level: NullableNumber,
      profession: NullableString,
      icon: NullableString,
      kills: Count,
      firstKilledAt: Schema.String,
      lastKilledAt: Schema.String,
    }),
  ),
}).annotate({ identifier: "UserKillCharactersResponseDto_Output" });

export type UserKillCharactersResponse = typeof UserKillCharactersResponse.Type;
