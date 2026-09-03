/** Transport schemas owned by the items HTTP module. */
import * as Schema from "effect/Schema";

export type SearchItemsResponseDto_Output = {
  readonly hits: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly icon: string;
    readonly stat: string;
    readonly lvl: number;
    readonly rarity: string | null;
    readonly type: string | null;
    readonly worlds: ReadonlyArray<string>;
  }>;
  readonly estimatedTotalHits: number;
  readonly facetDistribution: {
    readonly [x: string]: { readonly [x: string]: number };
  };
  readonly facetStats: {
    readonly [x: string]: { readonly min: number; readonly max: number };
  };
};

export const SearchItemsResponseDto_Output = Schema.Struct({
  hits: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String,
      icon: Schema.String,
      stat: Schema.String.annotate({ default: "" }),
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      rarity: Schema.Union([Schema.String, Schema.Null]),
      type: Schema.Union([Schema.String, Schema.Null]),
      worlds: Schema.Array(Schema.String).annotate({ default: [] }),
    }).annotate({ description: "Item search hit" }),
  ),
  estimatedTotalHits: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  facetDistribution: Schema.Record(
    Schema.String,
    Schema.Record(
      Schema.String,
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
  ).annotate({ default: {} }),
  facetStats: Schema.Record(
    Schema.String,
    Schema.Struct({
      min: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      max: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ).annotate({ default: {} }),
}).annotate({
  description: "Item search results",
  identifier: "SearchItemsResponseDto_Output",
});

export type ItemsControllerGetItemsQuery = {
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string;
  readonly world?: string;
  readonly filter?: string | ReadonlyArray<string>;
  readonly facets?: ReadonlyArray<string>;
  readonly sort?: ReadonlyArray<string>;
};

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

export type ItemsControllerGetItems200 = SearchItemsResponseDto_Output;

export const ItemsControllerGetItems200 = SearchItemsResponseDto_Output;
