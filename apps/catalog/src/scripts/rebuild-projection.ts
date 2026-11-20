/**
 * Rebuilds the catalog's search indexes from its database.
 *
 * Each index is rebuilt in a shadow index (`<name>_rebuild`) with the
 * service settings, filled from its table in large batches, then every
 * shadow index is swapped into place in one atomic task, so searches never
 * see a half-built index. Batches are enqueued without waiting, so
 * Meilisearch merges them into a few indexing runs.
 *
 * The consumers keep writing to the live indexes while this runs; an entry
 * they change after its page was read is replaced by the older copy until
 * its next change. Run it at a quiet hour.
 *
 * Usage: `bun run projection:rebuild` in `apps/catalog` with the service's
 * environment.
 */
import { BunRuntime } from "@effect/platform-bun";
import {
  ensureIndex,
  SEARCH_INDEX_PRIMARY_KEY,
} from "@lootlog/meilisearch/index-settings";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
  type SearchOperationFailure,
} from "@lootlog/meilisearch/operation-failure";
import { getMeilisearchErrorCode } from "@lootlog/meilisearch/query-builder";
import { asc, gt, sql } from "drizzle-orm";
import { Effect, Layer, Redacted } from "effect";
import { type EnqueuedTaskPromise, Meilisearch } from "meilisearch";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogDatabase, PgClientLive } from "#src/database/database";
import { catalogNpcTable } from "#src/database/schema";
import {
  catalogIndexes,
  type MonsterFirstSeen,
} from "#src/projection/catalog-indexes";

const ROWS_PER_PAGE = 5_000;

// Meilisearch rejects request bodies over 12.5 MB.
const BATCH_PAYLOAD_LIMIT_BYTES = 8 * 1024 * 1024;

const TASK_TIMEOUT_MS = 30 * 60 * 1000;

const rebuildIndexName = (indexName: string) => `${indexName}_rebuild`;

const completeTask = (operation: string, run: () => EnqueuedTaskPromise) =>
  completeMeilisearchTask(operation, run, { timeout: TASK_TIMEOUT_MS });

/** Whether Meilisearch answered the request, or its task, with this code. */
const hasErrorCode = (error: SearchOperationFailure, code: string) =>
  getMeilisearchErrorCode(error) === code ||
  getMeilisearchErrorCode(error.cause) === code;

