import { Context, Effect, Layer } from "effect";
import { Meilisearch } from "meilisearch";
import { SearchConfig } from "#src/config/search-config";
import { makeItemsModule } from "#src/items/items.service";
import { configureMeilisearchIndexes } from "#src/meilisearch/meilisearch-indexes.service";
import {
  SearchOperationFailure,
  type SearchOperationFailure as SearchOperationFailureType,
} from "#src/meilisearch/search-operation-failure";
import { makeNpcsModule } from "#src/npcs/npcs.service";
import { makePlayersModule } from "#src/players/players.service";
import { consoleLogger } from "#src/shared/logger";
import type { IndexItemsDto } from "#src/items/dto/index-items.dto";
import type { IndexNpcsDto } from "#src/npcs/dto/index-npcs.dto";
import type { IndexPlayersDto } from "#src/players/dto/index-players.dto";
import type {
  AllControllerSearchAllQuery,
  ItemsControllerGetItemsQuery,
  NpcsControllerGetNpcsQuery,
  PlayersControllerGetPlayersQuery,
  SearchAllResponseDto_Output,
  SearchItemsResponseDto_Output,
  NpcHitDto_Output,
  PlayerHitDto_Output,
} from "./search-api.js";

export { SearchOperationFailure };

export interface SearchOperationsValue {
  readonly searchPlayers: (
    query: PlayersControllerGetPlayersQuery,
  ) => Effect.Effect<
    ReadonlyArray<PlayerHitDto_Output>,
    SearchOperationFailureType
  >;
  readonly searchNpcs: (
    query: NpcsControllerGetNpcsQuery,
  ) => Effect.Effect<
    ReadonlyArray<NpcHitDto_Output>,
    SearchOperationFailureType
  >;
  readonly searchItems: (
    query: ItemsControllerGetItemsQuery,
  ) => Effect.Effect<SearchItemsResponseDto_Output, SearchOperationFailureType>;
  readonly searchAll: (
    query: AllControllerSearchAllQuery,
  ) => Effect.Effect<SearchAllResponseDto_Output, SearchOperationFailureType>;
  readonly indexItems: (
    data: IndexItemsDto,
  ) => Effect.Effect<void, SearchOperationFailureType>;
  readonly indexNpcs: (
    data: IndexNpcsDto,
  ) => Effect.Effect<void, SearchOperationFailureType>;
  readonly indexPlayers: (
    data: IndexPlayersDto,
  ) => Effect.Effect<void, SearchOperationFailureType>;
}

export class SearchOperations extends Context.Service<
  SearchOperations,
  SearchOperationsValue
>()("@lootlog/search/SearchOperations") {
  static readonly layer = Layer.effect(
    SearchOperations,
    Effect.gen(function* () {
      const config = yield* SearchConfig;
      const meilisearch = new Meilisearch({
        host: config.meilisearchHost,
        apiKey: config.meilisearchApiKey,
      });
      const items = makeItemsModule(meilisearch, consoleLogger);
      const npcs = makeNpcsModule(meilisearch, consoleLogger);
      const players = makePlayersModule(meilisearch, consoleLogger);

      yield* configureMeilisearchIndexes(meilisearch, consoleLogger);

      return SearchOperations.of({
        searchPlayers: (query) =>
          players.getPlayers({
            ...query,
            limit: query.limit ?? 10,
            search: query.search ? [...asArray(query.search)] : undefined,
          }),
        searchNpcs: (query) =>
          npcs.getNpcs({
            ...query,
            ids: query.ids ? [...query.ids] : undefined,
            limit: query.limit ?? 10,
            search: query.search ? [...asArray(query.search)] : undefined,
          }),
        searchItems: (query) =>
          items.searchItems({
            ...query,
            facets: query.facets ? [...query.facets] : undefined,
            filter: query.filter ? [...asArray(query.filter)] : undefined,
            limit: query.limit ?? 20,
            offset: query.offset ?? 0,
            sort: query.sort ? [...query.sort] : undefined,
          }),
        searchAll: (query) =>
          Effect.all(
            {
              items: items.getItems({ ...query, limit: query.limit ?? 10 }),
              npcs: npcs.getNpcs({ ...query, limit: query.limit ?? 10 }),
              players: players.getPlayers({
                ...query,
                limit: query.limit ?? 10,
              }),
            },
            { concurrency: "unbounded" },
          ),
        indexItems: items.indexItems,
        indexNpcs: npcs.indexNpcs,
        indexPlayers: players.indexPlayers,
      });
    }),
  ).pipe(Layer.provide(SearchConfig.layer));
}

const asArray = <A>(value: A | ReadonlyArray<A>): ReadonlyArray<A> =>
  Array.isArray(value) ? value : [value as A];
