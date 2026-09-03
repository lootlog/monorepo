/** analytics transport definitions for battles. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type BattleAnalyticsResponseDto_Output =
  typeof BattleAnalyticsResponseDto_Output.Type;

export const BattleAnalyticsResponseDto_Output = Schema.Struct({
  totalBattles: FiniteNumber,
  wins: FiniteNumber,
  losses: FiniteNumber,
  winRatio: FiniteNumber,
  totalPH: FiniteNumber,
}).annotate({ identifier: "BattleAnalyticsResponseDto_Output" });

export type AbyssSeasonResponseDto_Output =
  typeof AbyssSeasonResponseDto_Output.Type;

export const AbyssSeasonResponseDto_Output = Schema.Struct({
  id: Schema.String,
  startedAt: DateTimeString,
  endedAt: DateTimeString,
  totalBattles: FiniteNumber,
  wins: FiniteNumber,
  losses: FiniteNumber,
  winRate: FiniteNumber,
  totalRatingDelta: FiniteNumber,
  peakRating: Schema.Union([FiniteNumber, Schema.Null]),
  totalPointsGained: Schema.Union([FiniteNumber, Schema.Null]),
}).annotate({ identifier: "AbyssSeasonResponseDto_Output" });

export type CombatProfileResponseDto_Output =
  typeof CombatProfileResponseDto_Output.Type;

export const CombatProfileResponseDto_Output = Schema.Struct({
  summary: Schema.Struct({
    totalBattles: FiniteNumber,
    wins: FiniteNumber,
    losses: FiniteNumber,
    winRate: FiniteNumber,
    totalPH: FiniteNumber,
    totalRatingDelta: FiniteNumber,
    avgTurns: FiniteNumber,
    avgDuration: FiniteNumber,
    damagePerTurn: FiniteNumber,
    mitigationRate: FiniteNumber,
    controlRate: FiniteNumber,
  }),
  damageMix: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      label: Schema.String,
      value: FiniteNumber,
      share: FiniteNumber,
    }),
  ),
  mitigationMix: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      label: Schema.String,
      value: FiniteNumber,
      share: FiniteNumber,
    }),
  ),
  spellUsage: Schema.Array(
    Schema.Struct({
      spell: Schema.String,
      skillId: Schema.Union([FiniteNumber, Schema.Null]),
      casts: FiniteNumber,
      share: FiniteNumber,
    }),
  ),
  matchupByProfession: Schema.Array(
    Schema.Struct({
      prof: Schema.String,
      wins: FiniteNumber,
      losses: FiniteNumber,
      totalBattles: FiniteNumber,
      winRate: FiniteNumber,
    }),
  ),
  phTrend: Schema.Array(
    Schema.Struct({
      date: DateTimeString,
      value: FiniteNumber,
      cumulativeValue: FiniteNumber,
      battleId: Schema.String,
    }),
  ),
  ratingTrend: Schema.Array(
    Schema.Struct({
      date: DateTimeString,
      value: FiniteNumber,
      cumulativeValue: FiniteNumber,
      battleId: Schema.String,
    }),
  ),
  highlights: Schema.Array(
    Schema.Struct({
      battleId: Schema.String,
      createdAt: DateTimeString,
      type: Schema.String,
      label: Schema.String,
      value: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "CombatProfileResponseDto_Output" });

export type ProfessionWinRateResponseDto_Output =
  typeof ProfessionWinRateResponseDto_Output.Type;

export const ProfessionWinRateResponseDto_Output = Schema.Struct({
  prof: Schema.String,
  wins: FiniteNumber,
  losses: FiniteNumber,
  totalBattles: FiniteNumber,
  winRate: FiniteNumber,
}).annotate({ identifier: "ProfessionWinRateResponseDto_Output" });

export type HeadToHeadPaginatedResponseDto_Output =
  typeof HeadToHeadPaginatedResponseDto_Output.Type;

export const HeadToHeadPaginatedResponseDto_Output = Schema.Struct({
  records: Schema.Array(
    Schema.Struct({
      opponentId: Schema.String,
      opponentName: Schema.String,
      opponentIcon: Schema.String,
      opponentProf: Schema.String,
      opponentLvl: FiniteNumber,
      lastBattleResult: Schema.Literals(["won", "lost", "flee"]),
      lastBattleUserWarrior: Schema.Struct({
        name: Schema.String,
        lvl: FiniteNumber,
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: FiniteNumber,
        frostDamage: FiniteNumber,
        lightningDamage: FiniteNumber,
        poisonDamageTaken: FiniteNumber,
        woundDamageTaken: FiniteNumber,
        critWoundDamageTaken: FiniteNumber,
      }),
      lastBattleOpponentWarrior: Schema.Struct({
        name: Schema.String,
        lvl: FiniteNumber,
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: FiniteNumber,
        frostDamage: FiniteNumber,
        lightningDamage: FiniteNumber,
        poisonDamageTaken: FiniteNumber,
        woundDamageTaken: FiniteNumber,
        critWoundDamageTaken: FiniteNumber,
      }),
      wins: FiniteNumber,
      losses: FiniteNumber,
      totalBattles: FiniteNumber,
      winRate: FiniteNumber,
      lastBattleDate: DateTimeString,
      totalRatingDelta: Schema.optionalKey(FiniteNumber),
      avgRatingDelta: Schema.optionalKey(FiniteNumber),
    }),
  ),
  pagination: Schema.Struct({
    size: FiniteNumber,
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optionalKey(Schema.String),
    previousCursor: Schema.optionalKey(Schema.String),
    total: Schema.optionalKey(FiniteNumber),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: FiniteNumber,
      countTime: Schema.optionalKey(FiniteNumber),
      totalItems: Schema.optionalKey(FiniteNumber),
      estimatedTotal: Schema.optionalKey(Schema.Boolean),
    }),
  }),
}).annotate({ identifier: "HeadToHeadPaginatedResponseDto_Output" });

export type StreakResponseDto_Output = typeof StreakResponseDto_Output.Type;

export const StreakResponseDto_Output = Schema.Struct({
  current: Schema.Struct({
    type: Schema.Literals(["wins", "losses", "none"]),
    count: FiniteNumber,
  }),
  longest: Schema.Struct({
    wins: FiniteNumber,
    losses: FiniteNumber,
  }),
}).annotate({ identifier: "StreakResponseDto_Output" });

export type BattleDurationStatsResponseDto_Output =
  typeof BattleDurationStatsResponseDto_Output.Type;

export const BattleDurationStatsResponseDto_Output = Schema.Struct({
  avgWinDuration: FiniteNumber,
  avgLossDuration: FiniteNumber,
  fastest: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        duration: FiniteNumber,
        battleId: Schema.String,
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
  longest: Schema.Union([
    Schema.StructWithRest(
      Schema.Struct({
        duration: FiniteNumber,
        battleId: Schema.String,
      }),
      [
        Schema.Record(
          Schema.String,
          Schema.Json.annotate({ expected: "JSON value" }),
        ),
      ],
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "BattleDurationStatsResponseDto_Output" });

export type PhGrowthDataPointResponseDto_Output =
  typeof PhGrowthDataPointResponseDto_Output.Type;

export const PhGrowthDataPointResponseDto_Output = Schema.Struct({
  date: DateTimeString,
  ph: FiniteNumber,
  cumulativePh: FiniteNumber,
  battleId: Schema.String,
}).annotate({ identifier: "PhGrowthDataPointResponseDto_Output" });

export type RatingGrowthDataPointResponseDto_Output =
  typeof RatingGrowthDataPointResponseDto_Output.Type;

export const RatingGrowthDataPointResponseDto_Output = Schema.Struct({
  date: DateTimeString,
  ratingDelta: FiniteNumber,
  rating: FiniteNumber,
  battleId: Schema.String,
}).annotate({ identifier: "RatingGrowthDataPointResponseDto_Output" });

export type RatingDeltaByOpponentResponseDto_Output =
  typeof RatingDeltaByOpponentResponseDto_Output.Type;

export const RatingDeltaByOpponentResponseDto_Output = Schema.Struct({
  opponentId: Schema.String,
  opponentName: Schema.String,
  opponentIcon: Schema.String,
  opponentProf: Schema.String,
  opponentLvl: FiniteNumber,
  totalRatingDelta: FiniteNumber,
  wins: FiniteNumber,
  losses: FiniteNumber,
  totalBattles: FiniteNumber,
  avgRatingDelta: FiniteNumber,
  lastBattleDate: DateTimeString,
}).annotate({ identifier: "RatingDeltaByOpponentResponseDto_Output" });

export type PlayerVsPlayerPaginatedResponseDto_Output =
  typeof PlayerVsPlayerPaginatedResponseDto_Output.Type;

export const PlayerVsPlayerPaginatedResponseDto_Output = Schema.Struct({
  battles: Schema.Array(
    Schema.Struct({
      battleId: Schema.String,
      createdAt: DateTimeString,
      duration: FiniteNumber,
      winner: Schema.String,
      loser: Schema.String,
      hasFlee: Schema.Boolean,
      matchmaking: Schema.Boolean,
      ratingDelta: Schema.Union([FiniteNumber, Schema.Null]),
      userRating: Schema.Union([FiniteNumber, Schema.Null]),
      opponentRating: Schema.Union([FiniteNumber, Schema.Null]),
      userWarrior: Schema.Struct({
        name: Schema.String,
        lvl: FiniteNumber,
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: FiniteNumber,
        frostDamage: FiniteNumber,
        lightningDamage: FiniteNumber,
        poisonDamageTaken: FiniteNumber,
        woundDamageTaken: FiniteNumber,
        critWoundDamageTaken: FiniteNumber,
      }),
      opponentWarrior: Schema.Struct({
        name: Schema.String,
        lvl: FiniteNumber,
        prof: Schema.String,
        icon: Schema.String,
        fireDamage: FiniteNumber,
        frostDamage: FiniteNumber,
        lightningDamage: FiniteNumber,
        poisonDamageTaken: FiniteNumber,
        woundDamageTaken: FiniteNumber,
        critWoundDamageTaken: FiniteNumber,
      }),
    }),
  ),
  pagination: Schema.Struct({
    size: FiniteNumber,
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optionalKey(Schema.String),
    previousCursor: Schema.optionalKey(Schema.String),
    total: Schema.optionalKey(FiniteNumber),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: FiniteNumber,
      totalItems: Schema.optionalKey(FiniteNumber),
    }),
  }),
}).annotate({ identifier: "PlayerVsPlayerPaginatedResponseDto_Output" });

export type BattleWarriorsSearchResponseDto_Output =
  typeof BattleWarriorsSearchResponseDto_Output.Type;

export const BattleWarriorsSearchResponseDto_Output = Schema.Struct({
  warriors: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      icon: Schema.String,
      prof: Schema.String,
      lvl: FiniteNumber,
    }),
  ),
}).annotate({ identifier: "BattleWarriorsSearchResponseDto_Output" });

export type BattleUserWorldsResponseDto_Output =
  typeof BattleUserWorldsResponseDto_Output.Type;

export const BattleUserWorldsResponseDto_Output = Schema.Struct({
  worlds: Schema.Array(Schema.String),
}).annotate({ identifier: "BattleUserWorldsResponseDto_Output" });
