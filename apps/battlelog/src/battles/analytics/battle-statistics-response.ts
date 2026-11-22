import { CursorPaginationSchema } from "./pagination.js";
import {
  DateTimeString,
  type DeepMutable,
} from "#src/battles/battle-response-types";
import { Schema } from "effect";

const BattleAnalyticsResponseSchema = Schema.Struct({
  totalBattles: Schema.Finite,
  wins: Schema.Finite,
  losses: Schema.Finite,
  winRatio: Schema.Finite,
  totalPH: Schema.Finite,
});

const ProfessionWinRateResponseSchema = Schema.Struct({
  prof: Schema.String,
  wins: Schema.Finite,
  losses: Schema.Finite,
  totalBattles: Schema.Finite,
  winRate: Schema.Finite,
});

const PlayerVsPlayerWarriorResponseSchema = Schema.Struct({
  name: Schema.String,
  lvl: Schema.Finite,
  prof: Schema.String,
  icon: Schema.String,
  fireDamage: Schema.Finite,
  frostDamage: Schema.Finite,
  lightningDamage: Schema.Finite,
  poisonDamageTaken: Schema.Finite,
  woundDamageTaken: Schema.Finite,
  critWoundDamageTaken: Schema.Finite,
});

const HeadToHeadRecordResponseSchema = Schema.Struct({
  opponentId: Schema.String,
  opponentName: Schema.String,
  opponentIcon: Schema.String,
  opponentProf: Schema.String,
  opponentLvl: Schema.Finite,
  lastBattleResult: Schema.Literals(["won", "lost", "flee"]),
  lastBattleUserWarrior: PlayerVsPlayerWarriorResponseSchema,
  lastBattleOpponentWarrior: PlayerVsPlayerWarriorResponseSchema,
  wins: Schema.Finite,
  losses: Schema.Finite,
  totalBattles: Schema.Finite,
  winRate: Schema.Finite,
  lastBattleDate: DateTimeString,
  totalRatingDelta: Schema.optionalKey(Schema.Finite),
  avgRatingDelta: Schema.optionalKey(Schema.Finite),
});

const HeadToHeadPaginatedResponseSchema = Schema.Struct({
  records: Schema.Array(HeadToHeadRecordResponseSchema),
  pagination: CursorPaginationSchema,
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Finite,
      countTime: Schema.optionalKey(Schema.Finite),
      totalItems: Schema.optionalKey(Schema.Finite),
      estimatedTotal: Schema.optionalKey(Schema.Boolean),
    }),
  }),
});

const StreakResponseSchema = Schema.Struct({
  current: Schema.Struct({
    type: Schema.Literals(["wins", "losses", "none"]),
    count: Schema.Finite,
  }),
  longest: Schema.Struct({
    wins: Schema.Finite,
    losses: Schema.Finite,
  }),
});

const BattleDurationStatsResponseSchema = Schema.Struct({
  avgWinDuration: Schema.Finite,
  avgLossDuration: Schema.Finite,
  fastest: Schema.NullOr(
    Schema.Struct({
      duration: Schema.Finite,
      battleId: Schema.String,
    }),
  ),
  longest: Schema.NullOr(
    Schema.Struct({
      duration: Schema.Finite,
      battleId: Schema.String,
    }),
  ),
});

const PhGrowthDataPointResponseSchema = Schema.Struct({
  date: DateTimeString,
  ph: Schema.Finite,
  cumulativePh: Schema.Finite,
  battleId: Schema.String,
});

const RatingGrowthDataPointResponseSchema = Schema.Struct({
  date: DateTimeString,
  ratingDelta: Schema.Finite,
  rating: Schema.Finite,
  battleId: Schema.String,
});

const RatingDeltaByOpponentResponseSchema = Schema.Struct({
  opponentId: Schema.String,
  opponentName: Schema.String,
  opponentIcon: Schema.String,
  opponentProf: Schema.String,
  opponentLvl: Schema.Finite,
  totalRatingDelta: Schema.Finite,
  wins: Schema.Finite,
  losses: Schema.Finite,
  totalBattles: Schema.Finite,
  avgRatingDelta: Schema.Finite,
  lastBattleDate: DateTimeString,
});

const AbyssSeasonResponseSchema = Schema.Struct({
  id: Schema.String,
  startedAt: DateTimeString,
  endedAt: DateTimeString,
  totalBattles: Schema.Finite,
  wins: Schema.Finite,
  losses: Schema.Finite,
  winRate: Schema.Finite,
  totalRatingDelta: Schema.Finite,
  peakRating: Schema.NullOr(Schema.Finite),
  totalPointsGained: Schema.NullOr(Schema.Finite),
});

