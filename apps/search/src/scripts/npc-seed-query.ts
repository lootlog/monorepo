import {
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "@lootlog/api/database/schema";
import { asc, eq, sql } from "drizzle-orm";
import { Schema } from "effect";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { mergeNpcDocuments, toNpcDocument } from "#src/npcs/npcs.service";
import type { drizzle } from "drizzle-orm/bun-sql";

type SeedDatabase = Pick<
  ReturnType<typeof drizzle>,
  "$with" | "select" | "with"
>;

/**
 * Every looted NPC revision with each world it was observed in,
 * ordered by its latest loot. Merging the rows into catalog documents
 * keeps the most recently observed revision of each entry, as live indexing
 * does; hash order and level do not establish chronology.
 */
export const buildNpcSeedQuery = (database: SeedDatabase) => {
  // Reduce repeated loot links before reading the larger snapshot records.
  const snapshotWorlds = database.$with("snapshot_worlds").as(
    database
      .select({
        npcSnapshotId: lootNpcTable.npcSnapshotId,
        world: lootTable.world,
        latestLootId: sql<number>`max(${lootNpcTable.lootId})`.as(
          "latest_loot_id",
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
    })
    .from(snapshotWorlds)
    .innerJoin(
      npcSnapshotTable,
      eq(npcSnapshotTable.id, snapshotWorlds.npcSnapshotId),
    )
    .orderBy(asc(snapshotWorlds.latestLootId), asc(npcSnapshotTable.id));
};

type NpcSeedRow = Awaited<ReturnType<typeof buildNpcSeedQuery>>[number];

const decodeIdentityNamespace = Schema.decodeUnknownSync(
  NpcIdentityNamespaceSchema,
);

/** One document per catalog entry, from rows in `buildNpcSeedQuery` order. */
export const toNpcSeedDocuments = (rows: readonly NpcSeedRow[]) =>
  mergeNpcDocuments(
    rows.map((npc) =>
      toNpcDocument({
        id: npc.id,
        identityNamespace: decodeIdentityNamespace(npc.identityNamespace),
        name: npc.name,
        type: npc.type ?? "",
        prof: npc.prof,
        icon: npc.icon ?? "",
        lvl: npc.lvl ?? 0,
        wt: npc.wt ?? 0,
        margonemType: npc.margonemType,
        world: npc.world,
        gameVersion: npc.gameVersion,
        lootId: npc.latestLootId,
      }),
    ),
  );
