import { desc, eq, max } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  lootPlayerTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";

type ReplayDatabase = Pick<ApiDatabaseValue, "$with" | "select" | "with">;

/**
 * Every character's newest snapshot that took part in a loot, with the
 * highest level recorded with it. Live indexing only sees loot participants,
 * so map-capture snapshots stay out; levels only rise, so the highest one is
 * the current one. One aggregate over LootPlayer beats a lookup per snapshot.
 */
export const buildPlayerReplayQuery = (database: ReplayDatabase) => {
  const levels = database.$with("levels").as(
    database
      .select({
        playerSnapshotId: lootPlayerTable.playerSnapshotId,
        lvl: max(lootPlayerTable.lvl).as("lvl"),
      })
      .from(lootPlayerTable)
      .groupBy(lootPlayerTable.playerSnapshotId),
  );

  return database
    .with(levels)
    .selectDistinctOn(
      [
        playerSnapshotTable.world,
        playerSnapshotTable.accountId,
        playerSnapshotTable.characterId,
      ],
      {
        world: playerSnapshotTable.world,
        accountId: playerSnapshotTable.accountId,
        characterId: playerSnapshotTable.characterId,
        name: playerSnapshotTable.name,
        prof: playerSnapshotTable.prof,
        icon: playerSnapshotTable.icon,
        lvl: levels.lvl,
      },
    )
    .from(playerSnapshotTable)
    .innerJoin(levels, eq(levels.playerSnapshotId, playerSnapshotTable.id))
    .orderBy(
      playerSnapshotTable.world,
      playerSnapshotTable.accountId,
      playerSnapshotTable.characterId,
      desc(playerSnapshotTable.createdAt),
      desc(playerSnapshotTable.id),
    );
};
