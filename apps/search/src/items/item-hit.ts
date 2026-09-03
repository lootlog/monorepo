import { Schema } from "effect";
export const ItemHit = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  lvl: Schema.Number,
  rarity: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  worlds: Schema.Array(Schema.String),
});
export type ItemHit = typeof ItemHit.Type;
