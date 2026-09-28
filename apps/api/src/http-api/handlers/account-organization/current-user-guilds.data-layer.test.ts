import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
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
} from "#src/database/drizzle/schema";
import { makeCurrentUserGuilds } from "./current-user-guilds.data-layer.js";

test("guild list waits on Discord only for missing access and at most twice", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const guildIds = ["guild-a", "guild-b", "guild-c", "guild-d"];

    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values(guildIds.map((id) => createGuildFixture({ id }))),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values({
        id: "role-d",
        guildId: "guild-d",
        name: "Member",
        permissions: [Permission.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      }),
    );
    // Stored access synced long ago: stale, but already granting access.
    await boundary.run(
      boundary.database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          userId: "discord-1",
          guildId: "guild-d",
          globalUserId: "user-1",
          lastDiscordSyncAt: new Date(0),
        }),
      ),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values({ A: 1, B: "role-d" }),
    );

    const refreshed: string[] = [];
    const queued: string[] = [];

    const currentUserGuilds = makeCurrentUserGuilds(
      boundary.database,
      {
        accessibleFallback: () => Effect.succeed([]),
        deactivateMissing: () => Effect.void,
        discordGuilds: () =>
          Effect.succeed({
            fresh: false,
            stale: false,
            guilds: guildIds.map((id) => ({
              id,
              name: id,
              icon: null,
              banner: null,
              owner: false,
              permissions: "0",
              features: [],
            })),
          }),
        // Every synchronous refresh is rate limited and ends up queued.
        refreshMember: ({ guildId }) =>
          Effect.sync(() => {
            refreshed.push(guildId);

            return { refreshQueued: true };
          }),
        queueMember: ({ guildId }) =>
          Effect.sync(() => {
            queued.push(guildId);
          }),
      },
      RuntimeEnvironment.PROD,
    );

    const guilds = await boundary.run(
      currentUserGuilds({ userId: "user-1", discordId: "discord-1" }),
    );

    expect(refreshed).toEqual(["guild-a", "guild-b"]);
    expect(queued).toEqual(["guild-c", "guild-d"]);
    expect(guilds.find(({ id }) => id === "guild-d")).toMatchObject({
      hasLootlogAccess: true,
      isAccessDataStale: true,
    });
  } finally {
    await boundary.dispose();
  }
});

test("guild list past its max age reports every Organization as stale", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values(createGuildFixture({ id: "guild-a" })),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values({
        id: "role-a",
        guildId: "guild-a",
        name: "Member",
        permissions: [Permission.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      }),
    );
    // Member access synced just now, so only the list can be stale.
    await boundary.run(
      boundary.database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          userId: "discord-1",
          guildId: "guild-a",
          globalUserId: "user-1",
          lastDiscordSyncAt: new Date(),
        }),
      ),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values({ A: 1, B: "role-a" }),
    );

    const currentUserGuilds = makeCurrentUserGuilds(
      boundary.database,
      {
        accessibleFallback: () => Effect.succeed([]),
        deactivateMissing: () => Effect.void,
        discordGuilds: () =>
          Effect.succeed({
            fresh: false,
            stale: true,
            guilds: [
              {
                id: "guild-a",
                name: "guild-a",
                icon: null,
                banner: null,
                owner: false,
                permissions: "0",
                features: [],
              },
            ],
          }),
        refreshMember: () => Effect.succeed({ refreshQueued: false }),
        queueMember: () => Effect.void,
      },
      RuntimeEnvironment.PROD,
    );

    const guilds = await boundary.run(
      currentUserGuilds({ userId: "user-1", discordId: "discord-1" }),
    );

    expect(guilds).toMatchObject([
      { id: "guild-a", hasLootlogAccess: true, isAccessDataStale: true },
    ]);
  } finally {
    await boundary.dispose();
  }
});
