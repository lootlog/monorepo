import { expect, test, mock } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../../test/database-fixtures.js";
import { Permission } from "@lootlog/schema/permissions";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import {
  UserLootlogConfigData,
  type UserLootlogConfigCache,
} from "./user-lootlog-config.handlers.js";

test("key config updates preserve other organizations and never reuse the unrestricted account cache", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const getOrSetJsonEffect = mock(() => Effect.die("unscoped cache read"));

    const cache: UserLootlogConfigCache = {
      getOrSetJsonEffect,
      invalidateScopes: () => Effect.void,
    };

    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "1", ownerId: "discord-1" }),
          createGuildFixture({ id: "2", ownerId: "discord-1" }),
        ]),
    );
    await boundary.run(
      boundary.database.insert(userCharactersLootlogSettingsTable).values({
        userId: "discord-1",
        accountId: "account",
        characterId: "character",
        catchingGuildIds: ["1", "2"],
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }),
    );

    const result = await boundary.run(
      Effect.gen(function* () {
        const data = yield* UserLootlogConfigData;
        const before = yield* data.getAccount("discord-1", "account");

        const updated = yield* data.upsertCharacter("discord-1", "account", {
          characterId: "character",
          catchingGuildIds: [],
        });

        const batch = yield* data.getPlayersCatchingGuilds("discord-1", {
          players: [
            {
              userId: "discord-1",
              accountId: "account",
              characterId: "character",
            },
          ],
        });

        return { before, updated, batch };
      }).pipe(
        Effect.provide(UserLootlogConfigData.layerDatabase(cache)),
        Effect.provideService(ForwardAuthIdentity, {
          userId: "user-1",
          discordId: "discord-1",
          apiKey: {
            keyId: "key-1",
            organizationIds: ["1"],
            mode: "read-write",
            personalData: true,
            expiresAt: null,
          },
        }),
      ),
    );

    expect(result.before).toMatchObject({
      character: { catchingGuildIds: ["1"] },
    });
    expect(result.updated).toMatchObject({ catchingGuildIds: [] });
    expect(result.batch).toMatchObject({ players: [{ guilds: [] }] });
    expect(
      (
        await boundary.run(
          boundary.database.select().from(userCharactersLootlogSettingsTable),
        )
      )[0]?.catchingGuildIds,
    ).toEqual(["2"]);
    expect(getOrSetJsonEffect).not.toHaveBeenCalled();
  } finally {
    await boundary.dispose();
  }
});

test("players stop showing Organizations whose Discord server they left", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "stayed", ownerId: "viewer" }),
          createGuildFixture({ id: "left", ownerId: "viewer" }),
        ]),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values(
        ["stayed", "left"].map((guildId) => ({
          id: `role-${guildId}`,
          guildId,
          name: "Member",
          permissions: [Permission.LOOTLOG_LOOTS_WRITE],
          updatedAt: new Date(0),
        })),
      ),
    );
    await boundary.run(
      boundary.database.insert(memberTable).values([
        createMemberFixture({
          id: 1,
          userId: "player",
          guildId: "stayed",
          globalUserId: "player-user",
        }),
        createMemberFixture({
          id: 2,
          userId: "player",
          guildId: "left",
          globalUserId: "player-user",
          active: false,
        }),
      ]),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values([
        { A: 1, B: "role-stayed" },
        { A: 2, B: "role-left" },
      ]),
    );
    await boundary.run(
      boundary.database.insert(userCharactersLootlogSettingsTable).values({
        userId: "player",
        accountId: "account",
        characterId: "character",
        catchingGuildIds: ["stayed", "left"],
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }),
    );

    const batch = await boundary.run(
      Effect.gen(function* () {
        const data = yield* UserLootlogConfigData;

        return yield* data.getPlayersCatchingGuilds("viewer", {
          players: [
            {
              userId: "player",
              accountId: "account",
              characterId: "character",
            },
          ],
        });
      }).pipe(
        Effect.provide(
          UserLootlogConfigData.layerDatabase({
            getOrSetJsonEffect: () => Effect.die("unexpected cache read"),
            invalidateScopes: () => Effect.void,
          }),
        ),
        Effect.provideService(ForwardAuthIdentity, {
          userId: "viewer-user",
          discordId: "viewer",
        }),
      ),
    );

    expect(batch).toMatchObject({
      players: [{ guilds: [{ id: "stayed" }] }],
    });
  } finally {
    await boundary.dispose();
  }
});
