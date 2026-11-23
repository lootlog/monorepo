import { eventMessage, type RabbitMessaging } from "@lootlog/messaging";
import type { CatalogItemRevisions } from "@lootlog/protocol/rabbit/catalog";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import { tryAdvisoryTransactionLock } from "#src/shared/advisory-lock";
import { chunk } from "es-toolkit";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  buildItemRevisionsQuery,
  toItemRevisionHistories,
} from "./item-revisions.js";

const ITEMS_PER_MESSAGE = 200;

const ITEM_REVISIONS_LOCK = 7_316_205;

export const makeItemRevisionsPublisher = (
  database: ApiDatabaseValue,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
) =>
  Effect.gen(function* () {
    const rows = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        if (
          !(yield* tryAdvisoryTransactionLock(transaction, ITEM_REVISIONS_LOCK))
        ) {
          return null;
        }

        return yield* buildItemRevisionsQuery(transaction);
      }),
    );

    if (rows === null) return;

    const items: CatalogItemRevisions[] = toItemRevisionHistories(rows);

    yield* Effect.forEach(
      chunk(items, ITEMS_PER_MESSAGE),
      (batch) =>
        rabbit.publish(
          eventMessage(RabbitRoutingKey.CATALOG_ITEMS_REVISIONS, batch),
        ),
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
