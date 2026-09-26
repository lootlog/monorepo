import { expect, it } from "bun:test";
import { Effect, Result } from "effect";
import { eq } from "drizzle-orm";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/schema";
import { makeAllTimerList } from "./timer-list.data-layer.js";
import { makeResetTimer } from "./timer-reset.data-layer.js";
import { makeDeleteTimer } from "./timer-delete.data-layer.js";
import { makeRestoreTimer } from "./timer-restore.data-layer.js";
import { makeTimerHistory } from "./timer-history.data-layer.js";

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
  "preserves source visibility for timer mutations: $name",
  async ({ read, max, allowed, tierOnly }) => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const now = new Date();
      const guild = createGuildFixture();
      const member = createMemberFixture({ globalUserId: "user" });
      await boundary.run(database.insert(guildTable).values(guild));
      await boundary.run(database.insert(memberTable).values(member));

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
            createdById: member.id,
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
        reset(access, "300", { world: "world" }).pipe(Effect.result),
      );

      expect(resetResult._tag).toBe(allowed ? "Success" : "Failure");
      const afterReset = await readTimers();
      expect(afterReset).toHaveLength(visibleCount);

      if (allowed) {
        const [persistedReset] = await boundary.run(
          database.select().from(timerTable),
        );

        expect(persistedReset?.wasReset).toBe(true);
      }

      const deleteResult = await boundary.run(
        remove(access, "300", "world").pipe(Effect.result),
      );

      expect(deleteResult._tag).toBe(allowed ? "Success" : "Failure");
      expect(await readTimers()).toEqual([]);

      let history = await boundary.run(
        database.select().from(timerHistoryEntryTable),
      );

      if (!allowed) {
        expect(history).toHaveLength(0);
        expect(publications).toHaveLength(0);
        expect(
          (await boundary.run(database.select().from(timerTable)))[0],
        ).toEqual(timer);
        // A deleted source is still private when its history ID is known.
        await boundary.run(
          database
            .update(timerTable)
            .set({ deletedAt: now })
            .where(eq(timerTable.timerKey, timer.timerKey)),
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
        database.select().from(timerTable),
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
              .where(eq(timerTable.timerKey, timer.timerKey))
              .returning(),
          );

          const denied = await boundary.run(
            restore(access, deletion.id).pipe(Effect.result),
          );

          expect(Result.isFailure(denied)).toBe(true);
          expect(denied).toMatchObject({ failure: { kind: "not-found" } });
          expect(
            (await boundary.run(database.select().from(timerTable)))[0],
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
