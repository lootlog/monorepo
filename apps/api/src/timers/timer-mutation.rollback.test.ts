import { expect, it } from "bun:test";
import { Effect, Result } from "effect";
import { eq } from "drizzle-orm";
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
  roleTable,
} from "#src/database/drizzle/organization.schema";
import {
  timerTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/timer.schema";
import { makeResetTimer } from "./timer-reset.data-layer.js";
import { makeTimerHistory } from "./timer-history.data-layer.js";
import { createResetRollbackFixture } from "./timer-mutation.fixtures.js";

it("rolls back the latest reset to its previous exact snapshot once", async () => {
  const fixture = await createResetRollbackFixture();

  const {
    boundary,
    database,
    original,
    access,
    resetEntry,
    restore,
    publications,
    readHistory,
  } = fixture;

  try {
    const otherGuild = createGuildFixture({ id: "other-guild" });
    const otherMember = createMemberFixture({ id: 3, guildId: otherGuild.id });
    await boundary.run(database.insert(guildTable).values(otherGuild));
    await boundary.run(database.insert(memberTable).values(otherMember));
    const { id: _id, ...foreignHistory } = resetEntry;
    await boundary.run(
      database.insert(timerHistoryEntryTable).values([
        {
          ...foreignHistory,
          world: "other-world",
          createdAt: new Date(Date.now() + 60_000),
        },
        {
          ...foreignHistory,
          guildId: otherGuild.id,
          actorMemberId: otherMember.id,
          timerCreatedById: otherMember.id,
          createdAt: new Date(Date.now() + 60_000),
        },
      ]),
    );
    const history = makeTimerHistory(database);
    expect(
      await boundary.run(
        history.getHistory(access, original.world, original.timerKey, 1),
      ),
    ).toMatchObject([{ id: resetEntry.id, canRestore: true }]);
    expect(
      await boundary.run(history.getRecentHistory(access, original.world, 1)),
    ).toMatchObject([{ id: resetEntry.id, canRestore: true }]);
    const restored = await boundary.run(restore(access, resetEntry.id));
    expect(restored).toMatchObject({
      minSpawnTime: original.minSpawnTime,
      maxSpawnTime: original.maxSpawnTime,
      wasReset: false,
      deletedAt: null,
    });
    expect((await readHistory())[0]).toMatchObject({
      action: "RESTORE",
      minSpawnTime: original.minSpawnTime,
      maxSpawnTime: original.maxSpawnTime,
      windowOpenedAt: original.windowOpenedAt,
      timerCreatedById: original.createdById,
      timerActorCharacterSnapshotId: original.actorCharacterSnapshotId,
      timerActorCharacterLvl: original.actorCharacterLvl,
      wasReset: false,
    });
    expect(publications).toHaveLength(2);

    const repeated = await boundary.run(
      restore(access, resetEntry.id).pipe(Effect.result),
    );

    expect(repeated).toMatchObject({ failure: { kind: "conflict" } });
    expect(publications).toHaveLength(2);
    expect(await readHistory()).toHaveLength(3);
    expect(
      (
        await boundary.run(
          history.getHistory(access, original.world, original.timerKey),
        )
      ).find((entry) => entry.id === resetEntry.id),
    ).toMatchObject({ canRestore: false });
  } finally {
    await boundary.dispose();
  }
});

it.each([
  "missing",
  "incomplete",
  "hidden",
  "deleted",
  "newer reset",
  "changed current",
] as const)(
  "does not roll back a reset across a %s predecessor or later change",
  async (scenario) => {
    const {
      boundary,
      database,
      original,
      access: initialAccess,
      resetEntry,
      previousEntry,
      restore,
      reset,
      publications,
      readHistory,
    } = await createResetRollbackFixture();

    let access = initialAccess;

    try {
      if (scenario === "missing") {
        await boundary.run(
          database
            .delete(timerHistoryEntryTable)
            .where(eq(timerHistoryEntryTable.id, previousEntry.id)),
        );
      } else if (scenario === "incomplete") {
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set({ minSpawnTime: null })
            .where(eq(timerHistoryEntryTable.id, previousEntry.id)),
        );
      } else if (scenario === "hidden") {
        const roles = await boundary.run(
          database
            .insert(roleTable)
            .values({
              id: "reader",
              guildId: access.guild.id,
              name: "Reader",
              lvlRangeFrom: 1,
              lvlRangeTo: 500,
              permissions: [
                Capability.LOOTLOG_TIMERS_HEROES_READ,
                Capability.LOOTLOG_TIMERS_WRITE,
              ],
              updatedAt: new Date(),
            })
            .returning(),
        );

        access = {
          ...access,
          roles,
          accessPolicy: createAccessPolicy({
            capabilities: roles.flatMap((role) => role.permissions),
          }),
        };
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set({ npc: { ...original.npc, lvl: 999 } })
            .where(eq(timerHistoryEntryTable.id, previousEntry.id)),
        );
      } else if (scenario === "deleted") {
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set({ action: "DELETE" })
            .where(eq(timerHistoryEntryTable.id, previousEntry.id)),
        );
      } else if (scenario === "changed current") {
        await boundary.run(
          database
            .update(timerTable)
            .set({
              minSpawnTime: new Date(Date.now() + 300_000),
              maxSpawnTime: new Date(Date.now() + 360_000),
            })
            .where(eq(timerTable.timerKey, original.timerKey)),
        );
      } else {
        await boundary.run(
          reset(access, original.timerKey, { world: original.world }),
        );
        publications.length = 0;
      }

      const before = await boundary.run(database.select().from(timerTable));
      const historyBefore = await readHistory();
      expect(
        (
          await boundary.run(
            makeTimerHistory(database).getHistory(
              access,
              original.world,
              original.timerKey,
            ),
          )
        ).find((entry) => entry.id === resetEntry.id),
      ).toMatchObject({ canRestore: false });

      const result = await boundary.run(
        restore(access, resetEntry.id).pipe(Effect.result),
      );

      expect(Result.isFailure(result)).toBe(true);

      if (scenario === "changed current" || scenario === "newer reset") {
        expect(result).toMatchObject({ failure: { kind: "conflict" } });
      }

      expect(await boundary.run(database.select().from(timerTable))).toEqual(
        before,
      );
      expect(await readHistory()).toEqual(historyBefore);
      expect(publications).toEqual([]);
    } finally {
      await boundary.dispose();
    }
  },
);

