import { Effect, Schema } from "effect";
import {
  booleanFromString,
  dateTimeString,
  intFromString,
} from "#src/platform/query-schema";

export const QueryBattleStatisticsSchema = Schema.Struct({
  characterId: Schema.optional(Schema.String),
  world: Schema.optional(Schema.String),
  period: Schema.optional(
    Schema.Literals(["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"]),
  ),
  minLevel: Schema.optional(intFromString({ min: 1 })),
  maxLevel: Schema.optional(intFromString({ min: 1 })),
  startDate: Schema.optional(dateTimeString),
  endDate: Schema.optional(dateTimeString),
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
  ph: Schema.optional(booleanFromString),
  matchmaking: Schema.optional(booleanFromString),
});

export type QueryBattleStatisticsDto = typeof QueryBattleStatisticsSchema.Type;

export const QueryPlayerVsPlayerSchema = Schema.Struct({
  ...QueryBattleStatisticsSchema.fields,
  opponentId: Schema.String,
  excludeBattleId: Schema.optional(Schema.String),
});

export type QueryPlayerVsPlayerDto = typeof QueryPlayerVsPlayerSchema.Type;

export const QueryAbyssSeasonsSchema = Schema.Struct({
  characterId: Schema.String,
  world: Schema.optional(Schema.String),
});

export type QueryAbyssSeasonsDto = typeof QueryAbyssSeasonsSchema.Type;