const PlayerVsPlayerBattleResponseSchema = Schema.Struct({
  battleId: Schema.String,
  createdAt: DateTimeString,
  duration: Schema.Finite,
  winner: Schema.String,
  loser: Schema.String,
  hasFlee: Schema.Boolean,
  matchmaking: Schema.Boolean,
  ratingDelta: Schema.NullOr(Schema.Finite),
  userRating: Schema.NullOr(Schema.Finite),
  opponentRating: Schema.NullOr(Schema.Finite),
  userWarrior: PlayerVsPlayerWarriorResponseSchema,
  opponentWarrior: PlayerVsPlayerWarriorResponseSchema,
});

const PlayerVsPlayerPaginatedResponseSchema = Schema.Struct({
  battles: Schema.Array(PlayerVsPlayerBattleResponseSchema),
  pagination: CursorPaginationSchema,
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Finite,
      totalItems: Schema.optionalKey(Schema.Finite),
    }),
  }),
});

const CombatProfileSummaryResponseSchema = Schema.Struct({
  totalBattles: Schema.Finite,
  wins: Schema.Finite,
  losses: Schema.Finite,
  winRate: Schema.Finite,
  totalPH: Schema.Finite,
  totalRatingDelta: Schema.Finite,
  avgTurns: Schema.Finite,
  avgDuration: Schema.Finite,
  damagePerTurn: Schema.Finite,
  mitigationRate: Schema.Finite,
  controlRate: Schema.Finite,
});

const CombatProfileBreakdownResponseSchema = Schema.Struct({
  key: Schema.String,
  label: Schema.String,
  value: Schema.Finite,
  share: Schema.Finite,
});

const CombatProfileSpellUsageResponseSchema = Schema.Struct({
  spell: Schema.String,
  skillId: Schema.NullOr(Schema.Finite),
  casts: Schema.Finite,
  share: Schema.Finite,
});

const CombatProfileMatchupResponseSchema = Schema.Struct({
  prof: Schema.String,
  wins: Schema.Finite,
  losses: Schema.Finite,
  totalBattles: Schema.Finite,
  winRate: Schema.Finite,
});

const CombatProfileTrendPointResponseSchema = Schema.Struct({
  date: DateTimeString,
  value: Schema.Finite,
  cumulativeValue: Schema.Finite,
  battleId: Schema.String,
});

const CombatProfileHighlightResponseSchema = Schema.Struct({
  battleId: Schema.String,
  createdAt: DateTimeString,
  type: Schema.String,
  label: Schema.String,
  value: Schema.Finite,
});

const CombatProfileResponseSchema = Schema.Struct({
  summary: CombatProfileSummaryResponseSchema,
  damageMix: Schema.Array(CombatProfileBreakdownResponseSchema),
  mitigationMix: Schema.Array(CombatProfileBreakdownResponseSchema),
  spellUsage: Schema.Array(CombatProfileSpellUsageResponseSchema),
  matchupByProfession: Schema.Array(CombatProfileMatchupResponseSchema),
  phTrend: Schema.Array(CombatProfileTrendPointResponseSchema),
  ratingTrend: Schema.Array(CombatProfileTrendPointResponseSchema),
  highlights: Schema.Array(CombatProfileHighlightResponseSchema),
});

export type HeadToHeadRecord = DeepMutable<
  typeof HeadToHeadRecordResponseSchema.Type
>;

export type HeadToHeadPaginatedResponse = DeepMutable<
  typeof HeadToHeadPaginatedResponseSchema.Type
>;

export type BattleStreak = DeepMutable<typeof StreakResponseSchema.Type>;

export type BattleDurationStats = DeepMutable<
  typeof BattleDurationStatsResponseSchema.Type
>;

export type AbyssSeason = DeepMutable<typeof AbyssSeasonResponseSchema.Type>;

export type PlayerVsPlayerPaginatedResponse = DeepMutable<
  typeof PlayerVsPlayerPaginatedResponseSchema.Type
>;

export type CombatProfile = DeepMutable<
  typeof CombatProfileResponseSchema.Type
>;

export const BattleStatisticsResponseSchemas = {
  abyssSeason: AbyssSeasonResponseSchema,
  analytics: BattleAnalyticsResponseSchema,
  combatProfile: CombatProfileResponseSchema,
  duration: BattleDurationStatsResponseSchema,
  headToHead: HeadToHeadPaginatedResponseSchema,
  phGrowth: PhGrowthDataPointResponseSchema,
  playerVsPlayer: PlayerVsPlayerPaginatedResponseSchema,
  professionWinRate: ProfessionWinRateResponseSchema,
  ratingDeltaByOpponent: RatingDeltaByOpponentResponseSchema,
  ratingGrowth: RatingGrowthDataPointResponseSchema,
  streak: StreakResponseSchema,
} as const;
