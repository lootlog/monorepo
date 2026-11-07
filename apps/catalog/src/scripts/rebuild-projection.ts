/**
 * Rebuilds the catalog's search indexes from its database.
 *
 * Each index is rebuilt in a shadow index (`<name>_rebuild`) with the
 * service settings, filled from the database in large batches, then every
 * shadow index is swapped into place in one atomic task, so searches never
 * see a half-built index. Batches are enqueued without waiting, so
 * Meilisearch merges them into a few indexing runs.
 *
 * The consumers keep writing to the live indexes while this runs; an entry
 * they change after its page was read is replaced by the older copy until
 * its next change. Run it at a quiet hour.
 *
 * Usage: `bun run projection:rebuild` in `apps/catalog` with
 * `POSTGRESQL_CONNECTION_URI`, `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` set.
 */
import { SQL } from "bun";
import { SEARCH_INDEX_PRIMARY_KEY } from "@lootlog/meilisearch/index-settings";
import { getMeilisearchErrorCode } from "@lootlog/meilisearch/query-builder";
import { Config, Effect, Redacted } from "effect";
import { Meilisearch, type EnqueuedTask, type Task } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";
import { catalogIndexSettings } from "#src/projection/index-settings";

const ROWS_PER_PAGE = 5_000;

// Meilisearch rejects request bodies over 12.5 MB.
const BATCH_PAYLOAD_LIMIT_BYTES = 8 * 1024 * 1024;

const TASK_POLL_INTERVAL_MS = 500;

const TASK_TIMEOUT_MS = 30 * 60 * 1000;

const rebuildIndexName = (indexName: string) => `${indexName}_rebuild`;

const config = await Effect.runPromise(
  Config.all({
    databaseUrl: Config.Redacted("POSTGRESQL_CONNECTION_URI"),
    meilisearchHost: Config.String("MEILISEARCH_HOST"),
    meilisearchApiKey: Config.Redacted("MEILISEARCH_API_KEY"),
  }),
);

const sql = new SQL({ url: Redacted.value(config.databaseUrl) });

const meilisearch = new Meilisearch({
  host: config.meilisearchHost,
  apiKey: Redacted.value(config.meilisearchApiKey),
});

const formatDuration = (startedAt: number) =>
  `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;

const assertSucceeded = (tasks: ReadonlyArray<Task>) => {
  const failed = tasks.filter((task) => task.status !== "succeeded");

  if (failed.length > 0) {
    const [first] = failed;

    throw new Error(
      `${failed.length} Meilisearch task(s) failed, first: ${first?.error?.message ?? first?.status}`,
    );
  }
};

const waitForTasks = async (enqueued: ReadonlyArray<EnqueuedTask>) =>
  assertSucceeded(
    await meilisearch.tasks.waitForTasks(enqueued, {
      interval: TASK_POLL_INTERVAL_MS,
      timeout: TASK_TIMEOUT_MS,
    }),
  );

const ignoring =
  (code: string) =>
  async (run: () => Promise<Task>): Promise<void> => {
    try {
      const task = await run();

      if (task.status === "failed" && task.error?.code !== code) {
        throw task.error;
      }
    } catch (error) {
      if (getMeilisearchErrorCode(error) !== code) throw error;
    }
  };

const waitOptions = {
  interval: TASK_POLL_INTERVAL_MS,
  timeout: TASK_TIMEOUT_MS,
};

const dropIndex = (indexName: string) =>
  ignoring("index_not_found")(() =>
    meilisearch.deleteIndex(indexName).waitTask(waitOptions),
  );

const createIndex = (indexName: string) =>
  ignoring("index_already_exists")(() =>
    meilisearch
      .createIndex(indexName, { primaryKey: SEARCH_INDEX_PRIMARY_KEY })
      .waitTask(waitOptions),
  );

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

/** Reads a table page by page in primary key order into a shadow index. */
const rebuild = async (indexName: string, table: string) => {
  const startedAt = performance.now();
  const index = meilisearch.index(rebuildIndexName(indexName));
  const enqueued: EnqueuedTask[] = [];
  let after = "";
  let count = 0;

  for (;;) {
    const rows = await sql<Array<{ uid: string; document: object }>>`
      SELECT uid, document FROM ${sql(table)}
      WHERE uid > ${after}
      ORDER BY uid
      LIMIT ${ROWS_PER_PAGE}
    `;

    for (const batch of toBatches(rows.map(({ document }) => document))) {
      enqueued.push(
        await index.addDocuments(batch, {
          primaryKey: SEARCH_INDEX_PRIMARY_KEY,
        }),
      );
    }

    count += rows.length;

    const last = rows.at(-1);

    if (!last || rows.length < ROWS_PER_PAGE) break;
    after = last.uid;
  }

  await waitForTasks(enqueued);
  console.log(`${indexName}: ${count} entries in ${formatDuration(startedAt)}`);
};

const main = async () => {
  const startedAt = performance.now();
  const indexNames = Object.keys(catalogIndexSettings);

  console.log(`Rebuilding the catalog indexes at ${config.meilisearchHost}`);

  try {
    await Promise.all(indexNames.map(rebuildIndexName).map(dropIndex));
    await Promise.all(
      indexNames.flatMap((indexName) => [
        createIndex(indexName),
        createIndex(rebuildIndexName(indexName)),
      ]),
    );
    await waitForTasks(
      await Promise.all(
        Object.entries(catalogIndexSettings).map(([indexName, settings]) =>
          meilisearch
            .index(rebuildIndexName(indexName))
            .updateSettings(settings),
        ),
      ),
    );

    await Promise.all([
      rebuild(ITEMS_INDEX, "CatalogItem"),
      rebuild(NPCS_INDEX, "CatalogNpc"),
    ]);

    await waitForTasks([
      await meilisearch.swapIndexes(
        indexNames.map((indexName) => ({
          indexes: [indexName, rebuildIndexName(indexName)],
          rename: false,
        })),
      ),
    ]);
    await Promise.all(indexNames.map(rebuildIndexName).map(dropIndex));

    console.log(`Done in ${formatDuration(startedAt)}`);
  } finally {
    await sql.close();
  }
};

await main();
