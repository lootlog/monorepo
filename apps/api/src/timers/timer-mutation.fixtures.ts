import { Effect } from "effect";
import { and, desc, eq } from "drizzle-orm";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { playerSnapshotTable } from "#src/database/drizzle/loot.schema";
import {
  timerTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/timer.schema";
import { makeResetTimer } from "./timer-reset.data-layer.js";
import { makeDeleteTimer } from "./timer-delete.data-layer.js";
import { makeRestoreTimer } from "./timer-restore.data-layer.js";
import type { TimersGuildAccess } from "./timers-data.js";

export const createResetRollbackFixture = async () => {
  const boundary = await createDatabaseBoundary();
  const database = boundary.database;
  const now = new Date();
  const guild = createGuildFixture();
  const member = createMemberFixture({ globalUserId: "user" });
  const previousMember = createMemberFixture({ id: 2, userId: "previous" });
  await boundary.run(database.insert(guildTable).values(guild));
  await boundary.run(
    database.insert(memberTable).values([member, previousMember]),
  );
  await boundary.run(
    database.insert(playerSnapshotTable).values({
      id: 100,
      world: "world",
      accountId: 10,
      characterId: 20,
      snapshotHash: "previous-actor",
      name: "Previous character",
    }),
  );

  const original = {
    guildId: guild.id,
    world: "world",
    timerKey: "300:hero",
    npcId: 300,
    npc: { id: 300, name: "Hero", lvl: 300, type: "HERO" },
    createdById: previousMember.id,
    actorCharacterSnapshotId: 100,
    actorCharacterLvl: 300,
    minSpawnTime: new Date(now.getTime() - 120_000),
    maxSpawnTime: new Date(now.getTime() - 60_000),
    latestRespBaseSeconds: 60,
    latestRespawnRandomness: 10,
    wasReset: false,
    windowOpenedAt: new Date(now.getTime() - 180_000),
    updatedAt: now,
  };

  await boundary.run(database.insert(timerTable).values(original));
  await boundary.run(
    database.insert(timerHistoryEntryTable).values({
      ...original,
      action: "CREATE",
      actorMemberId: member.id,
      timerCreatedById: original.createdById,
      timerActorCharacterSnapshotId: original.actorCharacterSnapshotId,
      timerActorCharacterLvl: original.actorCharacterLvl,
      createdAt: new Date(now.getTime() - 180_000),
    }),
  );

  const access: TimersGuildAccess = {
    guild,
    userId: member.userId,
    discordId: member.userId,
    roles: [],
    accessPolicy: createAccessPolicy({ capabilities: [Capability.ADMIN] }),
  };

  const publications: string[] = [];

  const ports = {
    invalidateList: () => Effect.void,
    publish: (key: string) =>
      Effect.sync(() => {
        publications.push(key);
      }),
  };

  const reset = makeResetTimer(database, {
    ...ports,
    withLock: (_key, operation) => operation,
  });

  await boundary.run(
    reset(access, original.timerKey, { world: original.world }),
  );
  publications.length = 0;

  const readHistory = () =>
    boundary.run(
      database
        .select()
        .from(timerHistoryEntryTable)
        .where(
          and(
            eq(timerHistoryEntryTable.guildId, original.guildId),
            eq(timerHistoryEntryTable.world, original.world),
            eq(timerHistoryEntryTable.timerKey, original.timerKey),
          ),
        )
        .orderBy(desc(timerHistoryEntryTable.id)),
    );

  const [resetEntry, previousEntry] = await readHistory();

  if (!resetEntry || !previousEntry)
    throw new Error("Reset history fixture missing");

  return {
    boundary,
    database,
    original,
    access,
    resetEntry,
    previousEntry,
    publications,
    readHistory,
    restore: makeRestoreTimer(database, ports),
    remove: makeDeleteTimer(database, ports),
    reset,
  };
};
