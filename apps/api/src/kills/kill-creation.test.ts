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
  npcKillStatsBucketTable,
  userKillStatsBucketTable,
  guildKillSummaryBucketTable,
} from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { applicationLogger as logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import { sql } from "drizzle-orm";
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
        deleteIfValue: () => Effect.succeed(0),
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
        deleteIfValue: () => Effect.succeed(0),
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
    deleteIfValue: () => Effect.succeed(0),
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

for (const { name, failingTable, failedTotalTable } of [
  {
    name: "personal",
    failingTable: userKillStatsBucketTable,
    failedTotalTable: userKillStatsTable,
  },
  {
    name: "member",
    failingTable: npcKillStatsBucketTable,
    failedTotalTable: npcKillStatsTable,
  },
]) {
  it(`retries rolled-back writes to ${name} stats without duplicating successful destinations`, async () => {
    const boundary = await createDatabaseBoundary();
    const claims = new Map<string, string>();
    const cache: KillCreationCache = {
      deleteByPattern: () => Effect.succeed(0),
      setNx: (key, token) =>
        Effect.sync(() => {
          if (claims.has(key)) return false;
          claims.set(key, token);
          return true;
        }),
      deleteIfValue: (key, token) =>
        Effect.sync(() => {
          if (claims.get(key) === token) claims.delete(key);
        }),
    };
    try {
      const database = boundary.database;
      await boundary.run(
        database
          .insert(guildTable)
          .values(createGuildFixture({ id: "123", ownerId: "discord-1" })),
      );
      await boundary.run(
        database.insert(memberTable).values(
          createMemberFixture({
            id: 1,
            guildId: "123",
            userId: "discord-1",
            globalUserId: "user",
          }),
        ),
      );
      await boundary.run(
        database.insert(userCharactersLootlogSettingsTable).values({
          userId: "discord-1",
          accountId: payload.accountId,
          characterId: payload.characterId,
          catchingGuildIds: ["123"],
          updatedAt: new Date(),
        }),
      );
      await boundary.run(
        database.execute(
          sql`ALTER TABLE ${failingTable} ADD CONSTRAINT fail_write CHECK (false)`,
        ),
      );
      const personalData = failingTable === userKillStatsBucketTable;
      const request = makeKillCreation(
        database,
        cache,
        logger,
      )("discord-1", payload).pipe(
        Effect.provideService(ForwardAuthIdentity, {
          userId: "user",
          discordId: "discord-1",
          apiKey: {
            keyId: "key",
            organizationIds: ["123"],
            mode: "read-write",
            personalData,
            expiresAt: null,
          },
        }),
      );
      await boundary.run(request);
      expect(
        await boundary.run(database.select().from(failedTotalTable)),
      ).toEqual([]);
      await boundary.run(
        database.execute(
          sql`ALTER TABLE ${failingTable} DROP CONSTRAINT fail_write`,
        ),
      );
      await boundary.run(request);
      expect(await boundary.run(request)).toEqual({
        deduplicated: true,
        updated: 0,
      });
      expect(
        (await boundary.run(database.select().from(npcKillStatsTable))).map(
          (row) => row.memberKills,
        ),
      ).toEqual([1]);
      expect(
        (
          await boundary.run(database.select().from(npcKillStatsBucketTable))
        ).map((row) => row.memberKills),
      ).toEqual([1]);
      expect(
        (await boundary.run(database.select().from(guildKillSummaryTable))).map(
          (row) => row.uniqueKills,
        ),
      ).toEqual([1]);
      expect(
        (
          await boundary.run(
            database.select().from(guildKillSummaryBucketTable),
          )
        ).map((row) => row.uniqueKills),
      ).toEqual([1]);
      expect(
        (await boundary.run(database.select().from(userKillStatsTable))).map(
          (row) => row.totalKills,
        ),
      ).toEqual(personalData ? [1] : []);
      expect(
        (
          await boundary.run(database.select().from(userKillStatsBucketTable))
        ).map((row) => row.totalKills),
      ).toEqual(personalData ? [1] : []);
    } finally {
      await boundary.dispose();
    }
  });
}

it("does not release a replacement claim when a failed write outlives its claim", async () => {
  const boundary = await createDatabaseBoundary();
  const claims = new Map<string, string>();
  const replacementToken = "replacement-owner";
  const cache: KillCreationCache = {
    deleteByPattern: () => Effect.succeed(0),
    setNx: (key, token) =>
      Effect.sync(() => {
        if (claims.has(key)) return false;
        claims.set(key, token);
        return true;
      }),
    deleteIfValue: (key, token) =>
      Effect.sync(() => {
        // The original claim expired and another request acquired it before cleanup.
        claims.set(key, replacementToken);
        if (claims.get(key) === token) claims.delete(key);
      }),
  };
  try {
    const database = boundary.database;
    await boundary.run(
      database.execute(
        sql`ALTER TABLE ${userKillStatsBucketTable} ADD CONSTRAINT fail_write CHECK (false)`,
      ),
    );
    const request = makeKillCreation(
      database,
      cache,
      logger,
    )("discord-1", payload);
    await boundary.run(request);
    expect([...claims.values()]).toEqual([replacementToken]);
    await boundary.run(
      database.execute(
        sql`ALTER TABLE ${userKillStatsBucketTable} DROP CONSTRAINT fail_write`,
      ),
    );
    expect(await boundary.run(request)).toEqual({
      deduplicated: true,
      updated: 0,
    });
    expect(
      await boundary.run(database.select().from(userKillStatsTable)),
    ).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});
