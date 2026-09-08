import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  makeQueue as queue,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted, Schema } from "effect";
import { SearchConfig } from "#src/config/search-config";
import { IndexItemsPayload } from "#src/items/index-items-command";
import { IndexNpcsPayload } from "#src/npcs/index-npcs-command";
import { IndexPlayersPayload } from "#src/players/index-players-command";
import { SearchHttpServer } from "#src/http-api/search-http";
import { SearchOperations } from "#src/http-api/search-operations";
import { effectLogger } from "#src/shared/logger";

export const searchQueues = [
  queue("search.items.index", RabbitRoutingKey.SEARCH_ITEMS_INDEX),
  queue("search-npcs-index", RabbitRoutingKey.SEARCH_NPCS_INDEX),
  queue("search-players-index", RabbitRoutingKey.SEARCH_PLAYERS_INDEX),
] as const;

export const SearchConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const search = yield* SearchOperations;
    const consume = <A>(
      queueName: string,
      schema: Schema.Codec<ReadonlyArray<A>>,
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
            items = Schema.decodeUnknownSync(Schema.fromJsonString(schema))(
              new TextDecoder().decode(delivery.content),
            );
          } catch (error) {
            effectLogger.error(`Validation error in ${queueName} handler`, {
              error,
            });
            return Effect.void;
          }
          return index(items).pipe(
            Effect.withSpan(queueName, {
              attributes: { adapter: "rabbitmq", retryCount: 0 },
            }),
          );
        },
      );
    yield* consume("search.items.index", IndexItemsPayload, (items) =>
      search.indexItems({ items: [...items] }),
    );
    yield* consume("search-npcs-index", IndexNpcsPayload, (npcs) =>
      search.indexNpcs({ npcs: [...npcs] }),
    );
    yield* consume("search-players-index", IndexPlayersPayload, (players) =>
      search.indexPlayers({ players: [...players] }),
    );
  }),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* SearchConfig;
    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
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
