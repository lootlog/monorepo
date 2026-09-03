import { Schema } from "effect";
import {
  booleanFromString,
  dateTimeString,
  intFromString,
} from "#src/infrastructure/query-schema";

export const QueryBattleAnalyticsSchema = Schema.Struct({
  characterId: Schema.optional(Schema.String),
  world: Schema.optional(Schema.String),
  period: Schema.optional(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d"]),
  ),
  minLevel: Schema.optional(intFromString({ min: 1 })),
  maxLevel: Schema.optional(intFromString({ min: 1 })),
  startDate: Schema.optional(dateTimeString),
  endDate: Schema.optional(dateTimeString),
  ph: Schema.optional(booleanFromString),
  matchmaking: Schema.optional(booleanFromString),
});

export type BattleAnalyticsCriteria = typeof QueryBattleAnalyticsSchema.Type;
