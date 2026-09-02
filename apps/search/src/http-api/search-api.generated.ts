import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
// non-recursive definitions
export type PlayerHitDto_Output = {
  readonly id: string;
  readonly name: string;
  readonly lvl: number;
  readonly prof: string;
  readonly icon: string;
  readonly characterId: number;
  readonly accountId: number;
  readonly world: string;
};
export const PlayerHitDto_Output = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  lvl: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  prof: Schema.String,
  icon: Schema.String,
  characterId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  accountId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  world: Schema.String,
}).annotate({
  description: "Player search hit",
  identifier: "PlayerHitDto_Output",
});
export type NpcHitDto_Output = {
  readonly id: number;
  readonly prof: string;
  readonly icon: string;
  readonly name: string;
  readonly lvl: number;
  readonly wt: number;
  readonly type:
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "COLOSSUS"
    | "TITAN"
    | "NPC";
  readonly margonemType: number;
  readonly world: string;
};
export const NpcHitDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  prof: Schema.String,
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  wt: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  type: Schema.Literals([
    "COMMON",
    "ELITE",
    "ELITE2",
    "ELITE3",
    "HERO",
    "EVENT_HERO",
    "COLOSSUS",
    "TITAN",
    "NPC",
  ]),
  margonemType: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  world: Schema.String,
}).annotate({ description: "NPC search hit", identifier: "NpcHitDto_Output" });
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
export type SearchAllResponseDto_Output = {
  readonly items: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly icon: string;
    readonly stat: string;
    readonly lvl: number;
    readonly rarity: string | null;
    readonly type: string | null;
    readonly worlds: ReadonlyArray<string>;
  }>;
  readonly players: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
    readonly characterId: number;
    readonly accountId: number;
    readonly world: string;
  }>;
  readonly npcs: ReadonlyArray<{
    readonly id: number;
    readonly prof: string;
    readonly icon: string;
    readonly name: string;
    readonly lvl: number;
    readonly wt: number;
    readonly type:
      | "COMMON"
      | "ELITE"
      | "ELITE2"
      | "ELITE3"
      | "HERO"
      | "EVENT_HERO"
      | "COLOSSUS"
      | "TITAN"
      | "NPC";
    readonly margonemType: number;
    readonly world: string;
  }>;
};
export const SearchAllResponseDto_Output = Schema.Struct({
  items: Schema.Array(
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
  players: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String,
      icon: Schema.String,
      characterId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      accountId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      world: Schema.String,
    }).annotate({ description: "Player search hit" }),
  ),
  npcs: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String,
      icon: Schema.String,
      name: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      wt: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      type: Schema.Literals([
        "COMMON",
        "ELITE",
        "ELITE2",
        "ELITE3",
        "HERO",
        "EVENT_HERO",
        "COLOSSUS",
        "TITAN",
        "NPC",
      ]),
      margonemType: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      world: Schema.String,
    }).annotate({ description: "NPC search hit" }),
  ),
}).annotate({
  description: "Aggregated search results",
  identifier: "SearchAllResponseDto_Output",
});
// schemas
export type PlayersControllerGetPlayersParams = {
  readonly limit?: number;
  readonly search?: string | ReadonlyArray<string>;
  readonly world?: string;
};
export const PlayersControllerGetPlayersParams = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
  world: Schema.optionalKey(Schema.String),
});
export type PlayersControllerGetPlayersQuery = {
  readonly limit?: number;
  readonly search?: string | ReadonlyArray<string>;
  readonly world?: string;
};
export const PlayersControllerGetPlayersQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
  world: Schema.optionalKey(Schema.String),
});
export type PlayersControllerGetPlayers200 = ReadonlyArray<PlayerHitDto_Output>;
export const PlayersControllerGetPlayers200 = Schema.Array(PlayerHitDto_Output);
export type NpcsControllerGetNpcsParams = {
  readonly ids?: ReadonlyArray<number>;
  readonly limit?: number;
  readonly search?: string | ReadonlyArray<string>;
  readonly world?: string;
};
export const NpcsControllerGetNpcsParams = Schema.Struct({
  ids: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
  world: Schema.optionalKey(Schema.String),
});
export type NpcsControllerGetNpcsQuery = {
  readonly ids?: ReadonlyArray<number>;
  readonly limit?: number;
  readonly search?: string | ReadonlyArray<string>;
  readonly world?: string;
};
export const NpcsControllerGetNpcsQuery = Schema.Struct({
  ids: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
  world: Schema.optionalKey(Schema.String),
});
export type NpcsControllerGetNpcs200 = ReadonlyArray<NpcHitDto_Output>;
export const NpcsControllerGetNpcs200 = Schema.Array(NpcHitDto_Output);
export type ItemsControllerGetItemsParams = {
  readonly limit?: number;
  readonly offset?: number;
  readonly search?: string;
  readonly world?: string;
  readonly filter?: string | ReadonlyArray<string>;
  readonly facets?: ReadonlyArray<string>;
  readonly sort?: ReadonlyArray<string>;
};
export const ItemsControllerGetItemsParams = Schema.Struct({
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
export type AllControllerSearchAllParams = {
  readonly limit?: number;
  readonly search?: string;
  readonly world?: string;
};
export const AllControllerSearchAllParams = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
});
export type AllControllerSearchAllQuery = {
  readonly limit?: number;
  readonly search?: string;
  readonly world?: string;
};
export const AllControllerSearchAllQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
});
export type AllControllerSearchAll200 = SearchAllResponseDto_Output;
export const AllControllerSearchAll200 = SearchAllResponseDto_Output;

