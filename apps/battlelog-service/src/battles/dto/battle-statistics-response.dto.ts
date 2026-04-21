import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

const BattleAnalyticsResponseSchema = z.object({
  totalBattles: z.number(),
  wins: z.number(),
  losses: z.number(),
  winRatio: z.number(),
  totalPH: z.number(),
});

const ProfessionWinRateResponseSchema = z.object({
  prof: z.string(),
  wins: z.number(),
  losses: z.number(),
  totalBattles: z.number(),
  winRate: z.number(),
});

const HeadToHeadRecordResponseSchema = z.object({
  opponentId: z.string(),
  opponentName: z.string(),
  opponentIcon: z.string(),
  opponentProf: z.string(),
  opponentLvl: z.number(),
  wins: z.number(),
  losses: z.number(),
  totalBattles: z.number(),
  winRate: z.number(),
  lastBattleDate: z.string().datetime(),
  totalRatingDelta: z.number().optional(),
  avgRatingDelta: z.number().optional(),
});

const HeadToHeadPaginatedResponseSchema = z.object({
  records: z.array(HeadToHeadRecordResponseSchema),
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
      countTime: z.number().optional(),
      totalItems: z.number().optional(),
      estimatedTotal: z.boolean().optional(),
    }),
  }),
});

const StreakResponseSchema = z.object({
  current: z.object({
    type: z.enum(["wins", "losses", "none"]),
    count: z.number(),
  }),
  longest: z.object({
    wins: z.number(),
    losses: z.number(),
  }),
});

const BattleDurationStatsResponseSchema = z.object({
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
});

const PhGrowthDataPointResponseSchema = z.object({
  date: z.string().datetime(),
  ph: z.number(),
  cumulativePh: z.number(),
  battleId: z.string(),
});

const RatingGrowthDataPointResponseSchema = z.object({
  date: z.string().datetime(),
  ratingDelta: z.number(),
  rating: z.number(),
  battleId: z.string(),
});

const RatingDeltaByOpponentResponseSchema = z.object({
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
  lastBattleDate: z.string().datetime(),
});

const PlayerVsPlayerBattleResponseSchema = z.object({
  battleId: z.string(),
  createdAt: z.string().datetime(),
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
});

const PlayerVsPlayerPaginatedResponseSchema = z.object({
  battles: z.array(PlayerVsPlayerBattleResponseSchema),
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
});

export type BattleAnalyticsDto = z.output<typeof BattleAnalyticsResponseSchema>;
export type ProfessionWinRateDto = z.output<
  typeof ProfessionWinRateResponseSchema
>;
export type HeadToHeadRecordDto = z.output<
  typeof HeadToHeadRecordResponseSchema
>;
export type HeadToHeadPaginatedResponse = z.output<
  typeof HeadToHeadPaginatedResponseSchema
>;
export type StreakDto = z.output<typeof StreakResponseSchema>;
export type BattleDurationStatsDto = z.output<
  typeof BattleDurationStatsResponseSchema
>;
export type PhGrowthDataPointDto = z.output<
  typeof PhGrowthDataPointResponseSchema
>;
export type RatingGrowthDataPointDto = z.output<
  typeof RatingGrowthDataPointResponseSchema
>;
export type RatingDeltaByOpponentDto = z.output<
  typeof RatingDeltaByOpponentResponseSchema
>;
export type PlayerVsPlayerBattleDto = z.output<
  typeof PlayerVsPlayerBattleResponseSchema
>;
export type PlayerVsPlayerPaginatedResponse = z.output<
  typeof PlayerVsPlayerPaginatedResponseSchema
>;

const BattleAnalyticsResponseDtoBase: ZodDto<
  typeof BattleAnalyticsResponseSchema,
  false
> = createZodDto(BattleAnalyticsResponseSchema);

export class BattleAnalyticsResponseDto extends BattleAnalyticsResponseDtoBase {}

const ProfessionWinRateResponseDtoBase: ZodDto<
  typeof ProfessionWinRateResponseSchema,
  false
> = createZodDto(ProfessionWinRateResponseSchema);

export class ProfessionWinRateResponseDto extends ProfessionWinRateResponseDtoBase {}

const HeadToHeadPaginatedResponseDtoBase: ZodDto<
  typeof HeadToHeadPaginatedResponseSchema,
  false
> = createZodDto(HeadToHeadPaginatedResponseSchema);

export class HeadToHeadPaginatedResponseDto extends HeadToHeadPaginatedResponseDtoBase {}

const StreakResponseDtoBase: ZodDto<typeof StreakResponseSchema, false> =
  createZodDto(StreakResponseSchema);

export class StreakResponseDto extends StreakResponseDtoBase {}

const BattleDurationStatsResponseDtoBase: ZodDto<
  typeof BattleDurationStatsResponseSchema,
  false
> = createZodDto(BattleDurationStatsResponseSchema);

export class BattleDurationStatsResponseDto extends BattleDurationStatsResponseDtoBase {}

const PhGrowthDataPointResponseDtoBase: ZodDto<
  typeof PhGrowthDataPointResponseSchema,
  false
> = createZodDto(PhGrowthDataPointResponseSchema);

export class PhGrowthDataPointResponseDto extends PhGrowthDataPointResponseDtoBase {}

const RatingGrowthDataPointResponseDtoBase: ZodDto<
  typeof RatingGrowthDataPointResponseSchema,
  false
> = createZodDto(RatingGrowthDataPointResponseSchema);

export class RatingGrowthDataPointResponseDto extends RatingGrowthDataPointResponseDtoBase {}

const RatingDeltaByOpponentResponseDtoBase: ZodDto<
  typeof RatingDeltaByOpponentResponseSchema,
  false
> = createZodDto(RatingDeltaByOpponentResponseSchema);

export class RatingDeltaByOpponentResponseDto extends RatingDeltaByOpponentResponseDtoBase {}

const PlayerVsPlayerPaginatedResponseDtoBase: ZodDto<
  typeof PlayerVsPlayerPaginatedResponseSchema,
  false
> = createZodDto(PlayerVsPlayerPaginatedResponseSchema);

export class PlayerVsPlayerPaginatedResponseDto extends PlayerVsPlayerPaginatedResponseDtoBase {}