const formatDuration = (startedAt: number) =>
  `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;

/** Splits documents into batches under the payload limit. */
const toBatches = (documents: ReadonlyArray<object>) => {
  const batches: object[][] = [];
  let batch: object[] = [];
  let batchBytes = 0;

  for (const document of documents) {
    // One more byte for the separating comma.
    const bytes = Buffer.byteLength(JSON.stringify(document)) + 1;

    if (batch.length > 0 && batchBytes + bytes > BATCH_PAYLOAD_LIMIT_BYTES) {
      batches.push(batch);
      batch = [];
      batchBytes = 0;
    }

    batch.push(document);
    batchBytes += bytes;
  }

  if (batch.length > 0) batches.push(batch);

  return batches;
};

const rebuildProjection = Effect.gen(function* () {
  const config = yield* CatalogConfig;
  const database = yield* CatalogDatabase;
  const startedAt = performance.now();
  const indexes = Object.entries(catalogIndexes);
  const indexNames = indexes.map(([indexName]) => indexName);

  const meilisearch = new Meilisearch({
    host: config.meilisearchHost,
    apiKey: Redacted.value(config.meilisearchApiKey),
  });

  const dropIndex = (indexName: string) =>
    completeTask("catalog.rebuild.drop", () =>
      meilisearch.deleteIndex(indexName),
    ).pipe(
      Effect.asVoid,
      Effect.catchIf(
        (error) => hasErrorCode(error, "index_not_found"),
        () => Effect.void,
      ),
    );

  /** Reads a table page by page in primary key order into a shadow index. */
  const fill = Effect.fnUntraced(function* (
    indexName: string,
    {
      table,
      toDocuments,
    }: (typeof catalogIndexes)[keyof typeof catalogIndexes],
  ) {
    const filledAt = performance.now();

    // Pages cut a monster's identities apart, so its first sighting is read
    // over the whole table first. `min` over the JSON field has no builder.
    const monsterFirstSeen: MonsterFirstSeen =
      table === catalogNpcTable
        ? new Map(
            (yield* database
              .select({
                monsterKey: catalogNpcTable.monsterKey,
                firstSeenAt: sql<
                  string | null
                >`min((${catalogNpcTable.document}->>'firstSeenAt')::bigint)`,
              })
              .from(catalogNpcTable)
              .groupBy(catalogNpcTable.monsterKey)).flatMap(
              ({ monsterKey, firstSeenAt }) =>
                firstSeenAt === null
                  ? []
                  : [[monsterKey, Number(firstSeenAt)] as const],
            ),
          )
        : new Map();

    const index = meilisearch.index(rebuildIndexName(indexName));
    const enqueued: EnqueuedTaskPromise[] = [];
    let after = "";
    let count = 0;

    for (;;) {
      const rows = yield* database
        .select({ uid: table.uid, document: table.document })
        .from(table)
        .where(gt(table.uid, after))
        .orderBy(asc(table.uid))
        .limit(ROWS_PER_PAGE);

      for (const batch of toBatches(
        toDocuments(
          rows.map(({ document }) => document),
          monsterFirstSeen,
        ),
      )) {
        const task = index.addDocuments(batch, {
          primaryKey: SEARCH_INDEX_PRIMARY_KEY,
        });

        yield* attemptMeilisearch("catalog.rebuild.enqueue", () => task);
        enqueued.push(task);
      }

      count += rows.length;

      const last = rows.at(-1);

      if (!last || rows.length < ROWS_PER_PAGE) break;
      after = last.uid;
    }

    yield* Effect.forEach(
      enqueued,
      (task) => completeTask("catalog.rebuild.fill", () => task),
      { discard: true },
    );
    yield* Effect.log(
      `${indexName}: ${count} entries in ${formatDuration(filledAt)}`,
    );
  });

  yield* Effect.log(
    `Rebuilding the catalog indexes at ${config.meilisearchHost}`,
  );

  yield* Effect.forEach(indexNames.map(rebuildIndexName), dropIndex, {
    concurrency: "unbounded",
    discard: true,
  });
  yield* Effect.forEach(
    indexNames.flatMap((indexName) => [indexName, rebuildIndexName(indexName)]),
    (indexName) => ensureIndex(meilisearch, indexName),
    { concurrency: "unbounded", discard: true },
  );
  yield* Effect.forEach(
    indexes,
    ([indexName, { settings }]) =>
      completeTask("catalog.rebuild.settings", () =>
        meilisearch.index(rebuildIndexName(indexName)).updateSettings(settings),
      ),
    { concurrency: "unbounded", discard: true },
  );
  yield* Effect.forEach(
    indexes,
    ([indexName, index]) => fill(indexName, index),
    { concurrency: "unbounded", discard: true },
  );
  yield* completeTask("catalog.rebuild.swap", () =>
    meilisearch.swapIndexes(
      indexNames.map((indexName) => ({
        indexes: [indexName, rebuildIndexName(indexName)],
        rename: false,
      })),
    ),
  );
  yield* Effect.forEach(indexNames.map(rebuildIndexName), dropIndex, {
    concurrency: "unbounded",
    discard: true,
  });
  yield* Effect.log(`Done in ${formatDuration(startedAt)}`);
});

BunRuntime.runMain(
  rebuildProjection.pipe(
    Effect.provide([
      CatalogDatabase.layer.pipe(Layer.provide(PgClientLive)),
      CatalogConfig.layer,
    ]),
  ),
);
