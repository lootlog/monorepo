import { Schema } from "effect";
import { ItemHit } from "./item-hit.schema.js";
export const SearchItemsResponse = Schema.Struct({
  hits: Schema.Array(ItemHit),
  estimatedTotalHits: Schema.Number,
  facetDistribution: Schema.Record(
    Schema.String,
    Schema.Record(Schema.String, Schema.Number),
  ),
  facetStats: Schema.Record(
    Schema.String,
    Schema.Struct({ min: Schema.Number, max: Schema.Number }),
  ),
});
export type SearchItemsResponse = typeof SearchItemsResponse.Type;
