import {
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { asc, eq, sql } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";

type ReplayDatabase = Pick<ApiDatabaseValue, "$with" | "select" | "with">;

export const buildNpcReplayQuery = (database: ReplayDatabase) => {
  const snapshotWorlds = database.$with("snapshot_worlds").as(
    database
      .select({
        npcSnapshotId: lootNpcTable.npcSnapshotId,
        world: lootTable.world,
        latestLootId: sql<number>`max(${lootNpcTable.lootId})`.as(
          "latest_loot_id",
        ),
        firstSeenAt:
          sql<number>`(extract(epoch from min(${lootTable.createdAt})) * 1000)::float8`.as(
            "first_seen_at",
          ),
      })
      .from(lootNpcTable)
      .innerJoin(lootTable, eq(lootTable.id, lootNpcTable.lootId))
      .groupBy(lootNpcTable.npcSnapshotId, lootTable.world),
  );

  return database
    .with(snapshotWorlds)
    .select({
      id: npcSnapshotTable.npcId,
      identityNamespace: npcSnapshotTable.identityNamespace,
      name: npcSnapshotTable.name,
      type: npcSnapshotTable.type,
      prof: npcSnapshotTable.prof,
      icon: npcSnapshotTable.icon,
      lvl: npcSnapshotTable.lvl,
      wt: npcSnapshotTable.wt,
      margonemType: sql<number>`coalesce(${npcSnapshotTable.margonemType}, 0)`,
      world: snapshotWorlds.world,
      gameVersion: npcSnapshotTable.gameVersion,
      latestLootId: snapshotWorlds.latestLootId,
      firstSeenAt: snapshotWorlds.firstSeenAt,
    })
    .from(snapshotWorlds)
    .innerJoin(
      npcSnapshotTable,
      eq(npcSnapshotTable.id, snapshotWorlds.npcSnapshotId),
    )
    .orderBy(asc(snapshotWorlds.latestLootId), asc(npcSnapshotTable.id));
};
