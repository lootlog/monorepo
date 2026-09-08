import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  userCharactersLootlogSettingsTable,
  userKillStatsTable,
  npcKillStatsTable,
  guildKillSummaryTable,
} from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { applicationLogger as logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import { describe, expect, it } from "bun:test";

import type { CreateKillRequest } from "#src/contracts/kills/schemas";
import {
  KillCreationError,
  makeKillCreation,
  type KillCreationCache,
} from "./kill-creation.js";

const payload = {
  world: "tempest",
  accountId: "account-1",
  characterId: "character-1",
  npc: { id: 123, name: "Mushita", lvl: 100, wt: 80 },
} satisfies CreateKillRequest;

describe("kill creation Effect module", () => {
  it("returns the established dedup response when no new destination accepts a kill", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const cache: KillCreationCache = {
        deleteByPattern: () => Effect.succeed(0),
        setNx: () => Effect.succeed(false),
      };
      const createKill = makeKillCreation(boundary.database, cache, logger);

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
        deleteByPattern: () => Effect.succeed(0),
        setNx: () => Effect.fail(new Error("redis unavailable")),
      };
      const createKill = makeKillCreation(boundary.database, cache, logger);

      await expect(
        boundary.run(createKill("discord-1", payload)),
      ).rejects.toBeInstanceOf(KillCreationError);
    } finally {
      await boundary.dispose();
    }
  });
});

it("a scoped key cannot suppress later personal or other-organization kill records", async () => {
  const boundary = await createDatabaseBoundary();
  const keys = new Set<string>();
  const cache: KillCreationCache = {
    deleteByPattern: () => Effect.succeed(0),
    setNx: (key) =>
      Effect.sync(() => {
        if (keys.has(key)) return false;
        keys.add(key);
        return true;
      }),
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
    const createKill = makeKillCreation(database, cache, logger);
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
      await boundary.run(database.select().from(userKillStatsTable)),
    ).toEqual([]);
    expect(await boundary.run(createKill("discord-1", payload))).toEqual({
      updated: 1,
    });
    expect(await boundary.run(createKill("discord-1", payload))).toEqual({
      deduplicated: true,
      updated: 0,
    });
    expect(await boundary.run(keyRequest)).toEqual({
      deduplicated: true,
      updated: 0,
    });
    expect(
      (await boundary.run(database.select().from(userKillStatsTable))).map(
        ({ totalKills }) => totalKills,
      ),
    ).toEqual([1]);
    expect(
      (await boundary.run(database.select().from(npcKillStatsTable))).map(
        ({ memberKills }) => memberKills,
      ),
    ).toEqual([1, 1]);
    expect(
      (await boundary.run(database.select().from(guildKillSummaryTable))).map(
        ({ uniqueKills }) => uniqueKills,
      ),
    ).toEqual([1, 1]);
  } finally {
    await boundary.dispose();
  }
});