class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("HealthzControllerHealthCheck", "/healthz", {
    success: HttpApiSchema.Empty(200),
  })
    .annotate(OpenApi.Identifier, "HealthzController_healthCheck")
    .annotate(OpenApi.Summary, "Health check")
    .annotate(
      OpenApi.Description,
      "Check the health status of the search service",
    ),
) {}

class PlayersGroup extends HttpApiGroup.make("Players").add(
  HttpApiEndpoint.get("PlayersControllerGetPlayers", "/players", {
    query: PlayersControllerGetPlayersQuery,
    success: PlayersControllerGetPlayers200,
  })
    .annotate(OpenApi.Identifier, "PlayersController_getPlayers")
    .annotate(OpenApi.Summary, "Search players by name"),
) {}

class NPCsGroup extends HttpApiGroup.make("NPCs").add(
  HttpApiEndpoint.get("NpcsControllerGetNpcs", "/npcs", {
    query: NpcsControllerGetNpcsQuery,
    success: NpcsControllerGetNpcs200,
  })
    .annotate(OpenApi.Identifier, "NpcsController_getNpcs")
    .annotate(OpenApi.Summary, "Search NPCs by name"),
) {}

class ItemsGroup extends HttpApiGroup.make("Items").add(
  HttpApiEndpoint.get("ItemsControllerGetItems", "/items", {
    query: ItemsControllerGetItemsQuery,
    success: ItemsControllerGetItems200,
  })
    .annotate(OpenApi.Identifier, "ItemsController_getItems")
    .annotate(
      OpenApi.Summary,
      "Search items with filters, sorting, and facets",
    ),
) {}

class AllGroup extends HttpApiGroup.make("All").add(
  HttpApiEndpoint.get("AllControllerSearchAll", "/all", {
    query: AllControllerSearchAllQuery,
    success: AllControllerSearchAll200,
  })
    .annotate(OpenApi.Identifier, "AllController_searchAll")
    .annotate(OpenApi.Summary, "Search across all categories"),
) {}

export class SearchApi extends HttpApi.make("SearchApi")
  .annotate(OpenApi.Title, "Search API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "Meilisearch-powered search microservice")
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, PlayersGroup, NPCsGroup, ItemsGroup, AllGroup) {}
