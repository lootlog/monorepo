import { expect, it } from "bun:test";
import { Effect, Result } from "effect";
import { and, desc, eq } from "drizzle-orm";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  eventTable,
  eventHeroNpcTable,
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  timerTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/schema";
import { makeAllTimerList } from "./timer-list.data-layer.js";
import { makeResetTimer } from "./timer-reset.data-layer.js";
import { makeDeleteTimer } from "./timer-delete.data-layer.js";
import { makeRestoreTimer } from "./timer-restore.data-layer.js";
import { makeTimerHistory } from "./timer-history.data-layer.js";
import type { TimersGuildAccess } from "./timers.handlers.js";

const createResetRollbackFixture = async () => {
  const boundary = await createDatabaseBoundary();
  const database = boundary.database;
  const now = new Date();
  const guild = createGuildFixture();
  const member = createMemberFixture();
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
    accessPolicy: createAccessPolicy({ capabilities: [Permission.ADMIN] }),
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
  { action: "RESET", match: "id", removeRow: false },
  { action: "RESET", match: "name", removeRow: false },
  { action: "DELETE", match: "id", removeRow: false },
  { action: "DELETE", match: "name", removeRow: true },
] as const)(
  "protects $action recovery when an event activates (match: $match, missing row: $removeRow)",
  async ({ action, match, removeRow }) => {
    const {
      boundary,
      database,
      original,
      access,
      restore,
      remove,
      readHistory,
      publications,
    } = await createResetRollbackFixture();

    try {
      if (action === "DELETE") {
        await boundary.run(remove(access, original.timerKey, original.world));
        publications.length = 0;
      }

      if (removeRow) {
        await boundary.run(
          database
            .delete(timerTable)
            .where(eq(timerTable.timerKey, original.timerKey)),
        );
      }

      const [entry] = await readHistory();

      if (!entry) throw new Error("Recovery history fixture missing");
      const now = Date.now();
      const otherGuild = createGuildFixture({ id: "event-other-guild" });
      await boundary.run(database.insert(guildTable).values(otherGuild));
      await boundary.run(
        database.insert(eventTable).values([
          {
            id: "scheduled",
            guildId: access.guild.id,
            world: original.world,
            name: "Scheduled event",
            startsAt: new Date(now + 60_000),
            endsAt: new Date(now + 120_000),
            updatedAt: new Date(now),
          },
          {
            id: "other-world",
            guildId: access.guild.id,
            world: "other-world",
            name: "Other world",
            updatedAt: new Date(now),
          },
          {
            id: "other-guild",
            guildId: otherGuild.id,
            world: original.world,
            name: "Other Organization",
            updatedAt: new Date(now),
          },
        ]),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values(
          ["scheduled", "other-world", "other-guild"].map((eventId) => ({
            id: `${eventId}-hero`,
            eventId,
            npcId: match === "id" ? original.npcId : null,
            npcName: match === "name" ? original.npc.name : "Different name",
          })),
        ),
      );
      const history = makeTimerHistory(database);

      const readEligibility = () =>
        boundary.run(
          history.getHistory(access, original.world, original.timerKey, 1),
        );

      expect(await readEligibility()).toMatchObject([
        { id: entry.id, canRestore: true },
      ]);

      await boundary.run(
        database
          .update(eventTable)
          .set({ startsAt: new Date(now - 60_000) })
          .where(eq(eventTable.id, "scheduled")),
      );

      const timersBefore = await boundary.run(
        database.select().from(timerTable),
      );

      const historyBefore = await readHistory();

      const rejected = await boundary.run(
        restore(access, entry.id).pipe(Effect.result),
      );

      expect(rejected).toMatchObject({
        failure: {
          kind: "invalid-request",
          response: { message: "EVENT_TIMER_CANNOT_BE_RESET" },
        },
      });
      expect(await boundary.run(database.select().from(timerTable))).toEqual(
        timersBefore,
      );
      expect(await readHistory()).toEqual(historyBefore);
      expect(publications).toEqual([]);
      expect(await readEligibility()).toMatchObject([
        { id: entry.id, canRestore: false },
      ]);
      expect(
        await boundary.run(history.getRecentHistory(access, original.world, 1)),
      ).toMatchObject([{ id: entry.id, canRestore: false }]);

      await boundary.run(
        database
          .update(eventTable)
          .set({ endsAt: new Date(now - 1) })
          .where(eq(eventTable.id, "scheduled")),
      );
      expect(await readEligibility()).toMatchObject([
        { id: entry.id, canRestore: true },
      ]);
      const recovered = await boundary.run(restore(access, entry.id));
      const expected = action === "RESET" ? original : entry;
      expect(recovered).toMatchObject({
        minSpawnTime: expected.minSpawnTime,
        maxSpawnTime: expected.maxSpawnTime,
        deletedAt: null,
      });
      expect(publications).toHaveLength(2);
    } finally {
      await boundary.dispose();
    }
  },
);

