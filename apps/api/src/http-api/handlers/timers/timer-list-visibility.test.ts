import { expect, it } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { TIMER_TYPES } from "#src/timers/timer-limits";
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
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import { makeAllTimerList } from "./timer-list.data-layer.js";

it.each([Permission.ADMIN, Permission.LOOTLOG_TIMERS_READ])(
  "applies all-organization timer visibility for %s",
  async (permission) => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const now = new Date();
      await boundary.run(
        database.insert(guildTable).values([
          createGuildFixture({ id: "organization", ownerId: "other-user" }),
          createGuildFixture({
            id: "hidden-organization",
            ownerId: "other-user",
          }),
        ]),
      );
      await boundary.run(
        database.insert(memberTable).values(
          createMemberFixture({
            guildId: "organization",
            userId: "discord",
            globalUserId: "user",
          }),
        ),
      );
      await boundary.run(
        database.insert(roleTable).values({
          id: "role-1",
          guildId: "organization",
          name: "Role",
          permissions: [permission],
          lvlRangeFrom: 200,
          lvlRangeTo: 500,
          updatedAt: now,
        }),
      );
      await boundary.run(
        database.insert(memberToRoleTable).values({ A: 1, B: "role-1" }),
      );
      await boundary.run(
        database.insert(timerTable).values(
          ["organization", "hidden-organization"].map((guildId) => ({
            guildId,
            createdById: 1,
            npcId: 105,
            timerKey: "105:npc",
            world: "world",
            npc: { id: 105, lvl: 105, type: "HERO", name: "NPC" },
            minSpawnTime: now,
            maxSpawnTime: new Date(now.getTime() + 60_000),
            updatedAt: now,
          })),
        ),
      );

      const timers = await boundary.run(
        makeAllTimerList(database)({ userId: "user", discordId: "discord" }),
      );

      expect(timers.map((entry) => entry.npcId)).toEqual(
        permission === Permission.ADMIN ? [105] : [],
      );
      expect(timers.every((entry) => entry.guildId === "organization")).toBe(
        true,
      );
    } finally {
      await boundary.dispose();
    }
  },
);

it("keeps owner access, API-key scope, worlds and selected expired timers fresh across reads", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const now = new Date();
    await boundary.run(
      database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "1", ownerId: "owner" }),
          createGuildFixture({ id: "2", ownerId: "owner" }),
          createGuildFixture({ id: "3", ownerId: "other" }),
        ]),
    );
    await boundary.run(
      database
        .insert(memberTable)
        .values(createMemberFixture({ guildId: "1" })),
    );
    await boundary.run(
      database.insert(timerTable).values(
        [
          {
            key: "active",
            guildId: "1",
            world: "world",
            expired: false,
            deleted: false,
          },
          {
            key: "expired",
            guildId: "1",
            world: "world",
            expired: true,
            deleted: false,
          },
          {
            key: "deleted",
            guildId: "1",
            world: "world",
            expired: false,
            deleted: true,
          },
          {
            key: "manual",
            guildId: "1",
            world: "world",
            expired: true,
            deleted: false,
          },
          {
            key: "unselected",
            guildId: "1",
            world: "world",
            expired: true,
            deleted: false,
          },
          {
            key: "other-world",
            guildId: "1",
            world: "other-world",
            expired: false,
            deleted: false,
          },
          {
            key: "other-organization",
            guildId: "2",
            world: "world",
            expired: false,
            deleted: false,
          },
          {
            key: "hidden-organization",
            guildId: "3",
            world: "world",
            expired: false,
            deleted: false,
          },
        ].map(({ key, guildId, world, expired, deleted }, index) => ({
          guildId,
          world,
          timerKey: key,
          npcId: index + 1,
          createdById: 1,
          npc: {
            id: index + 1,
            lvl: 200,
            type: "HERO",
            name: key,
            margonemType: key === "manual" ? TIMER_TYPES.CUSTOM_MANUAL : 1,
          },
          minSpawnTime: now,
          maxSpawnTime: new Date(now.getTime() + (expired ? -60_000 : 60_000)),
          deletedAt: deleted ? now : null,
          updatedAt: now,
        })),
      ),
    );
    await boundary.run(
      database.insert(userSettingDocumentTable).values({
        userId: "user",
        scopeId: "user",
        scopeType: "USER",
        domain: "timers",
        updatedAt: now,
        overrides: {
          alwaysVisibleExpiredTimers: {
            world: ["expired", "deleted", "manual", 7, null, {}],
          },
        },
      }),
    );
    const list = makeAllTimerList(database);
    const identity = { userId: "user", discordId: "owner" };

    const keys = async (world?: string) =>
      (await boundary.run(list(identity, world)))
        .map((timer) => timer.timerKey)
        .sort();

    expect(await keys("world")).toEqual([
      "active",
      "deleted",
      "expired",
      "other-organization",
    ]);
    expect(await keys()).toEqual([
      "active",
      "other-organization",
      "other-world",
    ]);
    expect(await keys("other-world")).toEqual(["other-world"]);
    expect(
      (await boundary.run(list({ ...identity, userId: "other-user" }, "world")))
        .map((timer) => timer.timerKey)
        .sort(),
    ).toEqual(["active", "other-organization"]);

    const scoped = (organizationIds: string[]) =>
      list(identity, "world").pipe(
        Effect.provideService(ForwardAuthIdentity, {
          ...identity,
          apiKey: {
            keyId: "key",
            organizationIds,
            mode: "read",
            personalData: false,
            expiresAt: null,
          },
        }),
      );

    expect(
      (await boundary.run(scoped(["2"]))).map((timer) => timer.timerKey),
    ).toEqual(["other-organization"]);
    expect(await boundary.run(scoped([]).pipe(Effect.result))).toMatchObject({
      failure: { kind: "forbidden", response: { statusCode: 403 } },
    });
    expect(
      await boundary.run(
        list({ userId: "unknown", discordId: "unknown" }, "world").pipe(
          Effect.result,
        ),
      ),
    ).toMatchObject({
      failure: {
        kind: "forbidden",
        response: { statusCode: 403 },
      },
    });

    for (const overrides of [
      null,
      [],
      { alwaysVisibleExpiredTimers: null },
      { alwaysVisibleExpiredTimers: { world: "expired" } },
      { alwaysVisibleExpiredTimers: { world: { expired: true } } },
      { alwaysVisibleExpiredTimers: { world: [7, null, ["expired"], {}] } },
    ]) {
      await boundary.run(
        database.update(userSettingDocumentTable).set({
          overrides: overrides === null ? sql`'null'::jsonb` : overrides,
        }),
      );
      expect(await keys("world")).toEqual(["active", "other-organization"]);
    }

    await boundary.run(
      database
        .update(guildTable)
        .set({ active: false })
        .where(eq(guildTable.id, "1")),
    );
    expect(await keys("world")).toEqual(["other-organization"]);
    await boundary.run(
      database.delete(timerTable).where(eq(timerTable.guildId, "2")),
    );
    expect(await keys("world")).toEqual([]);
    await boundary.run(
      database
        .update(guildTable)
        .set({ ownerId: "other" })
        .where(eq(guildTable.id, "2")),
    );
    expect(
      await boundary.run(list(identity, "world").pipe(Effect.result)),
    ).toMatchObject({
      failure: {
        kind: "forbidden",
        response: { statusCode: 403 },
      },
    });
  } finally {
    await boundary.dispose();
  }
});

