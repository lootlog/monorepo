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
  userKillBucketTable,
  userKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  guildKillBucketTable,
  guildKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { expect, it } from "bun:test";
import { makeKillCreation, type KillCreationCache } from "./kill-creation.js";
import { payload } from "./kill-creation.fixtures.js";

for (const { name, failingTable, failedTotalTable } of [
  {
    name: "personal",
    failingTable: userKillBucketTable,
    failedTotalTable: userKillTotalTable,
  },
  {
    name: "member",
    failingTable: memberKillBucketTable,
    failedTotalTable: memberKillTotalTable,
  },
]) {
  it(`retries rolled-back writes to ${name} stats without duplicating successful destinations`, async () => {
    const boundary = await createDatabaseBoundary();
    const claims = new Map<string, string>();

    const cache: KillCreationCache = {
      invalidateScopes: () => Effect.succeed(0),
      setNx: (key, token) =>
        Effect.sync(() => {
          if (claims.has(key)) return false;
          claims.set(key, token);

          return true;
        }),
      setNxGet: () => Effect.succeed(null),
      deleteIfValue: (key, token) =>
        Effect.sync(() => {
          return Number(claims.get(key) === token && claims.delete(key));
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
      const personalData = failingTable === userKillBucketTable;

      const request = makeKillCreation(database, cache)(
        "discord-1",
        payload,
      ).pipe(
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
      expect(await boundary.run(database.select().from(failingTable))).toEqual(
        [],
      );
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

      for (const [table, kills] of [
        [memberKillTotalTable, [1]],
        [memberKillBucketTable, [1]],
        [guildKillTotalTable, [1]],
        [guildKillBucketTable, [1]],
        [userKillTotalTable, personalData ? [1] : []],
        [userKillBucketTable, personalData ? [1] : []],
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
}

it("does not release a replacement claim when a failed write outlives its claim", async () => {
  const boundary = await createDatabaseBoundary();
  const claims = new Map<string, string>();
  const replacementToken = "replacement-owner";

  const cache: KillCreationCache = {
    invalidateScopes: () => Effect.succeed(0),
    setNx: (key, token) =>
      Effect.sync(() => {
        if (claims.has(key)) return false;
        claims.set(key, token);

        return true;
      }),
    setNxGet: () => Effect.succeed(null),
    deleteIfValue: (key, token) =>
      Effect.sync(() => {
        claims.set(key, replacementToken);

        return Number(claims.get(key) === token && claims.delete(key));
      }),
  };

  try {
    const database = boundary.database;
    await boundary.run(
      database.execute(
        sql`ALTER TABLE ${userKillBucketTable} ADD CONSTRAINT fail_write CHECK (false)`,
      ),
    );

    const request = makeKillCreation(database, cache)("discord-1", payload);

    await boundary.run(request);
    expect([...claims.values()]).toEqual([replacementToken]);
    await boundary.run(
      database.execute(
        sql`ALTER TABLE ${userKillBucketTable} DROP CONSTRAINT fail_write`,
      ),
    );
    expect(await boundary.run(request)).toEqual({
      deduplicated: true,
      updated: 0,
    });
    expect(
      await boundary.run(database.select().from(userKillTotalTable)),
    ).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

it("rolls back the first member's kill with its failed guild write and lets another member count it", async () => {
  const boundary = await createDatabaseBoundary();
  const claims = new Map<string, string>();

  const cache: KillCreationCache = {
    invalidateScopes: () => Effect.succeed(0),
    setNx: (key, token) =>
      Effect.sync(() => {
        if (claims.has(key)) return false;
        claims.set(key, token);

        return true;
      }),
    setNxGet: () => Effect.succeed(null),
    deleteIfValue: (key, token) =>
      Effect.sync(() => {
        return Number(claims.get(key) === token && claims.delete(key));
      }),
  };

  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(guildTable)
        .values(createGuildFixture({ id: "123", ownerId: "discord-1" })),
    );

    for (const [id, discordId] of [
      [1, "discord-1"],
      [2, "discord-2"],
    ] as const) {
      await boundary.run(
        database.insert(memberTable).values(
          createMemberFixture({
            id,
            guildId: "123",
            userId: discordId,
            globalUserId: `user-${id}`,
          }),
        ),
      );
      await boundary.run(
        database.insert(userCharactersLootlogSettingsTable).values({
          userId: discordId,
          accountId: `account-${id}`,
          characterId: `character-${id}`,
          catchingGuildIds: ["123"],
          updatedAt: new Date(),
        }),
      );
    }

    await boundary.run(
      database.insert(roleTable).values({
        id: "writers",
        guildId: "123",
        name: "Writers",
        permissions: [Capability.LOOTLOG_LOOTS_WRITE],
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      database.insert(memberToRoleTable).values({ A: 2, B: "writers" }),
    );

    const report = (id: 1 | 2) =>
      boundary.run(
        makeKillCreation(database, cache)(`discord-${id}`, {
          ...payload,
          accountId: `account-${id}`,
          characterId: `character-${id}`,
        }),
      );

    await boundary.run(
      database.execute(
        sql`ALTER TABLE ${guildKillBucketTable} ADD CONSTRAINT fail_write CHECK (false)`,
      ),
    );
    await report(1);
    await boundary.run(
      database.execute(
        sql`ALTER TABLE ${guildKillBucketTable} DROP CONSTRAINT fail_write`,
      ),
    );
    await report(2);

    expect(
      (await boundary.run(database.select().from(guildKillTotalTable))).map(
        ({ kills }) => kills,
      ),
    ).toEqual([1]);
    expect(
      (await boundary.run(database.select().from(memberKillTotalTable))).map(
        ({ kills }) => kills,
      ),
    ).toEqual([1]);
  } finally {
    await boundary.dispose();
  }
});
