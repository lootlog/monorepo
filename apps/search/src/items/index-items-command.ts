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
});
export const IndexItemsPayload = Schema.Array(IndexItem);
export type IndexItemsCommand = {
  readonly items: typeof IndexItemsPayload.Type;
};
export const decodeIndexItemsPayload =
  Schema.decodeUnknownSync(IndexItemsPayload);