it("keeps the five newest timer history entries without pruning other organizations, worlds or timers", async () => {
  const {
    boundary,
    database,
    original,
    access,
    resetEntry,
    remove,
    readHistory,
  } = await createResetRollbackFixture();

  try {
    const otherGuild = createGuildFixture({ id: "other-guild" });
    const otherMember = createMemberFixture({ id: 3, guildId: otherGuild.id });
    await boundary.run(database.insert(guildTable).values(otherGuild));
    await boundary.run(database.insert(memberTable).values(otherMember));
    const { id: _id, ...entry } = resetEntry;

    const inserted = await boundary.run(
      database
        .insert(timerHistoryEntryTable)
        .values(
          Array.from({ length: 6 }, (_, index) => ({
            ...entry,
            createdAt: new Date(Date.now() - index * 60_000),
          })),
        )
        .returning(),
    );

    const foreignEntries = await boundary.run(
      database
        .insert(timerHistoryEntryTable)
        .values(
          inserted.flatMap(({ id: _entryId, ...history }) => [
            { ...history, world: "other-world" },
            { ...history, timerKey: "301:other-hero" },
            {
              ...history,
              guildId: otherGuild.id,
              actorMemberId: otherMember.id,
              timerCreatedById: otherMember.id,
            },
          ]),
        )
        .returning(),
    );

    const newestPriorEntries = (await readHistory()).slice(0, 4);

    await boundary.run(remove(access, original.timerKey, original.world));

    const retained = await readHistory();
    expect(retained).toHaveLength(5);
    expect(retained[0]?.action).toBe("DELETE");
    expect(retained.slice(1).map(({ id }) => id)).toEqual(
      newestPriorEntries.map(({ id }) => id),
    );

    const allEntries = await boundary.run(
      database.select().from(timerHistoryEntryTable),
    );

    expect(
      allEntries
        .filter(
          ({ guildId, world, timerKey }) =>
            guildId !== original.guildId ||
            world !== original.world ||
            timerKey !== original.timerKey,
        )
        .map(({ id }) => id)
        .sort(),
    ).toEqual(foreignEntries.map(({ id }) => id).sort());
  } finally {
    await boundary.dispose();
  }
});

it("refuses to reset a Hero Tracker timer and leaves it unchanged", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const now = new Date();
    const guild = createGuildFixture();
    const member = createMemberFixture({ globalUserId: "user" });
    await boundary.run(database.insert(guildTable).values(guild));
    await boundary.run(database.insert(memberTable).values(member));

    const tracker = {
      guildId: guild.id,
      world: "world",
      timerKey: "-1:doświadczony tropiciel herosów",
      npcId: -1,
      npc: {
        id: 190436,
        name: "Doświadczony Tropiciel Herosów",
        lvl: 282,
        type: "HERO_TRACKER",
      },
      createdById: member.id,
      entranceClosesAt: new Date(now.getTime() + 10 * 60_000),
      minSpawnTime: new Date(now.getTime() + 55 * 60_000),
      maxSpawnTime: new Date(now.getTime() + 145 * 60_000),
      latestRespBaseSeconds: 5400,
      updatedAt: now,
    };

    await boundary.run(database.insert(timerTable).values(tracker));
    const before = await boundary.run(database.select().from(timerTable));
    const publications: string[] = [];

    const reset = makeResetTimer(database, {
      invalidateList: () => Effect.void,
      publish: (key: string) =>
        Effect.sync(() => {
          publications.push(key);
        }),
      withLock: (_key, operation) => operation,
    });

    const result = await boundary.run(
      reset(
        {
          guild,
          userId: member.userId,
          discordId: member.userId,
          roles: [],
          accessPolicy: createAccessPolicy({
            capabilities: [Capability.ADMIN],
          }),
        },
        tracker.timerKey,
        { world: tracker.world },
      ).pipe(Effect.result),
    );

    expect(result).toMatchObject({
      failure: {
        kind: "invalid-request",
        body: { code: "HERO_TRACKER_TIMER_CANNOT_BE_RESET" },
      },
    });
    expect(await boundary.run(database.select().from(timerTable))).toEqual(
      before,
    );
    expect(publications).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});
