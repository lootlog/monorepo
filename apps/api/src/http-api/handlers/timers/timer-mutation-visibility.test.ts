import { expect, it } from "bun:test";
import { Effect } from "effect";
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
  roleTable,
  timerTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/schema";
import { makeResetTimer } from "./timer-reset.data-layer.js";
import { makeDeleteTimer } from "./timer-delete.data-layer.js";
import { makeRestoreTimer } from "./timer-restore.data-layer.js";

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
  { name: "administrator", read: Permission.ADMIN, max: 100, allowed: true },
])(
  "preserves source visibility for timer mutations: $name",
  async ({ read, max, allowed }) => {
    const boundary = await createDatabaseBoundary();
    try {
      const database = boundary.database;
      const now = new Date();
      const guild = createGuildFixture();
      const member = createMemberFixture();
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
              read,
              Permission.LOOTLOG_TIMERS_RESET,
              Permission.LOOTLOG_TIMERS_WRITE,
              Permission.LOOTLOG_MANAGE,
            ],
            updatedAt: now,
          })
          .returning(),
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
        invalidate: () => Effect.succeed(0),
        publish: (key: string) =>
          Effect.sync(() => {
            publications.push(key);
          }),
      };
      const reset = makeResetTimer(database, {
        ...ports,
        withLock: (_key, operation) => operation,
      });
      const remove = makeDeleteTimer(database, ports);
      const restore = makeRestoreTimer(database, ports);
      const resetResult = await boundary.run(
        reset(access, "300", { world: "world" }).pipe(Effect.result),
      );
      expect(resetResult._tag).toBe(allowed ? "Success" : "Failure");
      const deleteResult = await boundary.run(
        remove(access, "300", "world").pipe(Effect.result),
      );
      expect(deleteResult._tag).toBe(allowed ? "Success" : "Failure");
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
      const restored = await boundary.run(
        restore(access, deletion.id).pipe(Effect.result),
      );
      expect(restored._tag).toBe(allowed ? "Success" : "Failure");
      const [persisted] = await boundary.run(
        database.select().from(timerTable),
      );
      expect(persisted?.deletedAt).toEqual(allowed ? null : now);
      expect(publications).toHaveLength(allowed ? 6 : 0);
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
          expect(denied).toMatchObject({
            _tag: "Failure",
            failure: { kind: "not-found" },
          });
          expect(
            (await boundary.run(database.select().from(timerTable)))[0],
          ).toEqual(hiddenCurrent);
          expect(publications).toHaveLength(6);
        }
      }
    } finally {
      await boundary.dispose();
    }
  },
);
