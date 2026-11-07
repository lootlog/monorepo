import { consumeInBatches } from "@lootlog/meilisearch/batch-consumer";
import {
  isPermanentSearchFailure,
  SearchOperationFailure,
} from "@lootlog/meilisearch/operation-failure";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  makeDeadLetterQueue,
  makeQueue,
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import type { CatalogWriteFailure } from "#src/database/catalog-store";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogDatabase, PgClientLive } from "#src/database/database";
import { CatalogHttpServer } from "#src/http-api/catalog-http";
import { CatalogOperations } from "#src/http-api/catalog-operations";
import { IndexItemsPayload } from "#src/items/index-items-command";
import { ItemRevisionsPayload } from "#src/items/item-revisions-command";
import { MonsterDropsPayload } from "#src/items/monster-drops-command";
import { IndexNpcsPayload } from "#src/npcs/index-npcs-command";
import { MonsterLocationsPayload } from "#src/npcs/monster-locations-command";

/** A delivery the catalog cannot apply is kept in `catalog.dlq`. */
const catalogQueue = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
) =>
  makeQueue(name, routingKey, {
    deadLetterExchange: RabbitExchange.DEAD_LETTER,
    deadLetterRoutingKey: RabbitRoutingKey.CATALOG_DLQ,
  });

// Replays get their own queues, so a backfill never delays live loots.
export const catalogQueues = {
  items: catalogQueue(
    "catalog.items.index",
    RabbitRoutingKey.CATALOG_ITEMS_INDEX,
  ),
  itemsReplay: catalogQueue(
    "catalog.items.replay",
    RabbitRoutingKey.CATALOG_ITEMS_REPLAY,
  ),
  retiredDrops: catalogQueue(
    "catalog.items.retired-drops",
    RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS,
  ),
  itemRevisions: catalogQueue(
    "catalog.items.revisions",
    RabbitRoutingKey.CATALOG_ITEMS_REVISIONS,
  ),
  npcs: catalogQueue("catalog.npcs.index", RabbitRoutingKey.CATALOG_NPCS_INDEX),
  npcsReplay: catalogQueue(
    "catalog.npcs.replay",
    RabbitRoutingKey.CATALOG_NPCS_REPLAY,
  ),
  npcLocations: catalogQueue(
    "catalog.npcs.locations",
    RabbitRoutingKey.CATALOG_NPCS_LOCATIONS,
  ),
  deadLetters: makeDeadLetterQueue({
    name: "catalog.dlq",
    routingKey: RabbitRoutingKey.CATALOG_DLQ,
  }),
};

/** Only a search rejection of the request itself can never succeed. */
const isPermanent = (error: CatalogWriteFailure) =>
  error instanceof SearchOperationFailure && isPermanentSearchFailure(error);

export const CatalogConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const catalog = yield* CatalogOperations;

    for (const queue of [catalogQueues.items, catalogQueues.itemsReplay]) {
      yield* consumeInBatches({
        queue: queue.name,
        schema: IndexItemsPayload,
        apply: (items) => catalog.indexItems({ items: [...items] }),
        isPermanent,
      });
    }

    for (const queue of [catalogQueues.npcs, catalogQueues.npcsReplay]) {
      yield* consumeInBatches({
        queue: queue.name,
        schema: IndexNpcsPayload,
        apply: (npcs) => catalog.indexNpcs({ npcs: [...npcs] }),
        isPermanent,
      });
    }

    yield* consumeInBatches({
      queue: catalogQueues.retiredDrops.name,
      schema: MonsterDropsPayload,
      apply: (monsters) => catalog.setMonsterDrops({ monsters: [...monsters] }),
      isPermanent,
    });
    yield* consumeInBatches({
      queue: catalogQueues.itemRevisions.name,
      schema: ItemRevisionsPayload,
      apply: (items) => catalog.setItemRevisions({ items: [...items] }),
      isPermanent,
    });
    yield* consumeInBatches({
      queue: catalogQueues.npcLocations.name,
      schema: MonsterLocationsPayload,
      apply: (monsters) => catalog.setNpcLocations({ monsters: [...monsters] }),
      isPermanent,
    });
  }),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* CatalogConfig;

    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: Object.values(catalogQueues),
    });
  }),
);

export const CatalogApplication = Layer.merge(
  CatalogHttpServer,
  CatalogConsumers,
).pipe(
  Layer.provide(CatalogOperations.layer),
  Layer.provide(CatalogDatabase.layer),
  Layer.provide(PgClientLive),
  Layer.provide(RabbitLive),
  Layer.provide(CatalogConfig.layer),
);
