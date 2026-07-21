import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import {
  booleanFromString,
  intFromString,
} from "@lootlog/nest-shared/validators/query-helpers";

const QueryBattleAnalyticsSchema = z.object({
  characterId: z.string().optional(),
  world: z.string().optional(),
  period: z.enum(["24h", "3d", "7d", "14d", "30d", "90d", "180d"]).optional(),
  minLevel: intFromString({ min: 1 }).optional(),
  maxLevel: intFromString({ min: 1 }).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ph: booleanFromString.optional(),
  matchmaking: booleanFromString.optional(),
});

export class QueryBattleAnalyticsDto extends createZodDto(
  QueryBattleAnalyticsSchema,
) {}
