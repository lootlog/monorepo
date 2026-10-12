import { Effect, Schema } from "effect";
import {
  booleanFromString,
  intFromString,
} from "#src/infrastructure/query-schema";
import { QueryBattleAnalyticsSchema } from "#src/battles/analytics/query-battle-analytics";

export const QueryBattleStatisticsSchema = Schema.Struct({
  ...QueryBattleAnalyticsSchema.fields,
  period: Schema.optional(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  cursor: Schema.optional(Schema.String),
  size: intFromString({ min: 1 }).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(20)),
  ),
  sortBy: Schema.Literals([
    "wins",
    "losses",
    "totalBattles",
    "winRate",
    "lastBattleDate",
    "totalRatingDelta",
    "avgRatingDelta",
  ]).pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed("totalBattles"))),
  sortOrder: Schema.Literals(["asc", "desc"]).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed("desc")),
  ),
  includeTotal: booleanFromString.pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(false)),
  ),
  search: Schema.optional(Schema.String),
  minBattles: Schema.optional(intFromString({ min: 1 })),
});

export type BattleStatisticsQuery = typeof QueryBattleStatisticsSchema.Type;

export const QueryPlayerVsPlayerSchema = Schema.Struct({
  ...QueryBattleStatisticsSchema.fields,
  opponentId: Schema.String,
  excludeBattleId: Schema.optional(Schema.String),
});

export type PlayerVsPlayerQuery = typeof QueryPlayerVsPlayerSchema.Type;

export const QueryAbyssSeasonsSchema = Schema.Struct({
  characterId: Schema.String,
  world: Schema.optional(Schema.String),
});

export type AbyssSeasonsQuery = typeof QueryAbyssSeasonsSchema.Type;
