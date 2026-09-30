import {
  itemSnapshotTable,
  lootItemTable,
  lootTable,
} from "@lootlog/api/database/schema";
import { asc, eq, sql } from "drizzle-orm";
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
      })
      .from(lootItemTable)
      .innerJoin(lootTable, eq(lootTable.id, lootItemTable.lootId))
      .groupBy(lootItemTable.itemSnapshotId, lootTable.world),
  );

  return database
    .with(snapshotWorlds)
    .select({
      id: itemSnapshotTable.itemId,
      gameVersion: itemSnapshotTable.gameVersion,
      name: itemSnapshotTable.name,
      icon: itemSnapshotTable.icon,
      stat: itemSnapshotTable.statRaw,
      lvl: itemSnapshotTable.lvl,
      rarity: itemSnapshotTable.rarity,
      type: itemSnapshotTable.itemType,
      worlds: sql<string[]>`array_agg(${snapshotWorlds.world})`,
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
