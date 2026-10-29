import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "@lootlog/api/database/schema";
import { DROP_SOURCE_BOSS_TYPES } from "@lootlog/domain/npc-type";
import { asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/bun-sql";

type SeedDatabase = Pick<
  ReturnType<typeof drizzle>,
  "$with" | "select" | "with"
>;

/**
 * Every looted item snapshot with the worlds it dropped in, ordered by its
 * latest loot link, so merging rows into catalog documents keeps the revision
 * most recently observed for each name, as live indexing does. A revision can
 * be observed again after a newer one, so its creation time is not enough.
 */
export const buildItemSeedQuery = (database: SeedDatabase) => {
  // Reduce repeated loot links before reading the larger snapshot records.
  const snapshotWorlds = database.$with("snapshot_worlds").as(
    database
      .select({
        itemSnapshotId: lootItemTable.itemSnapshotId,
        world: lootTable.world,
        latestLinkId: sql<number>`max(${lootItemTable.id})`.as(
          "latest_link_id",
        ),
        // Epoch milliseconds; `extract` reads the stored UTC time as UTC.
        firstSeenAt:
          sql<number>`(extract(epoch from min(${lootTable.createdAt})) * 1000)::float8`.as(
            "first_seen_at",
          ),
      })
      .from(lootItemTable)
      .innerJoin(lootTable, eq(lootTable.id, lootItemTable.lootId))
      .groupBy(lootItemTable.itemSnapshotId, lootTable.world),
  );

  return database
    .with(snapshotWorlds)
    .select({
      snapshotId: itemSnapshotTable.id,
      id: itemSnapshotTable.itemId,
      gameVersion: itemSnapshotTable.gameVersion,
      name: itemSnapshotTable.name,
      icon: itemSnapshotTable.icon,
      stat: itemSnapshotTable.statRaw,
      lvl: itemSnapshotTable.lvl,
      rarity: itemSnapshotTable.rarity,
      type: itemSnapshotTable.itemType,
      worlds: sql<string[]>`array_agg(${snapshotWorlds.world})`,
      firstSeenAt: sql<number>`min(${snapshotWorlds.firstSeenAt})`,
    })
    .from(snapshotWorlds)
    .innerJoin(
      itemSnapshotTable,
      eq(itemSnapshotTable.id, snapshotWorlds.itemSnapshotId),
    )
    .groupBy(itemSnapshotTable.id)
    .orderBy(
      sql`max(${snapshotWorlds.latestLinkId})`,
      asc(itemSnapshotTable.id),
    );
};

/**
 * Every item revision with each NPC it dropped from, by the rule live
 * indexing applies: fights only, from their only NPC or the only boss among
 * a group (`DROP_SOURCE_BOSS_TYPES`).
 */
export const buildItemDropSourceQuery = (database: SeedDatabase) => {
  const isBoss = inArray(npcSnapshotTable.type, [...DROP_SOURCE_BOSS_TYPES]);

  const lootSources = database.$with("loot_sources").as(
    database
      .select({
        lootId: lootNpcTable.lootId,
        // Escorts share a group fight; only a sole boss names its drops.
        npcSnapshotId: sql<number | null>`case
          when count(*) = 1 then min(${lootNpcTable.npcSnapshotId})
          when count(*) filter (where ${isBoss}) = 1
            then min(${lootNpcTable.npcSnapshotId}) filter (where ${isBoss})
        end`.as("npc_snapshot_id"),
      })
      .from(lootNpcTable)
      .innerJoin(lootTable, eq(lootTable.id, lootNpcTable.lootId))
      .innerJoin(
        npcSnapshotTable,
        eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
      )
      .where(eq(lootTable.source, "FIGHT"))
      .groupBy(lootNpcTable.lootId),
  );

  const itemSources = database.$with("item_sources").as(
    database
      .with(lootSources)
      .selectDistinct({
        itemSnapshotId: lootItemTable.itemSnapshotId,
        npcSnapshotId: lootSources.npcSnapshotId,
      })
      .from(lootItemTable)
      .innerJoin(lootSources, eq(lootSources.lootId, lootItemTable.lootId))
      .where(isNotNull(lootSources.npcSnapshotId)),
  );

  return database
    .with(itemSources)
    .select({
      itemSnapshotId: itemSources.itemSnapshotId,
      id: npcSnapshotTable.npcId,
      identityNamespace: npcSnapshotTable.identityNamespace,
      name: npcSnapshotTable.name,
      lvl: npcSnapshotTable.lvl,
      icon: npcSnapshotTable.icon,
      type: npcSnapshotTable.type,
      margonemType: npcSnapshotTable.margonemType,
      gameVersion: npcSnapshotTable.gameVersion,
    })
    .from(itemSources)
    .innerJoin(
      npcSnapshotTable,
      eq(npcSnapshotTable.id, itemSources.npcSnapshotId),
    );
};
