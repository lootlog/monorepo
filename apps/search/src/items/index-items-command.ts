import { GameVersionSchema } from "@lootlog/schema/game-version";
import { Schema } from "effect";

export const IndexItem = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: Schema.Number,
  rarity: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  world: Schema.optional(Schema.String),
  worlds: Schema.optional(Schema.Array(Schema.String)),
  // Older publishers and observations from an unknown host have no edition.
  gameVersion: Schema.optional(Schema.NullOr(GameVersionSchema)),
});

export const IndexItemsPayload = Schema.Array(IndexItem);

export type IndexItemsCommand = {
  readonly items: typeof IndexItemsPayload.Type;
};
