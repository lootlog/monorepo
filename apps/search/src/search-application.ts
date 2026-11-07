import { consumeInBatches } from "@lootlog/meilisearch/batch-consumer";
import { isPermanentSearchFailure } from "@lootlog/meilisearch/operation-failure";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  makeQueue as queue,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import { SearchConfig } from "#src/config/search-config";
import { IndexPlayersPayload } from "#src/players/index-players-command";
import { SearchHttpServer } from "#src/http-api/search-http";
import { SearchOperations } from "#src/http-api/search-operations";

// Replays get their own queue, so a backfill never delays live loots.
export const searchQueues = {
  players: queue("search-players-index", RabbitRoutingKey.SEARCH_PLAYERS_INDEX),
  playersReplay: queue(
    "search.players.replay",
    RabbitRoutingKey.SEARCH_PLAYERS_REPLAY,
  ),
};

export const SearchConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const search = yield* SearchOperations;

    for (const { name } of Object.values(searchQueues)) {
      yield* consumeInBatches({
        queue: name,
        schema: IndexPlayersPayload,
        apply: (players) => search.indexPlayers({ players: [...players] }),
        isPermanent: isPermanentSearchFailure,
      });
    }
  }),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* SearchConfig;

    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: Object.values(searchQueues),
    });
  }),
).pipe(Layer.provide(SearchConfig.layer));

export const SearchApplication = Layer.merge(
  SearchHttpServer,
  SearchConsumers,
).pipe(
  Layer.provide(SearchOperations.layer),
  Layer.provide(RabbitLive),
  Layer.provide(SearchConfig.layer),
);
