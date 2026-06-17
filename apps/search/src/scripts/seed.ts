/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import { NpcTypeEnum, getNpcTypeByWt } from "@lootlog/types";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../apps/api/src/generated/prisma/client";
import { Meilisearch } from "meilisearch";
import "dotenv/config";
import { z } from "zod";
import { ITEMS_INDEX } from "../items/constants/meilisearch";
import { createItemSearchFields } from "../items/utils/create-item-search-fields";
import { getMeilisearchErrorCode } from "../meilisearch/meilisearch.utils";
import { NPCS_INDEX } from "../npcs/constants/meilisearch";
import { PLAYERS_INDEX } from "../players/constants/meilisearch";

const configSchema = z.object({
  MEILISEARCH_HOST: z.string(),
  MEILISEARCH_API_KEY: z.string(),
  POSTGRESQL_CONNECTION_URI: z.string(),
});

const config = configSchema.parse(process.env);

const prismaAdapter = new PrismaPg({
  connectionString: config.POSTGRESQL_CONNECTION_URI,
});

const prisma = new PrismaClient({
  adapter: prismaAdapter,
});

const meilisearch = new Meilisearch({
  host: config.MEILISEARCH_HOST,
  apiKey: config.MEILISEARCH_API_KEY,
});

const BATCH_SIZE = 1000;

const indexPrimaryKeys = {
  [NPCS_INDEX]: "uid",
  [PLAYERS_INDEX]: "uid",
  [ITEMS_INDEX]: "uid",
} as const;

type NpcSnapshotWithWorld = {
  id: number;
  npcId: number;
  name: string;
  type: string | null;
  lvl: number | null;
  icon: string | null;
  wt: number | null;
  margonemType: number | null;
  prof: string | null;
  world: string;
};

type PlayerSnapshotLatest = {
  id: number;
  world: string;
  accountId: number;
  characterId: number;
  name: string;
  prof: string | null;
  icon: string | null;
};

type ItemSnapshotWithWorld = {
  id: number;
  itemId: number;
  name: string;
  icon: string;
  statRaw: string;
  lvl: number | null;
  rarity: string | null;
  itemType: string | null;
  worlds: string[];
};

async function waitForTask(taskUid: number) {
  const task = await meilisearch.tasks.waitForTask(taskUid);

  if (task.status === "failed") {
    throw new Error(`Task ${taskUid} failed: ${task.error.message}`);
  }
}

async function deleteIndexes() {
  console.log("Deleting existing indexes...");

  try {
    const deleteNpcs = await meilisearch.deleteIndex(NPCS_INDEX);
    await waitForTask(deleteNpcs.taskUid);
    console.log(`Deleted index: ${NPCS_INDEX}`);
  } catch (error) {
    if (getMeilisearchErrorCode(error) !== "index_not_found") {
      throw error;
    }

    console.log(`Index ${NPCS_INDEX} does not exist, skipping.`);
  }

  try {
    const deletePlayers = await meilisearch.deleteIndex(PLAYERS_INDEX);
    await waitForTask(deletePlayers.taskUid);
    console.log(`Deleted index: ${PLAYERS_INDEX}`);
  } catch (error) {
    if (getMeilisearchErrorCode(error) !== "index_not_found") {
      throw error;
    }

    console.log(`Index ${PLAYERS_INDEX} does not exist, skipping.`);
  }

  try {
    const deleteItems = await meilisearch.deleteIndex(ITEMS_INDEX);
    await waitForTask(deleteItems.taskUid);
    console.log(`Deleted index: ${ITEMS_INDEX}`);
  } catch (error) {
    if (getMeilisearchErrorCode(error) !== "index_not_found") {
      throw error;
    }

    console.log(`Index ${ITEMS_INDEX} does not exist, skipping.`);
  }

  console.log("Indexes deleted.");
}

