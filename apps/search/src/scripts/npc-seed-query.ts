import {
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
} from "@lootlog/api/database/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Schema } from "effect";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { toNpcDocument } from "#src/npcs/npcs.service";
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
    npcSnapshotTable.identityNamespace,
    npcSnapshotTable.npcId,
    margonemType,
    snapshotWorlds.world,
    npcSnapshotTable.snapshotHash,
  ];

  return database
    .with(snapshotWorlds)
    .selectDistinctOn(identity, {
      id: npcSnapshotTable.npcId,
      identityNamespace: npcSnapshotTable.identityNamespace,
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

type NpcSeedRow = Awaited<ReturnType<typeof buildNpcSeedQuery>>[number];

const decodeIdentityNamespace = Schema.decodeUnknownSync(
  NpcIdentityNamespaceSchema,
);

/** Rebuilt documents keep the identity namespace of their snapshot. */
export const toNpcSeedDocument = (npc: NpcSeedRow) =>
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
    snapshotHash: npc.snapshotHash ?? undefined,
  });