it.each([
  { action: "RESET", guarded: "target" },
  { action: "DELETE", guarded: "target" },
  { action: "DELETE", guarded: "current" },
] as const)(
  "checks event ownership of a different $guarded NPC during $action recovery",
  async ({ action, guarded }) => {
    const {
      boundary,
      database,
      original,
      previousEntry,
      access,
      restore,
      remove,
      readHistory,
      publications,
    } = await createResetRollbackFixture();

    try {
      if (action === "DELETE") {
        await boundary.run(remove(access, original.timerKey, original.world));
        publications.length = 0;
      }

      const [entry] = await readHistory();

      if (!entry) throw new Error("Recovery history fixture missing");

      const changedNpc = {
        npcId: 999,
        npc: { ...original.npc, id: 999, name: "Other hero" },
      };

      if (action === "RESET") {
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set(changedNpc)
            .where(eq(timerHistoryEntryTable.id, previousEntry.id)),
        );
      } else if (guarded === "target") {
        await boundary.run(
          database
            .update(timerTable)
            .set(changedNpc)
            .where(eq(timerTable.timerKey, original.timerKey)),
        );
      } else {
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set(changedNpc)
            .where(eq(timerHistoryEntryTable.id, entry.id)),
        );
      }

      await boundary.run(
        database.insert(eventTable).values({
          id: "active",
          guildId: access.guild.id,
          world: original.world,
          name: "Active event",
          updatedAt: new Date(),
        }),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values({
          id: "active-hero",
          eventId: "active",
          npcId: action === "RESET" ? changedNpc.npcId : original.npcId,
          npcName: "Event hero",
        }),
      );

      const timersBefore = await boundary.run(
        database.select().from(timerTable),
      );

      const historyBefore = await readHistory();

      const result = await boundary.run(
        restore(access, entry.id).pipe(Effect.result),
      );

      expect(result).toMatchObject({
        failure: { response: { message: "EVENT_TIMER_CANNOT_BE_RESET" } },
      });
      expect(await boundary.run(database.select().from(timerTable))).toEqual(
        timersBefore,
      );
      expect(await readHistory()).toEqual(historyBefore);
      expect(publications).toEqual([]);
      expect(
        await boundary.run(
          makeTimerHistory(database).getHistory(
            access,
            original.world,
            original.timerKey,
            1,
          ),
        ),
      ).toMatchObject([{ id: entry.id, canRestore: false }]);
    } finally {
      await boundary.dispose();
    }
  },
);

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
                Permission.LOOTLOG_TIMERS_HEROES_READ,
                Permission.LOOTLOG_TIMERS_WRITE,
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