async function setupIndexes() {
  console.log("Setting up Meilisearch indexes...");

  for (const [indexName, primaryKey] of Object.entries(indexPrimaryKeys)) {
    const createIndexTask = await meilisearch.createIndex(indexName, {
      primaryKey,
    });
    await waitForTask(createIndexTask.taskUid);
    console.log(`Created index: ${indexName}`);
  }

  const npcsIndex = meilisearch.index(NPCS_INDEX);
  const npcsFilterTask = await npcsIndex.updateFilterableAttributes([
    "name",
    "type",
    "world",
  ]);
  await waitForTask(npcsFilterTask.taskUid);

  const playersIndex = meilisearch.index(PLAYERS_INDEX);
  const playersFilterTask = await playersIndex.updateFilterableAttributes([
    "name",
    "world",
  ]);
  await waitForTask(playersFilterTask.taskUid);

  const itemsIndex = meilisearch.index(ITEMS_INDEX);
  const itemsFilterTask = await itemsIndex.updateFilterableAttributes([
    "world",
    "worlds",
    "type",
    "rarity",
    "lvl",
    "stats",
    "numericStats",
    "requiredProfessions",
    "statsKeys",
  ]);
  await waitForTask(itemsFilterTask.taskUid);
  const itemsSearchTask = await itemsIndex.updateSearchableAttributes([
    "name",
    "stat",
  ]);
  await waitForTask(itemsSearchTask.taskUid);
  const itemsSortTask = await itemsIndex.updateSortableAttributes([
    "name",
    "lvl",
    "rarity",
    "type",
  ]);
  await waitForTask(itemsSortTask.taskUid);
  const itemsDistinctTask = await itemsIndex.updateDistinctAttribute("id");
  await waitForTask(itemsDistinctTask.taskUid);

  console.log("Indexes configured.");
}

async function seedNpcs() {
  console.log("\n--- Seeding NPCs ---");

  // Get the latest snapshot for each unique npcId
  // NpcSnapshot doesn't have world, so we need to join with Loot through LootNpc
  const latestNpcSnapshots = await prisma.$queryRaw<NpcSnapshotWithWorld[]>`
    SELECT DISTINCT ON (ns."npcId", ns."type", l."world")
      ns."id",
      ns."npcId",
      ns."name",
      ns."type",
      ns."lvl",
      ns."icon",
      ns."wt",
      ns."margonemType",
      ns."prof",
      l."world"
    FROM "NpcSnapshot" ns
    INNER JOIN "LootNpc" ln ON ln."npcSnapshotId" = ns."id"
    INNER JOIN "Loot" l ON l."id" = ln."lootId"
    ORDER BY ns."npcId", ns."type", l."world", ns."createdAt" DESC
  `;

  console.log(`Found ${latestNpcSnapshots.length} unique NPC snapshots`);

  const npcsIndex = meilisearch.index(NPCS_INDEX);

  for (let i = 0; i < latestNpcSnapshots.length; i += BATCH_SIZE) {
    const batch = latestNpcSnapshots.slice(i, i + BATCH_SIZE);

    // Map to the same format as IndexNpcsDto used in npcs.service.ts
    const npcsForIndex = batch.map((npc: NpcSnapshotWithWorld) => ({
      id: npc.npcId,
      name: npc.name,
      type: getNpcTypeByWt(
        NpcTypeEnum,
        npc.wt ?? 0,
        npc.prof ?? "",
        npc.margonemType ?? undefined,
      ),
      lvl: npc.lvl ?? 0,
      icon: npc.icon ?? "",
      wt: npc.wt ?? 0,
      margonemType: npc.margonemType ?? 0,
      prof: npc.prof ?? "",
      world: npc.world,
      uid: `${npc.npcId}_${npc.margonemType ?? 0}_${npc.world}`,
    }));

    const task = await npcsIndex.addDocuments(npcsForIndex, {
      primaryKey: "uid",
    });
    await waitForTask(task.taskUid);
    console.log(
      `Indexed NPCs batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(latestNpcSnapshots.length / BATCH_SIZE)}`,
    );
  }

  console.log(`NPCs seeding completed. Total: ${latestNpcSnapshots.length}`);
}