it("applies role and membership revocation on the next timer read without retaining a failed response", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const now = new Date();
    await boundary.run(
      database
        .insert(guildTable)
        .values(createGuildFixture({ id: "1", ownerId: "other" })),
    );
    await boundary.run(
      database.insert(memberTable).values(
        createMemberFixture({
          guildId: "1",
          userId: "discord",
          globalUserId: "user",
        }),
      ),
    );
    await boundary.run(
      database.insert(roleTable).values([
        {
          id: "base",
          guildId: "1",
          name: "Base",
          permissions: [Permission.LOOTLOG_TIMERS_READ],
          lvlRangeFrom: 1,
          lvlRangeTo: 100,
          updatedAt: now,
        },
        {
          id: "heroes",
          guildId: "1",
          name: "Heroes",
          permissions: [Permission.LOOTLOG_TIMERS_HEROES_READ],
          lvlRangeFrom: 150,
          lvlRangeTo: 300,
          updatedAt: now,
        },
      ]),
    );
    await boundary.run(
      database.insert(memberToRoleTable).values([
        { A: 1, B: "base" },
        { A: 1, B: "heroes" },
      ]),
    );
    await boundary.run(
      database.insert(timerTable).values({
        guildId: "1",
        world: "world",
        timerKey: "hero",
        npcId: 1,
        createdById: 1,
        npc: { id: 1, lvl: 200, type: "HERO", name: "Hero" },
        minSpawnTime: now,
        maxSpawnTime: new Date(now.getTime() + 60_000),
        updatedAt: now,
      }),
    );
    const list = makeAllTimerList(database);

    const read = () =>
      boundary.run(list({ userId: "user", discordId: "discord" }, "world"));

    expect(await read()).toHaveLength(1);
    await boundary.run(
      database
        .update(roleTable)
        .set({ lvlRangeTo: 199 })
        .where(eq(roleTable.id, "heroes")),
    );
    expect(await read()).toEqual([]);
    await boundary.run(
      database
        .update(roleTable)
        .set({ lvlRangeTo: 300 })
        .where(eq(roleTable.id, "heroes")),
    );
    expect(await read()).toHaveLength(1);
    await boundary.run(
      database
        .delete(memberToRoleTable)
        .where(eq(memberToRoleTable.B, "heroes")),
    );
    expect(await read()).toEqual([]);
    await boundary.run(database.update(memberTable).set({ active: false }));
    await expect(read()).rejects.toMatchObject({
      kind: "forbidden",
      response: { statusCode: 403 },
    });
    await boundary.run(database.update(memberTable).set({ active: true }));
    expect(await read()).toEqual([]);
    await boundary.run(
      database.update(memberTable).set({ globalUserId: null }),
    );
    await expect(read()).rejects.toMatchObject({
      kind: "forbidden",
      response: { statusCode: 403 },
    });
  } finally {
    await boundary.dispose();
  }
});
