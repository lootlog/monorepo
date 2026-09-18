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
import { IndexNpcsPayload } from "#src/npcs/index-npcs-command";
import { IndexPlayersPayload } from "#src/players/index-players-command";
import { SearchHttpServer } from "#src/http-api/search-http";
import { SearchOperations } from "#src/http-api/search-operations";
import { effectLogger } from "#src/shared/logger";

const batchMessageLimit = 50;

export const searchQueues = [
  queue("search.items.index", RabbitRoutingKey.SEARCH_ITEMS_INDEX),
  queue("search-npcs-index", RabbitRoutingKey.SEARCH_NPCS_INDEX),
  queue("search-players-index", RabbitRoutingKey.SEARCH_PLAYERS_INDEX),
] as const;

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
          }),
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
          }).pipe(
            Effect.withSpan(queueName, {
              attributes: { adapter: "rabbitmq", retryCount: 0 },
            }),
          );
        },
      );
    });

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