it.each([
  {
    name: "outside role level",
    read: Permission.LOOTLOG_TIMERS_HEROES_READ,
    max: 100,
    allowed: false,
  },
  {
    name: "missing hero read capability",
    read: Permission.LOOTLOG_TIMERS_READ,
    max: 500,
    allowed: false,
  },
  {
    name: "visible hero",
    read: Permission.LOOTLOG_TIMERS_HEROES_READ,
    max: 500,
    allowed: true,
  },
  {
    name: "visible hero with only tier read access",
    read: Permission.LOOTLOG_TIMERS_HEROES_READ,
    max: 500,
    allowed: true,
    tierOnly: true,
  },
  { name: "administrator", read: Permission.ADMIN, max: 100, allowed: true },
])(
  "preserves source visibility and world isolation for timer mutations: $name",
  async ({ read, max, allowed, tierOnly }) => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const now = new Date();
      const guild = createGuildFixture();
      const member = createMemberFixture({ globalUserId: "user" });
      const previousMember = createMemberFixture({ id: 2, userId: "previous" });
      await boundary.run(database.insert(guildTable).values(guild));
      await boundary.run(
        database.insert(memberTable).values([member, previousMember]),
      );

      const previousActor = {
        id: 100,
        world: "world",
        accountId: 10,
        characterId: 20,
        snapshotHash: "previous-actor",
        name: "Previous character",
      };

      await boundary.run(
        database
          .insert(playerSnapshotTable)
          .values([
            previousActor,
            { ...previousActor, id: 101, world: "other-world" },
          ]),
      );

      const roles = await boundary.run(
        database
          .insert(roleTable)
          .values({
            id: "role",
            guildId: guild.id,
            name: "Role",
            lvlRangeFrom: 1,
            lvlRangeTo: max,
            permissions: [
              ...(tierOnly ? [] : [Permission.LOOTLOG_TIMERS_READ]),
              read,
              Permission.LOOTLOG_TIMERS_RESET,
              Permission.LOOTLOG_TIMERS_WRITE,
              Permission.LOOTLOG_MANAGE,
            ],
            updatedAt: now,
          })
          .returning(),
      );

      await boundary.run(
        database.insert(memberToRoleTable).values({ A: member.id, B: "role" }),
      );

      const access = {
        guild,
        userId: "user",
        discordId: member.userId,
        roles,
        accessPolicy: createAccessPolicy({
          capabilities: roles.flatMap((role) => role.permissions),
        }),
      };

      const [timer] = await boundary.run(
        database
          .insert(timerTable)
          .values({
            guildId: guild.id,
            createdById: previousMember.id,
            actorCharacterSnapshotId: previousActor.id,
            actorCharacterLvl: 300,
            npcId: 300,
            timerKey: "300:hero",
            world: "world",
            npc: { id: 300, name: "Hero", lvl: 300, type: "HERO" },
            minSpawnTime: now,
            maxSpawnTime: new Date(now.getTime() + 60_000),
            latestRespBaseSeconds: 60,
            updatedAt: now,
          })
          .returning(),
      );

      if (!timer) throw new Error("Timer fixture missing");

      const otherWorldTimer = {
        ...timer,
        world: "other-world",
        actorCharacterSnapshotId: 101,
      };

      await boundary.run(database.insert(timerTable).values(otherWorldTimer));

      const timerCondition = and(
        eq(timerTable.timerKey, timer.timerKey),
        eq(timerTable.world, timer.world),
      );

      const readOtherWorldTimer = () =>
        boundary.run(
          database
            .select()
            .from(timerTable)
            .where(eq(timerTable.world, otherWorldTimer.world)),
        );

      const publications: string[] = [];

      const ports = {
        invalidateList: () => Effect.succeed(0),
        publish: (key: string) =>
          Effect.sync(() => {
            publications.push(key);
          }),
      };

      const list = makeAllTimerList(database);

      const readTimers = async () => {
        const result = await boundary.run(
          list({ userId: "user", discordId: member.userId }, "world").pipe(
            Effect.result,
          ),
        );

        if (tierOnly) {
          expect(result).toMatchObject({
            failure: { kind: "forbidden", response: { statusCode: 403 } },
          });

          return [];
        }

        return Result.getOrThrow(result);
      };

      const visibleCount = allowed && !tierOnly ? 1 : 0;
      expect(await readTimers()).toHaveLength(visibleCount);

      const reset = makeResetTimer(database, {
        ...ports,
        withLock: (_key, operation) => operation,
      });

      const remove = makeDeleteTimer(database, ports);
      const restore = makeRestoreTimer(database, ports);
      const timerHistory = makeTimerHistory(database);

      const resetResult = await boundary.run(
        reset(access, timer.timerKey, { world: timer.world }).pipe(
          Effect.result,
        ),
      );

      expect(resetResult._tag).toBe(allowed ? "Success" : "Failure");
      const afterReset = await readTimers();
      expect(afterReset).toHaveLength(visibleCount);
      afterReset.forEach((listedTimer) => {
        expect(listedTimer.member?.id).toBe(member.id);
        expect(listedTimer).not.toHaveProperty("actorCharacter");
      });
      expect(await readOtherWorldTimer()).toEqual([otherWorldTimer]);

      if (allowed) {
        const [persistedReset] = await boundary.run(
          database.select().from(timerTable).where(timerCondition),
        );

        expect(persistedReset).toMatchObject({
          wasReset: true,
          createdById: member.id,
          actorCharacterSnapshotId: null,
          actorCharacterLvl: null,
        });
      }

      const deleteResult = await boundary.run(
        remove(access, timer.timerKey, timer.world).pipe(Effect.result),
      );

      expect(deleteResult._tag).toBe(allowed ? "Success" : "Failure");
      expect(await readTimers()).toEqual([]);
      expect(await readOtherWorldTimer()).toEqual([otherWorldTimer]);

      let history = await boundary.run(
        database.select().from(timerHistoryEntryTable),
      );

      if (!allowed) {
        expect(history).toHaveLength(0);
        expect(publications).toHaveLength(0);
        expect(
          (
            await boundary.run(
              database.select().from(timerTable).where(timerCondition),
            )
          )[0],
        ).toEqual(timer);
        // A deleted source is still private when its history ID is known.
        await boundary.run(
          database
            .update(timerTable)
            .set({ deletedAt: now })
            .where(timerCondition),
        );
        history = await boundary.run(
          database
            .insert(timerHistoryEntryTable)
            .values({
              guildId: guild.id,
              world: timer.world,
              timerKey: timer.timerKey,
              npcId: timer.npcId,
              npc: timer.npc,
              action: "DELETE",
              actorMemberId: member.id,
              timerCreatedById: member.id,
              minSpawnTime: timer.minSpawnTime,
              maxSpawnTime: timer.maxSpawnTime,
              latestRespBaseSeconds: timer.latestRespBaseSeconds,
              latestRespawnRandomness: timer.latestRespawnRandomness,
            })
            .returning(),
        );
      }

      const deletion = history.find((entry) => entry.action === "DELETE");

      if (!deletion) throw new Error("Deletion fixture missing");

      const availableHistory = await boundary.run(
        timerHistory.getHistory(access, timer.world, timer.timerKey),
      );

      expect(
        availableHistory.find((entry) => entry.id === deletion.id),
      ).toEqual(
        allowed ? expect.objectContaining({ canRestore: true }) : undefined,
      );

      const restored = await boundary.run(
        restore(access, deletion.id).pipe(Effect.result),
      );

      expect(restored._tag).toBe(allowed ? "Success" : "Failure");
      expect(await readTimers()).toHaveLength(visibleCount);

      const [persisted] = await boundary.run(
        database.select().from(timerTable).where(timerCondition),
      );

      expect(persisted?.deletedAt).toEqual(allowed ? null : now);
      expect(publications).toHaveLength(allowed ? 6 : 0);

      if (allowed) {
        expect(persisted).toMatchObject({
          minSpawnTime: deletion.minSpawnTime,
          maxSpawnTime: deletion.maxSpawnTime,
        });
        expect(
          (
            await boundary.run(timerHistory.getRecentHistory(access, "world"))
          ).find((entry) => entry.id === deletion.id),
        ).toMatchObject({ canRestore: false });
      }

      if (allowed && read !== Permission.ADMIN) {
        // The same timer key can acquire a different NPC level after this history entry.
        for (const deletedAt of [null, now]) {
          const [hiddenCurrent] = await boundary.run(
            database
              .update(timerTable)
              .set({
                deletedAt,
                npc: { id: 300, name: "Hero", lvl: 999, type: "HERO" },
              })
              .where(timerCondition)
              .returning(),
          );

          const denied = await boundary.run(
            restore(access, deletion.id).pipe(Effect.result),
          );

          expect(Result.isFailure(denied)).toBe(true);
          expect(denied).toMatchObject({ failure: { kind: "not-found" } });
          expect(
            (
              await boundary.run(
                database.select().from(timerTable).where(timerCondition),
              )
            )[0],
          ).toEqual(hiddenCurrent);
          expect(publications).toHaveLength(6);
          expect(
            (
              await boundary.run(
                timerHistory.getHistory(access, timer.world, timer.timerKey),
              )
            ).find((entry) => entry.id === deletion.id),
          ).toMatchObject({ canRestore: false });
        }
      }
    } finally {
      await boundary.dispose();
    }
  },
);

