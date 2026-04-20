import { z } from "@hono/zod-openapi";

export const professionWinRateSchema = z
  .object({
    prof: z.string(),
    wins: z.number(),
    losses: z.number(),
    totalBattles: z.number(),
    winRate: z.number(),
  })
  .openapi("ProfessionWinRate");

export const headToHeadRecordSchema = z
  .object({
    opponentId: z.string(),
    opponentName: z.string(),
    opponentIcon: z.string(),
    opponentProf: z.string(),
    opponentLvl: z.number(),
    wins: z.number(),
    losses: z.number(),
    totalBattles: z.number(),
    winRate: z.number(),
    lastBattleDate: z.string(),
    totalRatingDelta: z.number().optional(),
    avgRatingDelta: z.number().optional(),
  })
  .openapi("HeadToHeadRecord");

export const streakSchema = z
  .object({
    current: z.object({
      type: z.enum(["wins", "losses", "none"]),
      count: z.number(),
    }),
    longest: z.object({
      wins: z.number(),
      losses: z.number(),
    }),
  })
  .openapi("Streak");

export const battleDurationStatsSchema = z
  .object({
    avgWinDuration: z.number(),
    avgLossDuration: z.number(),
    fastest: z
      .object({
        duration: z.number(),
        battleId: z.string(),
      })
      .nullable(),
    longest: z
      .object({
        duration: z.number(),
        battleId: z.string(),
      })
      .nullable(),
  })
  .openapi("BattleDurationStats");

export const phGrowthDataPointSchema = z
  .object({
    date: z.string(),
    ph: z.number(),
    cumulativePh: z.number(),
    battleId: z.string(),
  })
  .openapi("PhGrowthDataPoint");

export const paginationPerformanceSchema = z.object({
  queryTime: z.number(),
  countTime: z.number().optional(),
  totalItems: z.number().optional(),
  estimatedTotal: z.boolean().optional(),
});

export const headToHeadPaginatedResponseSchema = z
  .object({
    records: z.array(headToHeadRecordSchema),
    pagination: z.object({
      size: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
      nextCursor: z.string().optional(),
      previousCursor: z.string().optional(),
      total: z.number().optional(),
    }),
    meta: z.object({
      performance: paginationPerformanceSchema,
    }),
  })
  .openapi("HeadToHeadPaginatedResponse");

export const ratingGrowthDataPointSchema = z
  .object({
    date: z.string(),
    ratingDelta: z.number(),
    rating: z.number(),
    battleId: z.string(),
  })
  .openapi("RatingGrowthDataPoint");

export const ratingDeltaByOpponentSchema = z
  .object({
    opponentId: z.string(),
    opponentName: z.string(),
    opponentIcon: z.string(),
    opponentProf: z.string(),
    opponentLvl: z.number(),
    totalRatingDelta: z.number(),
    wins: z.number(),
    losses: z.number(),
    totalBattles: z.number(),
    avgRatingDelta: z.number(),
    lastBattleDate: z.string(),
  })
  .openapi("RatingDeltaByOpponent");

export const playerVsPlayerBattleSchema = z
  .object({
    battleId: z.string(),
    createdAt: z.string(),
    duration: z.number(),
    winner: z.string(),
    loser: z.string(),
    ratingDelta: z.number(),
    userRating: z.number(),
    opponentRating: z.number(),
    userWarrior: z.object({
      name: z.string(),
      lvl: z.number(),
      prof: z.string(),
      icon: z.string(),
    }),
    opponentWarrior: z.object({
      name: z.string(),
      lvl: z.number(),
      prof: z.string(),
      icon: z.string(),
    }),
  })
  .openapi("PlayerVsPlayerBattle");

export const playerVsPlayerPaginatedResponseSchema = z
  .object({
    battles: z.array(playerVsPlayerBattleSchema),
    pagination: z.object({
      size: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
      nextCursor: z.string().optional(),
      previousCursor: z.string().optional(),
      total: z.number().optional(),
    }),
    meta: z.object({
      performance: z.object({
        queryTime: z.number(),
        totalItems: z.number().optional(),
      }),
    }),
  })
  .openapi("PlayerVsPlayerPaginatedResponse");

export type ProfessionWinRate = z.infer<typeof professionWinRateSchema>;
export type HeadToHeadRecord = z.infer<typeof headToHeadRecordSchema>;
export type Streak = z.infer<typeof streakSchema>;
export type BattleDurationStats = z.infer<typeof battleDurationStatsSchema>;
export type PhGrowthDataPoint = z.infer<typeof phGrowthDataPointSchema>;
export type HeadToHeadPaginatedResponse = z.infer<
  typeof headToHeadPaginatedResponseSchema
>;
export type RatingGrowthDataPoint = z.infer<
  typeof ratingGrowthDataPointSchema
>;
export type RatingDeltaByOpponent = z.infer<
  typeof ratingDeltaByOpponentSchema
>;
export type PlayerVsPlayerBattle = z.infer<
  typeof playerVsPlayerBattleSchema
>;
export type PlayerVsPlayerPaginatedResponse = z.infer<
  typeof playerVsPlayerPaginatedResponseSchema
>;
