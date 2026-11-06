import { RabbitMessaging, UnprocessableDelivery } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  makeQueue as queue,
} from "@lootlog/protocol/rabbit/topology";
import {
  Deferred,
  Effect,
  Exit,
  Layer,
  Queue,
  Redacted,
  Schedule,
  Schema,
  Stream,
} from "effect";
import { SearchConfig } from "#src/config/search-config";
import { IndexItemsPayload } from "#src/items/index-items-command";
import { ItemRevisionsPayload } from "#src/items/item-revisions-command";
import { MonsterDropsPayload } from "#src/items/monster-drops-command";
import { IndexNpcsPayload } from "#src/npcs/index-npcs-command";
import { MonsterLocationsPayload } from "#src/npcs/monster-locations-command";
import { IndexPlayersPayload } from "#src/players/index-players-command";
import { SearchHttpServer } from "#src/http-api/search-http";
import { SearchOperations } from "#src/http-api/search-operations";
import { effectLogger } from "#src/shared/logger";
import {
  isPermanentSearchFailure,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";

const batchMessageLimit = 50;

const rejectPermanent = (outcome: Exit.Exit<void, SearchOperationFailure>) =>
  Exit.mapError(outcome, (error) =>
    isPermanentSearchFailure(error)
      ? new UnprocessableDelivery({ cause: error })
      : error,
  );

const searchQueues = {
  items: queue("search.items.index", RabbitRoutingKey.SEARCH_ITEMS_INDEX),
  retiredDrops: queue(
    "search.items.retired-drops",
    RabbitRoutingKey.SEARCH_ITEMS_RETIRED_DROPS,
  ),
  itemRevisions: queue(
    "search.items.revisions",
    RabbitRoutingKey.SEARCH_ITEMS_REVISIONS,
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
      index: (
        items: ReadonlyArray<A>,
      ) => Effect.Effect<void, SearchOperationFailure>,
    ) {
      const pending = yield* Queue.make<{
        readonly items: ReadonlyArray<A>;
        readonly completed: Deferred.Deferred<
          void,
          SearchOperationFailure | UnprocessableDelivery
        >;
      }>({ capacity: batchMessageLimit });

      const indexUntilSettled = (items: ReadonlyArray<A>) =>
        Effect.suspend(() => index(items)).pipe(
          Effect.tapError((error) =>
            isPermanentSearchFailure(error)
              ? Effect.void
              : Effect.logWarning(
                  "Search indexing failed; retrying the ordered batch",
                ).pipe(Effect.annotateLogs({ queue: queueName })),
          ),
          Effect.retry({
            schedule: Schedule.spaced("5 seconds"),
            while: (error) => !isPermanentSearchFailure(error),
          }),
        );

      yield* Stream.fromQueue(pending).pipe(
        Stream.groupedWithin(batchMessageLimit, "2 seconds"),
        Stream.runForEach((batch) =>
          Effect.gen(function* () {
            const outcome = yield* Effect.exit(
              indexUntilSettled(batch.flatMap(({ items }) => items)),
            );

            if (Exit.isSuccess(outcome) || batch.length === 1) {
              for (const { completed } of batch) {
                yield* Deferred.done(completed, rejectPermanent(outcome));
              }

              return;
            }

            // One rejected delivery must not hold back or drop its batch:
            // index each on its own so only the one that cannot succeed is
            // rejected. Indexing is an upsert, so repeating the rest is safe.
            for (const { items, completed } of batch) {
              yield* Deferred.done(
                completed,
                rejectPermanent(yield* Effect.exit(indexUntilSettled(items))),
              );
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
            const completed = yield* Deferred.make<
              void,
              SearchOperationFailure | UnprocessableDelivery
            >();

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
      MonsterDropsPayload,
      (monsters) => search.setMonsterDrops({ monsters: [...monsters] }),
    );
    yield* consume(
      searchQueues.itemRevisions.name,
      ItemRevisionsPayload,
      (items) => search.setItemRevisions({ items: [...items] }),
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
