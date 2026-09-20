/**
 * Rebuilds the Meilisearch indexes from the API database.
 *
 * Each index is rebuilt in a shadow index (`<name>_rebuild`) that receives the
 * service settings and the latest snapshot of every NPC, player and item,
 * loaded in one query per entity and pushed in large batches. Batches are
 * enqueued without waiting, so Meilisearch merges them into a few indexing
 * runs; the script waits once, then swaps the shadow indexes into place in a
 * single atomic task, so searches never see a half-built index. The three
 * entities run concurrently.
 *
 * The queue consumer keeps writing to the live indexes while this runs;
 * events consumed during the rebuild are replaced by the database state read
 * at query time. That state already includes everything the API accepted
 * before the query ran, so the window is the rebuild duration; run it at a
 * quiet hour or replay the queue afterwards.
 *
 * Usage: `bun run seed` in `apps/search` with `POSTGRESQL_CONNECTION_URI`,
 * `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` set.
 */
import { SQL } from "bun";
import { Config, Effect, Redacted } from "effect";
import { chunk } from "es-toolkit";
import { Meilisearch, type EnqueuedTask, type Task } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/search-index";
import { toItemDocuments } from "#src/items/items.service";
import {
  SEARCH_INDEX_PRIMARY_KEY,
  searchIndexSettings,
} from "#src/meilisearch/meilisearch-indexes.service";
import { getMeilisearchErrorCode } from "#src/meilisearch/query-builder";
import { NPCS_INDEX } from "#src/npcs/search-index";
import { toNpcDocument } from "#src/npcs/npcs.service";
import { PLAYERS_INDEX } from "#src/players/search-index";
import { toPlayerDocument } from "#src/players/players.service";

const DOCUMENTS_PER_BATCH = 10_000;

const TASK_POLL_INTERVAL_MS = 500;

const TASK_TIMEOUT_MS = 30 * 60 * 1000;

const REBUILD_SUFFIX = "_rebuild";

const rebuildIndexName = (indexName: string) => `${indexName}${REBUILD_SUFFIX}`;

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

type NpcRow = {
  id: number;
  name: string;
  type: string | null;
  prof: string | null;
  icon: string | null;
  lvl: number | null;
  wt: number | null;
  margonemType: number;
  world: string;
};

type PlayerRow = {
  world: string;
  accountId: number;
  characterId: number;
  name: string;
  prof: string | null;
  icon: string | null;
  lvl: number | null;
};

type ItemRow = {
  itemId: number;
  name: string;
  icon: string;
  statRaw: string;
  lvl: number | null;
  rarity: string | null;
  itemType: string | null;
  worlds: string[];
};

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

const waitForTasks = async (enqueued: ReadonlyArray<EnqueuedTask>) => {
  const tasks = await meilisearch.tasks.waitForTasks(enqueued, {
    interval: TASK_POLL_INTERVAL_MS,
    timeout: TASK_TIMEOUT_MS,
  });

  assertSucceeded(tasks);
};

const dropIndex = async (indexName: string) => {
  try {
    const task = await meilisearch
      .deleteIndex(indexName)
      .waitTask({ interval: TASK_POLL_INTERVAL_MS, timeout: TASK_TIMEOUT_MS });

    if (task.status === "failed" && task.error?.code !== "index_not_found") {
      throw task.error;
    }
  } catch (error) {
    if (getMeilisearchErrorCode(error) !== "index_not_found") throw error;
  }
};

const createIndex = async (indexName: string) => {
  try {
    const task = await meilisearch
      .createIndex(indexName, { primaryKey: SEARCH_INDEX_PRIMARY_KEY })
      .waitTask({ interval: TASK_POLL_INTERVAL_MS, timeout: TASK_TIMEOUT_MS });

    if (
      task.status === "failed" &&
      task.error?.code !== "index_already_exists"
    ) {
      throw task.error;
    }
  } catch (error) {
    if (getMeilisearchErrorCode(error) !== "index_already_exists") throw error;
  }
};

