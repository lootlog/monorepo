import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { userCharactersLootlogSettingsTable } from "#src/database/drizzle/user.schema";
import {
  bossKillTable,
  userKillBucketTable,
  userKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  guildKillBucketTable,
  guildKillDayTable,
  guildKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { Effect } from "effect";
import { describe, expect, it } from "bun:test";
import type { CreateKillRequest } from "#src/contracts/kills/schemas";
import { OperationError } from "@lootlog/instrumentation/operation";
import { makeKillCreation, type KillCreationCache } from "./kill-creation.js";
import { payload } from "./kill-creation.fixtures.js";

describe("kill creation Effect module", () => {
  it("returns the established dedup response when no new destination accepts a kill", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const cache: KillCreationCache = {
        invalidateScopes: () => Effect.succeed(0),
        deleteIfValue: () => Effect.succeed(0),
        setNx: () => Effect.succeed(false),
        setNxGet: () => Effect.succeed(null),
      };

      const createKill = makeKillCreation(boundary.database, cache);

      await expect(
        boundary.run(createKill("discord-1", payload)),
      ).resolves.toEqual({ deduplicated: true, updated: 0 });
    } finally {
      await boundary.dispose();
    }
  });

  it("maps a Redis dedup failure to the typed module error", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const cache: KillCreationCache = {
        invalidateScopes: () => Effect.succeed(0),
        deleteIfValue: () => Effect.succeed(0),
        setNx: () => Effect.fail(new Error("redis unavailable")),
        setNxGet: () => Effect.succeed(null),
      };

      const createKill = makeKillCreation(boundary.database, cache);

      await expect(
        boundary.run(createKill("discord-1", payload)),
      ).rejects.toBeInstanceOf(OperationError);
    } finally {
      await boundary.dispose();
    }
  });
});

it("a scoped key cannot suppress later personal or other-organization kill records", async () => {
  const boundary = await createDatabaseBoundary();
  const keys = new Set<string>();

  const cache: KillCreationCache = {
    invalidateScopes: () => Effect.succeed(0),
    deleteIfValue: () => Effect.succeed(0),
    setNx: (key) =>
      Effect.sync(() => {
        if (keys.has(key)) return false;
        keys.add(key);

        return true;
      }),
    setNxGet: () => Effect.succeed(null),
  };

  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(guildTable)
        .values(
          ["123", "456"].map((id) =>
            createGuildFixture({ id, ownerId: "discord-1" }),
          ),
        ),
    );
    await boundary.run(
      database.insert(memberTable).values(
        ["123", "456"].map((guildId, index) =>
          createMemberFixture({
            id: index + 1,
            guildId,
            userId: "discord-1",
            globalUserId: "user",
          }),
        ),
      ),
    );
    await boundary.run(
      database.insert(userCharactersLootlogSettingsTable).values({
        userId: "discord-1",
        accountId: payload.accountId,
        characterId: payload.characterId,
        catchingGuildIds: ["123", "456"],
        updatedAt: new Date(),
      }),
    );
    const personalHints: string[] = [];

    const createKill = makeKillCreation(database, cache, undefined, (userId) =>
      Effect.sync(() => personalHints.push(userId)),
    );

    const personalRequest = createKill("discord-1", payload).pipe(
      Effect.provideService(ForwardAuthIdentity, {
        userId: "user",
        discordId: "discord-1",
      }),
    );

    const keyRequest = createKill("discord-1", payload).pipe(
      Effect.provideService(ForwardAuthIdentity, {
        userId: "user",
        discordId: "discord-1",
        apiKey: {
          keyId: "key",
          organizationIds: ["123"],
          mode: "read-write",
          personalData: false,
          expiresAt: null,
        },
      }),
    );

    expect(await boundary.run(keyRequest)).toEqual({ updated: 1 });
    expect(
      await boundary.run(database.select().from(userKillBucketTable)),
    ).toEqual([]);
    expect(await boundary.run(personalRequest)).toEqual({
      updated: 1,
    });
    expect(await boundary.run(personalRequest)).toEqual({
      deduplicated: true,
      updated: 0,
    });
    expect(await boundary.run(keyRequest)).toEqual({
      deduplicated: true,
      updated: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(personalHints).toEqual(["user"]);

    for (const [table, kills] of [
      [userKillTotalTable, [1]],
      [userKillBucketTable, [1]],
      [memberKillTotalTable, [1, 1]],
      [memberKillBucketTable, [1, 1]],
      [guildKillTotalTable, [1, 1]],
      [guildKillBucketTable, [1, 1]],
      [guildKillDayTable, [1, 1]],
    ] as const) {
      expect(
        (await boundary.run(database.select().from(table))).map(
          (row) => row.kills,
        ),
      ).toEqual([...kills]);
    }
  } finally {
    await boundary.dispose();
  }
});