it("only offers recovery for a complete deletion in its organization and world, with write access", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    const now = new Date();
    const guild = createGuildFixture();
    const otherGuild = createGuildFixture({ id: "guild-2" });
    const member = createMemberFixture();
    const otherMember = createMemberFixture({ id: 2, guildId: otherGuild.id });
    await boundary.run(database.insert(guildTable).values([guild, otherGuild]));
    await boundary.run(
      database.insert(memberTable).values([member, otherMember]),
    );

    const access = {
      guild,
      userId: "user",
      discordId: member.userId,
      roles: [],
      accessPolicy: createAccessPolicy({ capabilities: [Permission.ADMIN] }),
    };

    const snapshot = {
      guildId: guild.id,
      world: "world",
      timerKey: "300:hero",
      npcId: 300,
      npc: { id: 300, name: "Hero", lvl: 300, type: "HERO" },
      createdById: member.id,
      minSpawnTime: new Date(now.getTime() - 120_000),
      maxSpawnTime: new Date(now.getTime() - 60_000),
      latestRespBaseSeconds: 60,
      latestRespawnRandomness: 10,
      updatedAt: now,
    };

    await boundary.run(
      database.insert(timerTable).values([
        { ...snapshot, deletedAt: now },
        { ...snapshot, world: "other-world" },
        { ...snapshot, guildId: otherGuild.id, createdById: otherMember.id },
      ]),
    );

    const [deletion] = await boundary.run(
      database
        .insert(timerHistoryEntryTable)
        .values({
          ...snapshot,
          action: "DELETE",
          actorMemberId: member.id,
          timerCreatedById: member.id,
        })
        .returning(),
    );

    if (!deletion) throw new Error("Deletion fixture missing");

    const history = makeTimerHistory(database);

    const readHistory = () =>
      boundary.run(history.getRecentHistory(access, snapshot.world));

    expect(await readHistory()).toMatchObject([
      { id: deletion.id, canRestore: true },
    ]);

    const roles = await boundary.run(
      database
        .insert(roleTable)
        .values({
          id: "reader",
          name: "Reader",
          guildId: guild.id,
          permissions: [
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_TIMERS_HEROES_READ,
          ],
          lvlRangeFrom: 1,
          lvlRangeTo: 500,
          updatedAt: now,
        })
        .returning(),
    );

    expect(
      await boundary.run(
        history.getRecentHistory(
          {
            ...access,
            roles,
            accessPolicy: createAccessPolicy({
              capabilities: roles.flatMap((role) => role.permissions),
            }),
          },
          snapshot.world,
        ),
      ),
    ).toMatchObject([{ id: deletion.id, canRestore: false }]);

    await boundary.run(
      database
        .update(timerHistoryEntryTable)
        .set({
          latestRespBaseSeconds: null,
        })
        .where(eq(timerHistoryEntryTable.id, deletion.id)),
    );
    expect(await readHistory()).toMatchObject([
      { id: deletion.id, canRestore: false },
    ]);

    const publications: string[] = [];

    const restore = makeRestoreTimer(database, {
      invalidateList: () => Effect.void,
      publish: (key) =>
        Effect.sync(() => {
          publications.push(key);
        }),
    });

    const incomplete = await boundary.run(
      restore(access, deletion.id).pipe(Effect.result),
    );

    expect(incomplete).toMatchObject({
      failure: {
        response: { message: "TIMER_HISTORY_ENTRY_CANNOT_BE_RESTORED" },
      },
    });
    expect(publications).toEqual([]);

    await boundary.run(
      database
        .update(timerHistoryEntryTable)
        .set({
          latestRespBaseSeconds: snapshot.latestRespBaseSeconds,
        })
        .where(eq(timerHistoryEntryTable.id, deletion.id)),
    );
    const restored = await boundary.run(restore(access, deletion.id));
    expect(restored).toMatchObject({
      guildId: snapshot.guildId,
      world: snapshot.world,
      minSpawnTime: snapshot.minSpawnTime,
      maxSpawnTime: snapshot.maxSpawnTime,
      deletedAt: null,
    });
    expect(publications).toHaveLength(2);
    expect(
      (await readHistory()).find((entry) => entry.id === deletion.id),
    ).toMatchObject({ canRestore: false });
  } finally {
    await boundary.dispose();
  }
});
