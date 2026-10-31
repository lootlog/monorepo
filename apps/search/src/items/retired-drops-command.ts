import { GameVersionSchema } from "@lootlog/schema/game-version";
import { Schema } from "effect";

/** The items a monster no longer drops; the list is all of them. */
export const RetiredDrops = Schema.Struct({
  gameVersion: GameVersionSchema,
  name: Schema.String,
  type: Schema.NullOr(Schema.String),
  retiredItemIds: Schema.Array(Schema.Number),
});

export const RetiredDropsPayload = Schema.Array(RetiredDrops);

export type RetiredDropsCommand = {
  readonly monsters: typeof RetiredDropsPayload.Type;
};
