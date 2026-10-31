import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  makeQueue as queue,
} from "@lootlog/protocol/rabbit/topology";
import {
  Deferred,
  Effect,
  Layer,
  Queue,
  Redacted,
  Schedule,
  Schema,
  Stream,
} from "effect";
import { SearchConfig } from "#src/config/search-config";
import { IndexItemsPayload } from "#src/items/index-items-command";
import { RetiredDropsPayload } from "#src/items/retired-drops-command";
import { IndexNpcsPayload } from "#src/npcs/index-npcs-command";
import { MonsterLocationsPayload } from "#src/npcs/monster-locations-command";
import { IndexPlayersPayload } from "#src/players/index-players-command";
import { SearchHttpServer } from "#src/http-api/search-http";
import { SearchOperations } from "#src/http-api/search-operations";
import { effectLogger } from "#src/shared/logger";

const batchMessageLimit = 50;

const searchQueues = {
  items: queue("search.items.index", RabbitRoutingKey.SEARCH_ITEMS_INDEX),
  retiredDrops: queue(
    "search.items.retired-drops",
    RabbitRoutingKey.SEARCH_ITEMS_RETIRED_DROPS,
  ),
  npcs: queue("search-npcs-index", RabbitRoutingKey.SEARCH_NPCS_INDEX),
  npcLocations: queue(
    "search.npcs.locations",
    RabbitRoutingKey.SEARCH_NPCS_LOCATIONS,
  ),
  players: queue("search-players-index", RabbitRoutingKey.SEARCH_PLAYERS_INDEX),
};

export const SearchConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const search = yield* SearchOperations;

    const consume = Effect.fn("SearchConsumers.consume")(function* <A>(
      queueName: string,
      schema: Schema.Codec<ReadonlyArray<A>>,
      index: (items: ReadonlyArray<A>) => Effect.Effect<void, unknown>,
    ) {
      const pending = yield* Queue.make<{
        readonly items: ReadonlyArray<A>;
        readonly completed: Deferred.Deferred<void, unknown>;
      }>({ capacity: batchMessageLimit });

      yield* Stream.fromQueue(pending).pipe(
        Stream.groupedWithin(batchMessageLimit, "2 seconds"),
        Stream.runForEach((batch) =>
          Effect.gen(function* () {
            const items = batch.flatMap(({ items }) => items);

            const outcome = yield* Effect.exit(
              Effect.suspend(() => index(items)).pipe(
                Effect.tapError(() =>
                  Effect.logWarning(
                    "Search indexing failed; retrying the ordered batch",
                  ).pipe(Effect.annotateLogs({ queue: queueName })),
                ),
                Effect.retry(Schedule.spaced("5 seconds")),
              ),
            );

            for (const { completed } of batch) {
              yield* Deferred.done(completed, outcome);
            }
          }).pipe(
            // The batch loop outlives the consume span; give each batch its own trace.
            Effect.withSpan("SearchConsumers.indexBatch", {
              root: true,
              attributes: {
                "messaging.destination.name": queueName,
                "messaging.batch.message_count": batch.length,
              },
            }),
          ),
        ),
        Effect.forkScoped,
      );

      return yield* rabbit.consume(
        {
          queue: queueName,
          prefetch: batchMessageLimit,
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

          // Keep each delivery unacknowledged until the whole batch succeeds.
          return Effect.gen(function* () {
            const completed = yield* Deferred.make<void, unknown>();
            yield* Queue.offer(pending, { items, completed });
            yield* Deferred.await(completed);
          });
        },
      );
    });

    yield* consume(searchQueues.items.name, IndexItemsPayload, (items) =>
      search.indexItems({ items: [...items] }),
    );
    yield* consume(
      searchQueues.retiredDrops.name,
      RetiredDropsPayload,
      (monsters) => search.markRetiredDrops({ monsters: [...monsters] }),
    );
    yield* consume(searchQueues.npcs.name, IndexNpcsPayload, (npcs) =>
      search.indexNpcs({ npcs: [...npcs] }),
    );
    yield* consume(
      searchQueues.npcLocations.name,
      MonsterLocationsPayload,
      (monsters) => search.setNpcLocations({ monsters: [...monsters] }),
    );
    yield* consume(searchQueues.players.name, IndexPlayersPayload, (players) =>
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
