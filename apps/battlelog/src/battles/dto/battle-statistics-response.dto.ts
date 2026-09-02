import { DateTime, Option, Schema } from "effect";

const DateTimeString = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u),
  Schema.makeFilter((value) => Option.isSome(DateTime.make(value)), {
    expected: "a valid UTC date-time string",
  }),
);

type DeepMutable<T> =
  T extends ReadonlyArray<infer Item>
    ? Array<DeepMutable<Item>>
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;

const BattleAnalyticsResponseSchema = Schema.Struct({
  totalBattles: Schema.Number,
  wins: Schema.Number,
  losses: Schema.Number,
  winRatio: Schema.Number,
  totalPH: Schema.Number,
});

const ProfessionWinRateResponseSchema = Schema.Struct({
  prof: Schema.String,
  wins: Schema.Number,
  losses: Schema.Number,
  totalBattles: Schema.Number,
  winRate: Schema.Number,
});

const PlayerVsPlayerWarriorResponseSchema = Schema.Struct({
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  fireDamage: Schema.Number,
  frostDamage: Schema.Number,
  lightningDamage: Schema.Number,
  poisonDamageTaken: Schema.Number,
  woundDamageTaken: Schema.Number,
  critWoundDamageTaken: Schema.Number,
});

const HeadToHeadRecordResponseSchema = Schema.Struct({
  opponentId: Schema.String,
  opponentName: Schema.String,
  opponentIcon: Schema.String,
  opponentProf: Schema.String,
  opponentLvl: Schema.Number,
  lastBattleResult: Schema.Literals(["won", "lost", "flee"]),
  lastBattleUserWarrior: PlayerVsPlayerWarriorResponseSchema,
  lastBattleOpponentWarrior: PlayerVsPlayerWarriorResponseSchema,
  wins: Schema.Number,
  losses: Schema.Number,
  totalBattles: Schema.Number,
  winRate: Schema.Number,
  lastBattleDate: DateTimeString,
  totalRatingDelta: Schema.optional(Schema.Number),
  avgRatingDelta: Schema.optional(Schema.Number),
});

const HeadToHeadPaginatedResponseSchema = Schema.Struct({
  records: Schema.Array(HeadToHeadRecordResponseSchema),
  pagination: Schema.Struct({
    size: Schema.Number,
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optional(Schema.String),
    previousCursor: Schema.optional(Schema.String),
    total: Schema.optional(Schema.Number),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Number,
      countTime: Schema.optional(Schema.Number),
      totalItems: Schema.optional(Schema.Number),
      estimatedTotal: Schema.optional(Schema.Boolean),
    }),
  }),
});

const StreakResponseSchema = Schema.Struct({
  current: Schema.Struct({
    type: Schema.Literals(["wins", "losses", "none"]),
    count: Schema.Number,
  }),
  longest: Schema.Struct({
    wins: Schema.Number,
    losses: Schema.Number,
  }),
});

const BattleDurationStatsResponseSchema = Schema.Struct({
  avgWinDuration: Schema.Number,
  avgLossDuration: Schema.Number,
  fastest: Schema.NullOr(
    Schema.Struct({
      duration: Schema.Number,
      battleId: Schema.String,
    }),
  ),
  longest: Schema.NullOr(
    Schema.Struct({
      duration: Schema.Number,
      battleId: Schema.String,
    }),
  ),
});

const PhGrowthDataPointResponseSchema = Schema.Struct({
  date: DateTimeString,
  ph: Schema.Number,
  cumulativePh: Schema.Number,
  battleId: Schema.String,
});

const RatingGrowthDataPointResponseSchema = Schema.Struct({
  date: DateTimeString,
  ratingDelta: Schema.Number,
  rating: Schema.Number,
  battleId: Schema.String,
});

const RatingDeltaByOpponentResponseSchema = Schema.Struct({
  opponentId: Schema.String,
  opponentName: Schema.String,
  opponentIcon: Schema.String,
  opponentProf: Schema.String,
  opponentLvl: Schema.Number,
  totalRatingDelta: Schema.Number,
  wins: Schema.Number,
  losses: Schema.Number,
  totalBattles: Schema.Number,
  avgRatingDelta: Schema.Number,
  lastBattleDate: DateTimeString,
});

const AbyssSeasonResponseSchema = Schema.Struct({
  id: Schema.String,
  startedAt: DateTimeString,
  endedAt: DateTimeString,
  totalBattles: Schema.Number,
  wins: Schema.Number,
  losses: Schema.Number,
  winRate: Schema.Number,
  totalRatingDelta: Schema.Number,
  peakRating: Schema.NullOr(Schema.Number),
  totalPointsGained: Schema.NullOr(Schema.Number),
});

