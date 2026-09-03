import { Schema } from "effect";
export const IndexNpc = Schema.Struct({
  id: Schema.Number,
  prof: Schema.NullishOr(Schema.String),
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  wt: Schema.Number,
  type: Schema.String,
  margonemType: Schema.Number,
  world: Schema.String,
});
export const IndexNpcsPayload = Schema.Array(IndexNpc);
export type IndexNpcsCommand = { readonly npcs: typeof IndexNpcsPayload.Type };
export const decodeIndexNpcsPayload =
  Schema.decodeUnknownSync(IndexNpcsPayload);