async function seedPlayers() {
  console.log("\n--- Seeding Players ---");

  // PlayerSnapshot already has world, get the latest snapshot for each unique player per world
  const latestPlayerSnapshots = await prisma.$queryRaw<PlayerSnapshotLatest[]>`
    SELECT DISTINCT ON (ps."world", ps."accountId", ps."characterId")
      ps."id",
      ps."world",
      ps."accountId",
      ps."characterId",
      ps."name",
      ps."prof",
      ps."icon"
    FROM "PlayerSnapshot" ps
    ORDER BY ps."world", ps."accountId", ps."characterId", ps."createdAt" DESC
  `;

  console.log(`Found ${latestPlayerSnapshots.length} unique Player snapshots`);

  const playersIndex = meilisearch.index(PLAYERS_INDEX);

  for (let i = 0; i < latestPlayerSnapshots.length; i += BATCH_SIZE) {
    const batch = latestPlayerSnapshots
      .slice(i, i + BATCH_SIZE)
      .filter((player) => player.accountId !== null && player.accountId !== 0);

    // Map to the same format as IndexPlayersDto used in players.service.ts
    // In API mapPlayers: id = `${characterId}${accountId}` (no underscore)
    // In search service: uid = `${player.id}_${player.name}_${player.world}`
    const playersForIndex = batch.map((player: PlayerSnapshotLatest) => ({
      id: `${player.characterId}${player.accountId}`,
      name: player.name,
      lvl: 0, // lvl is in LootPlayer, not PlayerSnapshot
      prof: player.prof ?? "",
      icon: player.icon ?? "",
      characterId: player.characterId,
      accountId: player.accountId,
      world: player.world,
      uid: `${player.characterId}${player.accountId}_${player.name.replace(/[^a-zA-Z0-9_-]/g, "")}_${player.world}`,
    }));

    const task = await playersIndex.addDocuments(playersForIndex, {
      primaryKey: "uid",
    });
    await waitForTask(task.taskUid);
    console.log(
      `Indexed Players batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(latestPlayerSnapshots.length / BATCH_SIZE)}`,
    );
  }

  console.log(
    `Players seeding completed. Total: ${latestPlayerSnapshots.length}`,
  );
}

async function seedItems() {
  console.log("\n--- Seeding Items ---");

  // ItemSnapshot doesn't have world, so we need to join with Loot through LootItem
  // Get the latest snapshot for each unique itemId and aggregate worlds separately
  const latestItemSnapshots = await prisma.$queryRaw<ItemSnapshotWithWorld[]>`
    WITH latest_items AS (
      SELECT DISTINCT ON (item_s."itemId")
        item_s."id",
        item_s."itemId",
        item_s."name",
        item_s."icon",
        item_s."statRaw",
        item_s."lvl",
        item_s."rarity",
        item_s."itemType"
      FROM "ItemSnapshot" item_s
      INNER JOIN "LootItem" li ON li."itemSnapshotId" = item_s."id"
      ORDER BY item_s."itemId", item_s."createdAt" DESC, item_s."id" DESC
    ),
    item_worlds AS (
      SELECT
        item_s."itemId",
        ARRAY_AGG(DISTINCT l."world" ORDER BY l."world") AS worlds
      FROM "ItemSnapshot" item_s
      INNER JOIN "LootItem" li ON li."itemSnapshotId" = item_s."id"
      INNER JOIN "Loot" l ON l."id" = li."lootId"
      GROUP BY item_s."itemId"
    )
    SELECT
      latest_items."id",
      latest_items."itemId",
      latest_items."name",
      latest_items."icon",
      latest_items."statRaw",
      latest_items."lvl",
      latest_items."rarity",
      latest_items."itemType",
      item_worlds.worlds
    FROM latest_items
    INNER JOIN item_worlds ON item_worlds."itemId" = latest_items."itemId"
  `;

  console.log(`Found ${latestItemSnapshots.length} unique Item snapshots`);

  const itemsIndex = meilisearch.index(ITEMS_INDEX);

  for (let i = 0; i < latestItemSnapshots.length; i += BATCH_SIZE) {
    const batch = latestItemSnapshots.slice(i, i + BATCH_SIZE);

    const itemsForIndex = batch.map((item: ItemSnapshotWithWorld) => ({
      id: item.itemId,
      name: item.name,
      icon: item.icon,
      stat: item.statRaw,
      ...createItemSearchFields(item.statRaw),
      lvl: item.lvl ?? 0,
      rarity: item.rarity,
      type: item.itemType,
      worlds: item.worlds,
      uid: String(item.itemId),
    }));

    const task = await itemsIndex.addDocuments(itemsForIndex, {
      primaryKey: "uid",
    });
    await waitForTask(task.taskUid);
    console.log(
      `Indexed Items batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(latestItemSnapshots.length / BATCH_SIZE)}`,
    );
  }

  console.log(`Items seeding completed. Total: ${latestItemSnapshots.length}`);
}

async function main() {
  console.log("Starting Meilisearch seeder...\n");
  console.log(`Meilisearch host: ${config.MEILISEARCH_HOST}`);
  console.log("PostgreSQL configured\n");

  try {
    await deleteIndexes();
    await setupIndexes();
    await seedNpcs();
    await seedPlayers();
    await seedItems();

    console.log("\n✅ Seeding completed successfully!");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