it("records a boss kill once for every Organization that reports it", async () => {
  const boundary = await createDatabaseBoundary();
  const claims = new Map<string, string>();

  const cache: KillCreationCache = {
    invalidateScopes: () => Effect.succeed(0),
    deleteIfValue: () => Effect.succeed(0),
    setNx: (key, value) =>
      Effect.sync(() => {
        if (claims.has(key)) return false;
        claims.set(key, value);

        return true;
      }),
    setNxGet: (key, value) =>
      Effect.sync(() => {
        const held = claims.get(key) ?? null;

        if (held === null) claims.set(key, value);

        return held;
      }),
  };

  try {
    const database = boundary.database;

    for (const [id, guildId] of [
      [1, "123"],
      [2, "456"],
      [3, "456"],
    ] as const) {
      if (id !== 3)
        await boundary.run(
          database
            .insert(guildTable)
            .values(
              createGuildFixture({ id: guildId, ownerId: `discord-${id}` }),
            ),
        );
      await boundary.run(
        database.insert(memberTable).values(
          createMemberFixture({
            id,
            guildId,
            userId: `discord-${id}`,
            globalUserId: `user-${id}`,
          }),
        ),
      );
      await boundary.run(
        database.insert(userCharactersLootlogSettingsTable).values({
          userId: `discord-${id}`,
          accountId: `account-${id}`,
          characterId: `character-${id}`,
          catchingGuildIds: [guildId],
          updatedAt: new Date(),
        }),
      );
    }

    await boundary.run(
      database.insert(roleTable).values({
        id: "writers",
        guildId: "456",
        name: "Writers",
        permissions: [Capability.LOOTLOG_LOOTS_WRITE],
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      database.insert(memberToRoleTable).values({ A: 3, B: "writers" }),
    );

    const createKill = makeKillCreation(database, cache);

    const report = (id: 1 | 2 | 3, party?: CreateKillRequest["party"]) => {
      const request: CreateKillRequest = {
        ...payload,
        accountId: `account-${id}`,
        characterId: `character-${id}`,
      };

      return boundary.run(
        createKill(`discord-${id}`, party ? { ...request, party } : request),
      );
    };

    await report(1);
    await report(2, [
      { prof: "w", lvl: 100, alive: true },
      { prof: "m", lvl: 100, alive: true },
    ]);
    await report(3);
    await report(1);

    for (const key of claims.keys())
      if (key.includes(":guild:123:")) claims.delete(key);
    await report(1);

    expect(
      (await boundary.run(database.select().from(guildKillBucketTable)))
        .map(({ guildId, kills }) => ({ guildId, kills }))
        .toSorted((a, b) => a.guildId.localeCompare(b.guildId)),
    ).toEqual([
      { guildId: "123", kills: 2 },
      { guildId: "456", kills: 1 },
    ]);
    expect(
      (await boundary.run(database.select().from(guildKillDayTable)))
        .map(({ guildId, kills, hours }) => ({
          guildId,
          kills,
          hours: hours.filter((count) => count > 0),
          slots: hours.length,
        }))
        .toSorted((a, b) => a.guildId.localeCompare(b.guildId)),
    ).toEqual([
      { guildId: "123", kills: 2, hours: [2], slots: 24 },
      { guildId: "456", kills: 1, hours: [1], slots: 24 },
    ]);
    expect(
      (await boundary.run(database.select().from(bossKillTable))).map(
        ({ guildIds, partyWarriors, partyMages, partyHunters }) => ({
          guildIds,
          partyWarriors,
          partyMages,
          partyHunters,
        }),
      ),
    ).toEqual([
      {
        guildIds: ["123", "456"],
        partyWarriors: 1,
        partyMages: 1,
        partyHunters: 0,
      },
    ]);
  } finally {
    await boundary.dispose();
  }
});