/**
 * Shadow indexes start empty with the service settings, so Meilisearch
 * indexes each batch once. The live indexes must exist for the final swap.
 */
const prepareRebuildIndexes = async () => {
  const startedAt = performance.now();
  const indexNames = Object.keys(searchIndexSettings);

  await Promise.all(indexNames.map(rebuildIndexName).map(dropIndex));
  await Promise.all(
    indexNames.flatMap((indexName) => [
      createIndex(indexName),
      createIndex(rebuildIndexName(indexName)),
    ]),
  );

  await waitForTasks(
    await Promise.all(
      Object.entries(searchIndexSettings).map(([indexName, settings]) =>
        meilisearch.index(rebuildIndexName(indexName)).updateSettings(settings),
      ),
    ),
  );

  console.log(`Shadow indexes prepared in ${formatDuration(startedAt)}`);
};

/** One atomic swap publishes every rebuilt index; the old data is dropped. */
const publishRebuildIndexes = async () => {
  const startedAt = performance.now();
  const indexNames = Object.keys(searchIndexSettings);

  await waitForTasks([
    await meilisearch.swapIndexes(
      indexNames.map((indexName) => ({
        indexes: [indexName, rebuildIndexName(indexName)],
        rename: false,
      })),
    ),
  ]);

  await Promise.all(indexNames.map(rebuildIndexName).map(dropIndex));

  console.log(`Indexes swapped in ${formatDuration(startedAt)}`);
};

/** Enqueues every batch first; Meilisearch merges queued batches of one index. */
const indexDocuments = async <Document extends { uid: string }>(
  indexName: string,
  documents: ReadonlyArray<Document>,
  loadedIn: string,
) => {
  const startedAt = performance.now();
  const index = meilisearch.index<Document>(rebuildIndexName(indexName));
  const enqueued: EnqueuedTask[] = [];

  for (const batch of chunk([...documents], DOCUMENTS_PER_BATCH)) {
    enqueued.push(
      await index.addDocuments(batch, { primaryKey: SEARCH_INDEX_PRIMARY_KEY }),
    );
  }

  await waitForTasks(enqueued);

  console.log(
    `${indexName}: ${documents.length} documents, loaded in ${loadedIn}, indexed in ${formatDuration(startedAt)}`,
  );
};

const seedNpcs = async () => {
  const startedAt = performance.now();

  // Loot rows outnumber snapshots a thousandfold, so reduce them to distinct
  // (snapshot, world) pairs by hashing before touching snapshot columns. The
  // uid is (npc id, margonem type, world); take the newest snapshot of each.
  const rows = await sql<NpcRow[]>`
    WITH snapshot_worlds AS (
      SELECT ln."npcSnapshotId", l."world"
      FROM "LootNpc" ln
      INNER JOIN "Loot" l ON l."id" = ln."lootId"
      GROUP BY ln."npcSnapshotId", l."world"
    )
    SELECT DISTINCT ON (ns."npcId", COALESCE(ns."margonemType", 0), sw."world")
      ns."npcId" AS "id",
      ns."name",
      ns."type",
      ns."prof",
      ns."icon",
      ns."lvl",
      ns."wt",
      COALESCE(ns."margonemType", 0) AS "margonemType",
      sw."world"
    FROM snapshot_worlds sw
    INNER JOIN "NpcSnapshot" ns ON ns."id" = sw."npcSnapshotId"
    ORDER BY ns."npcId", COALESCE(ns."margonemType", 0), sw."world",
      ns."createdAt" DESC, ns."id" DESC
  `;

  const documents = rows.map((npc) =>
    toNpcDocument({
      id: npc.id,
      name: npc.name,
      // The stored type is advisory; the document builder derives it from wt.
      type: npc.type ?? "",
      prof: npc.prof,
      icon: npc.icon ?? "",
      lvl: npc.lvl ?? 0,
      wt: npc.wt ?? 0,
      margonemType: npc.margonemType,
      world: npc.world,
    }),
  );

  await indexDocuments(NPCS_INDEX, documents, formatDuration(startedAt));
};

