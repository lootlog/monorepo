import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import {
  booleanFromString,
  intFromString,
} from "@lootlog/nest-shared/validators";

const QueryBattleStatisticsSchema = z.object({
  characterId: z.string().optional(),
  world: z.string().optional(),
  period: z
    .enum(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"])
    .optional(),
  minLevel: intFromString({ min: 1 }).optional(),
  maxLevel: intFromString({ min: 1 }).optional(),
  cursor: z.string().optional(),
  size: intFromString({ min: 1 }).default(20),
  sortBy: z
    .enum([
      "wins",
      "losses",
      "totalBattles",
      "winRate",
      "lastBattleDate",
      "totalRatingDelta",
      "avgRatingDelta",
    ])
    .default("totalBattles"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeTotal: booleanFromString.default(false),
  search: z.string().optional(),
  minBattles: intFromString({ min: 1 }).optional(),
  ph: booleanFromString.optional(),
  matchmaking: booleanFromString.optional(),
});

export class QueryBattleStatisticsDto extends createZodDto(
  QueryBattleStatisticsSchema,
) {}

const QueryPlayerVsPlayerSchema = QueryBattleStatisticsSchema.extend({
  opponentId: z.string(),
  excludeBattleId: z.string().optional(),
});

export class QueryPlayerVsPlayerDto extends createZodDto(
  QueryPlayerVsPlayerSchema,
) {}
