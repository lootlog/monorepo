import { Effect, Schema } from "effect";
import {
  booleanFromString,
  commaSeparatedArray,
  dateTimeString,
  intFromString,
} from "#src/platform/query-schema";

export type SortOrder = "asc" | "desc";

export const QueryBattlesSchema = Schema.Struct({
  cursor: Schema.optional(Schema.String),
  size: intFromString({ min: 1, max: 100 }).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(20)),
  ),
  sortOrder: Schema.Literals(["asc", "desc"]).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed("desc")),
  ),
  includeTotal: booleanFromString.pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed(false)),
  ),
  world: Schema.optional(Schema.String),
  type: Schema.optional(
    commaSeparatedArray(Schema.Literals(["solo", "group"])),
  ),
  userId: Schema.optional(Schema.String),
  public: Schema.optional(booleanFromString),
  characterId: Schema.optional(commaSeparatedArray(Schema.String)),
  search: Schema.optional(Schema.String),
  result: Schema.optional(
    commaSeparatedArray(Schema.Literals(["won", "lost", "flee"])),
  ),
  ph: Schema.optional(booleanFromString),
  matchmaking: Schema.optional(booleanFromString),
  startDate: Schema.optional(dateTimeString),
  endDate: Schema.optional(dateTimeString),
  minLevel: Schema.optional(intFromString({ min: 1, max: 1000 })),
  maxLevel: Schema.optional(intFromString({ min: 1, max: 1000 })),
});

export type QueryBattlesDto = typeof QueryBattlesSchema.Type;
