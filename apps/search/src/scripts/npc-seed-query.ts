import {
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "@lootlog/api/database/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/bun-sql";

type SeedDatabase = Pick<
  ReturnType<typeof drizzle>,
  "$with" | "select" | "with"
>;

export const buildNpcSeedQuery = (database: SeedDatabase) => {
  // Reduce repeated loot links before reading the larger snapshot records.
  const snapshotWorlds = database.$with("snapshot_worlds").as(
    database
      .select({
        npcSnapshotId: lootNpcTable.npcSnapshotId,
        world: lootTable.world,
      })
      .from(lootNpcTable)
      .innerJoin(lootTable, eq(lootTable.id, lootNpcTable.lootId))
      .groupBy(lootNpcTable.npcSnapshotId, lootTable.world),
  );

  const margonemType = sql<number>`coalesce(${npcSnapshotTable.margonemType}, 0)`;

  // Retain every hashed revision and only the newest row for each legacy UID.
  const identity = [
    npcSnapshotTable.npcId,
    margonemType,
    snapshotWorlds.world,
    npcSnapshotTable.snapshotHash,
  ];

  return database
    .with(snapshotWorlds)
    .selectDistinctOn(identity, {
      id: npcSnapshotTable.npcId,
      name: npcSnapshotTable.name,
      type: npcSnapshotTable.type,
      prof: npcSnapshotTable.prof,
      icon: npcSnapshotTable.icon,
      lvl: npcSnapshotTable.lvl,
      wt: npcSnapshotTable.wt,
      margonemType,
      world: snapshotWorlds.world,
      snapshotHash: npcSnapshotTable.snapshotHash,
    })
    .from(snapshotWorlds)
    .innerJoin(
      npcSnapshotTable,
      eq(npcSnapshotTable.id, snapshotWorlds.npcSnapshotId),
    )
    .orderBy(
      ...identity,
      desc(npcSnapshotTable.createdAt),
      desc(npcSnapshotTable.id),
    );
};
