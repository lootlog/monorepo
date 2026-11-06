import type { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { chunk } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { itemSnapshotTable } from "#src/database/drizzle/loot.schema";
import {
  buildItemRevisionsQuery,
  toItemRevisionHistories,
} from "./item-revisions.js";

const ITEMS_PER_MESSAGE = 200;

// One run at a time across API replicas; the key is arbitrary but fixed.
const ITEM_REVISIONS_LOCK = 7_316_205;

/**
 * Publishes the changes the game made to every item with more than one
 * revision. Each item's list is complete, so search replaces what it held
 * and a redelivery changes nothing.
 */
export const makeItemRevisionsPublisher = (
  database: ApiDatabaseValue,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
) =>
  Effect.gen(function* () {
    const rows = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const [lock] = yield* transaction
          .select({
            acquired: sql<boolean>`pg_try_advisory_xact_lock(${ITEM_REVISIONS_LOCK})`,
          })
          // The builder needs a source; one row runs the lock function once.
          .from(itemSnapshotTable)
          .limit(1);

        if (!lock?.acquired) return null;

        return yield* buildItemRevisionsQuery(transaction);
      }),
    );

    if (rows === null) return;

    const items = toItemRevisionHistories(rows);

    yield* Effect.forEach(
      chunk(items, ITEMS_PER_MESSAGE),
      (batch) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.SEARCH_ITEMS_REVISIONS,
          content: new TextEncoder().encode(JSON.stringify(batch)),
        }),
      { discard: true },
    );

    yield* Effect.logInfo("Item revisions published").pipe(
      Effect.annotateLogs({
        items: items.length,
        changed: items.filter(({ revisions }) => revisions.length > 0).length,
      }),
    );
  }).pipe(
    Effect.withSpan("loots.itemRevisions.publish"),
    Effect.catch((error) =>
      Effect.logError("Item revisions publication failed").pipe(
        Effect.annotateLogs({ cause: error }),
      ),
    ),
  );