const seedPlayers = async () => {
  const startedAt = performance.now();

  // Live indexing only sees loot participants, so map-capture snapshots stay
  // out. Levels only rise, so the highest level recorded with a character's
  // newest participating snapshot is its current one; one hash aggregate over
  // LootPlayer beats a lookup per snapshot by an order of magnitude.
  const rows = await sql<PlayerRow[]>`
    WITH levels AS (
      SELECT lp."playerSnapshotId", MAX(lp."lvl") AS "lvl"
      FROM "LootPlayer" lp
      GROUP BY lp."playerSnapshotId"
    )
    SELECT DISTINCT ON (ps."world", ps."accountId", ps."characterId")
      ps."world",
      ps."accountId",
      ps."characterId",
      ps."name",
      ps."prof",
      ps."icon",
      levels."lvl"
    FROM "PlayerSnapshot" ps
    INNER JOIN levels ON levels."playerSnapshotId" = ps."id"
    ORDER BY ps."world", ps."accountId", ps."characterId",
      ps."createdAt" DESC, ps."id" DESC
  `;

  const documents = rows.map((player) =>
    toPlayerDocument({
      id: `${player.characterId}${player.accountId}`,
      name: player.name,
      lvl: player.lvl ?? 0,
      prof: player.prof ?? "",
      icon: player.icon ?? "",
      characterId: player.characterId,
      accountId: player.accountId,
      world: player.world,
    }),
  );

  await indexDocuments(PLAYERS_INDEX, documents, formatDuration(startedAt));
};

const seedItems = async () => {
  const startedAt = performance.now();

  // One document per item id: its newest snapshot plus every world it dropped
  // in. Loot rows reduce to distinct (snapshot, world) pairs first.
  const rows = await sql<ItemRow[]>`
    WITH snapshot_worlds AS (
      SELECT li."itemSnapshotId", l."world"
      FROM "LootItem" li
      INNER JOIN "Loot" l ON l."id" = li."lootId"
      GROUP BY li."itemSnapshotId", l."world"
    ),
    latest_items AS (
      SELECT DISTINCT ON (item_s."itemId")
        item_s."itemId",
        item_s."name",
        item_s."icon",
        item_s."statRaw",
        item_s."lvl",
        item_s."rarity",
        item_s."itemType"
      FROM "ItemSnapshot" item_s
      WHERE EXISTS (
        SELECT 1 FROM snapshot_worlds sw WHERE sw."itemSnapshotId" = item_s."id"
      )
      ORDER BY item_s."itemId", item_s."createdAt" DESC, item_s."id" DESC
    ),
    item_worlds AS (
      SELECT item_s."itemId", ARRAY_AGG(DISTINCT sw."world") AS "worlds"
      FROM snapshot_worlds sw
      INNER JOIN "ItemSnapshot" item_s ON item_s."id" = sw."itemSnapshotId"
      GROUP BY item_s."itemId"
    )
    SELECT latest_items.*, item_worlds."worlds"
    FROM latest_items
    INNER JOIN item_worlds ON item_worlds."itemId" = latest_items."itemId"
  `;

  const documents = toItemDocuments(
    rows.map((item) => ({
      id: item.itemId,
      name: item.name,
      icon: item.icon,
      stat: item.statRaw,
      lvl: item.lvl ?? 0,
      rarity: item.rarity,
      type: item.itemType,
      worlds: item.worlds,
    })),
  );

  await indexDocuments(ITEMS_INDEX, documents, formatDuration(startedAt));
};

const main = async () => {
  const startedAt = performance.now();
  console.log(`Seeding Meilisearch at ${config.meilisearchHost}`);

  try {
    await prepareRebuildIndexes();
    await Promise.all([seedNpcs(), seedPlayers(), seedItems()]);
    await publishRebuildIndexes();
    console.log(`Done in ${formatDuration(startedAt)}`);
  } finally {
    await sql.close();
  }
};

await main();
