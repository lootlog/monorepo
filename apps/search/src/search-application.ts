import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { SearchConfig } from "#src/config/search-config";
import { decodeIndexItemsPayload } from "#src/items/dto/index-items.dto";
import { decodeIndexNpcsPayload } from "#src/npcs/dto/index-npcs.dto";
import { decodeIndexPlayersPayload } from "#src/players/dto/index-players.dto";
import { SearchHttpServer } from "#src/http-api/search-http";
import { SearchOperations } from "#src/http-api/search-operations";
import { consoleLogger } from "#src/shared/logger";

const queue = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
): RabbitQueueDefinition => ({
  name,
  exchange: RabbitExchange.DEFAULT,
  routingKey,
  durable: true,
});
export const searchQueues = [
  queue("search.items.index", RabbitRoutingKey.SEARCH_ITEMS_INDEX),
  queue("search-npcs-index", RabbitRoutingKey.SEARCH_NPCS_INDEX),
  queue("search-players-index", RabbitRoutingKey.SEARCH_PLAYERS_INDEX),
] as const;

const decodeJson = (content: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(content));
export const SearchConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const search = yield* SearchOperations;
    const consume = <A>(
      queueName: string,
      decode: (input: unknown) => ReadonlyArray<A>,
      index: (items: ReadonlyArray<A>) => Effect.Effect<void, unknown>,
    ) =>
      rabbit.consume(
        {
          queue: queueName,
          prefetch: 1,
          failurePolicy: { strategy: "requeue" },
        },
        (delivery) => {
          let items: ReadonlyArray<A>;
          try {
            items = decode(decodeJson(delivery.content));
          } catch (error) {
            consoleLogger.error(
              `Validation error in ${queueName} handler`,
              error,
            );
            return Effect.void;
          }
          return index(items).pipe(
            Effect.withSpan(queueName, {
              attributes: { adapter: "rabbitmq", retryCount: 0 },
            }),
          );
        },
      );
    yield* consume("search.items.index", decodeIndexItemsPayload, (items) =>
      search.indexItems({ items: [...items] }),
    );
    yield* consume("search-npcs-index", decodeIndexNpcsPayload, (npcs) =>
      search.indexNpcs({ npcs: [...npcs] }),
    );
    yield* consume(
      "search-players-index",
      decodeIndexPlayersPayload,
      (players) => search.indexPlayers({ players: [...players] }),
    );
  }),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* SearchConfig;
    return RabbitMessaging.layer({
      uri: config.rabbitmqUri,
      connectionName: config.serviceName,
      queues: searchQueues,
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