const PlayerVsPlayerBattleResponseSchema = Schema.Struct({
  battleId: Schema.String,
  createdAt: DateTimeString,
  duration: Schema.Number,
  winner: Schema.String,
  loser: Schema.String,
  hasFlee: Schema.Boolean,
  matchmaking: Schema.Boolean,
  ratingDelta: Schema.NullOr(Schema.Number),
  userRating: Schema.NullOr(Schema.Number),
  opponentRating: Schema.NullOr(Schema.Number),
  userWarrior: PlayerVsPlayerWarriorResponseSchema,
  opponentWarrior: PlayerVsPlayerWarriorResponseSchema,
});

const PlayerVsPlayerPaginatedResponseSchema = Schema.Struct({
  battles: Schema.Array(PlayerVsPlayerBattleResponseSchema),
  pagination: Schema.Struct({
    size: Schema.Number,
    hasNext: Schema.Boolean,
    hasPrev: Schema.Boolean,
    nextCursor: Schema.optional(Schema.String),
    previousCursor: Schema.optional(Schema.String),
    total: Schema.optional(Schema.Number),
  }),
  meta: Schema.Struct({
    performance: Schema.Struct({
      queryTime: Schema.Number,
      totalItems: Schema.optional(Schema.Number),
    }),
  }),
});

const CombatProfileSummaryResponseSchema = Schema.Struct({
  totalBattles: Schema.Number,
  wins: Schema.Number,
  losses: Schema.Number,
  winRate: Schema.Number,
  totalPH: Schema.Number,
  totalRatingDelta: Schema.Number,
  avgTurns: Schema.Number,
  avgDuration: Schema.Number,
  damagePerTurn: Schema.Number,
  mitigationRate: Schema.Number,
  controlRate: Schema.Number,
});

const CombatProfileBreakdownResponseSchema = Schema.Struct({
  key: Schema.String,
  label: Schema.String,
  value: Schema.Number,
  share: Schema.Number,
});

const CombatProfileSpellUsageResponseSchema = Schema.Struct({
  spell: Schema.String,
  skillId: Schema.NullOr(Schema.Number),
  casts: Schema.Number,
  share: Schema.Number,
});

const CombatProfileMatchupResponseSchema = Schema.Struct({
  prof: Schema.String,
  wins: Schema.Number,
  losses: Schema.Number,
  totalBattles: Schema.Number,
  winRate: Schema.Number,
});

const CombatProfileTrendPointResponseSchema = Schema.Struct({
  date: DateTimeString,
  value: Schema.Number,
  cumulativeValue: Schema.Number,
  battleId: Schema.String,
});

const CombatProfileHighlightResponseSchema = Schema.Struct({
  battleId: Schema.String,
  createdAt: DateTimeString,
  type: Schema.String,
  label: Schema.String,
  value: Schema.Number,
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

export type BattleAnalyticsDto = DeepMutable<
  typeof BattleAnalyticsResponseSchema.Type
>;
export type ProfessionWinRateDto = DeepMutable<
  typeof ProfessionWinRateResponseSchema.Type
>;
export type HeadToHeadRecordDto = DeepMutable<
  typeof HeadToHeadRecordResponseSchema.Type
>;
export type HeadToHeadPaginatedResponse = DeepMutable<
  typeof HeadToHeadPaginatedResponseSchema.Type
>;
export type StreakDto = DeepMutable<typeof StreakResponseSchema.Type>;
export type BattleDurationStatsDto = DeepMutable<
  typeof BattleDurationStatsResponseSchema.Type
>;
export type PhGrowthDataPointDto = DeepMutable<
  typeof PhGrowthDataPointResponseSchema.Type
>;
export type RatingGrowthDataPointDto = DeepMutable<
  typeof RatingGrowthDataPointResponseSchema.Type
>;
export type RatingDeltaByOpponentDto = DeepMutable<
  typeof RatingDeltaByOpponentResponseSchema.Type
>;
export type AbyssSeasonDto = DeepMutable<typeof AbyssSeasonResponseSchema.Type>;
export type PlayerVsPlayerBattleDto = DeepMutable<
  typeof PlayerVsPlayerBattleResponseSchema.Type
>;
export type PlayerVsPlayerPaginatedResponse = DeepMutable<
  typeof PlayerVsPlayerPaginatedResponseSchema.Type
>;
export type CombatProfileDto = DeepMutable<
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
