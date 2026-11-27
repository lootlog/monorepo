import { Schema } from "effect";
import { optionalOrUndefined } from "@lootlog/schema/stored-value";

export const parseBingoBoardSearch = Schema.decodeUnknownSync(
  Schema.Struct({
    member: optionalOrUndefined(
      Schema.Union([Schema.Finite, Schema.FiniteFromString]),
    ),
  }),
);
