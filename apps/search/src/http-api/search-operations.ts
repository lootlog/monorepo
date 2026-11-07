import { configureMeilisearchIndexes } from "@lootlog/meilisearch/index-settings";
import type { SearchOperationFailure } from "@lootlog/meilisearch/operation-failure";
import { Context, Effect, Layer, Predicate, Redacted } from "effect";
import { Meilisearch } from "meilisearch";
import { SearchConfig } from "#src/config/search-config";
import { makePlayersModule } from "#src/players/players.service";
import { PLAYERS_INDEX } from "#src/players/search-index";
import { effectLogger } from "#src/shared/logger";
import type { IndexPlayersCommand } from "#src/players/index-players-command";
import type {
  PlayersControllerGetPlayersQuery,
  PlayerHitDto_Output,
} from "./contracts/players/schemas.js";

/** The settings the search indexes run with. */
export const searchIndexSettings = {
  [PLAYERS_INDEX]: { filterableAttributes: ["name", "world"] },
};

export interface SearchOperationsValue {
  readonly searchPlayers: (
    query: PlayersControllerGetPlayersQuery,
  ) => Effect.Effect<
    ReadonlyArray<PlayerHitDto_Output>,
    SearchOperationFailure
  >;
  readonly indexPlayers: (
    data: IndexPlayersCommand,
  ) => Effect.Effect<void, SearchOperationFailure>;
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
        apiKey: Redacted.value(config.meilisearchApiKey),
      });

      const players = makePlayersModule(meilisearch, effectLogger);

      yield* configureMeilisearchIndexes(
        meilisearch,
        searchIndexSettings,
        effectLogger,
      );

      return SearchOperations.of({
        searchPlayers: (query) =>
          players.getPlayers({
            ...query,
            limit: query.limit ?? 10,
            search:
              query.search &&
              (Predicate.isString(query.search)
                ? query.search
                : [...query.search]),
          }),
        indexPlayers: players.indexPlayers,
      });
    }),
  ).pipe(Layer.provide(SearchConfig.layer));
}
