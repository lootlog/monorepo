import { Schema } from "effect";

export const NpcRoutingTierSchema = Schema.Literals([
  "base",
  "titans",
  "heroes",
]);
export type NpcRoutingTier = typeof NpcRoutingTierSchema.Type;

export const NpcRoutingDataSchema = Schema.Struct({
  prof: Schema.optionalKey(Schema.NullOr(Schema.String)),
  type: Schema.optionalKey(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
  wt: Schema.optionalKey(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
});
export type NpcRoutingData = typeof NpcRoutingDataSchema.Type;
