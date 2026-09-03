/** Transport schemas owned by the items HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type SearchItemsResponseDto_Output =
  typeof SearchItemsResponseDto_Output.Type;

export const SearchItemsResponseDto_Output = Schema.Struct({
  hits: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String,
      icon: Schema.String,
      stat: Schema.String.annotate({ default: "" }),
      lvl: FiniteNumber,
      rarity: Schema.Union([Schema.String, Schema.Null]),
      type: Schema.Union([Schema.String, Schema.Null]),
      worlds: Schema.Array(Schema.String).annotate({ default: [] }),
    }).annotate({ description: "Item search hit" }),
  ),
  estimatedTotalHits: FiniteNumber,
  facetDistribution: Schema.Record(
    Schema.String,
    Schema.Record(Schema.String, FiniteNumber),
  ).annotate({ default: {} }),
  facetStats: Schema.Record(
    Schema.String,
    Schema.Struct({
      min: FiniteNumber,
      max: FiniteNumber,
    }),
  ).annotate({ default: {} }),
}).annotate({
  description: "Item search results",
  identifier: "SearchItemsResponseDto_Output",
});

export type ItemsControllerGetItemsQuery =
  typeof ItemsControllerGetItemsQuery.Type;

export const ItemsControllerGetItemsQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 20 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  offset: Schema.optionalKey(
    Schema.Number.annotate({ default: 0 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
  filter: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
  facets: Schema.optionalKey(Schema.Array(Schema.String)),
  sort: Schema.optionalKey(Schema.Array(Schema.String)),
});

export type ItemsControllerGetItems200 = typeof ItemsControllerGetItems200.Type;

export const ItemsControllerGetItems200 = SearchItemsResponseDto_Output;
