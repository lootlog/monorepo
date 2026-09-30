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
 * Every looted item snapshot with the worlds it dropped in, oldest first, so
 * merging rows into catalog documents keeps the newest revision of each name.
 */
export const buildItemSeedQuery = (database: SeedDatabase) => {
  // Reduce repeated loot links before reading the larger snapshot records.
  const snapshotWorlds = database.$with("snapshot_worlds").as(
    database
      .select({
        itemSnapshotId: lootItemTable.itemSnapshotId,
        world: lootTable.world,
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
    .orderBy(asc(itemSnapshotTable.createdAt), asc(itemSnapshotTable.id));
};
