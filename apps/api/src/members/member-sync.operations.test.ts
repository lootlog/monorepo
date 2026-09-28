import { expect, test } from "bun:test";
import { GuildMemberFlags, type APIGuildMember } from "discord-api-types/v10";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { applicationLogger } from "#src/shared/application-logger";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { makeMemberRemoval } from "./member-removal.operations.js";
import { makeMemberStore } from "./member.store.js";
import { makeMemberSync } from "./member-sync.operations.js";

test("member sync retries invalidation after a committed role change and clears access on removal", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values({
        id: "role-1",
        guildId: "guild-1",
        name: "Writer",
        permissions: [Permission.LOOTLOG_LOOTS_WRITE],
        updatedAt: new Date(0),
      }),
    );

    let discordMember: APIGuildMember = {
      user: {
        id: "discord-1",
        username: "Member",
        discriminator: "0",
        avatar: null,
        global_name: null,
      },
      roles: ["role-1"],
      joined_at: "2026-01-01T00:00:00.000Z",
      deaf: false,
      mute: false,
      flags: GuildMemberFlags.CompletedOnboarding,
    };

    let notFound = false;
    let failInvalidation = false;
    const invalidated: string[] = [];
    const readProjectionChanges: boolean[] = [];
    const removed: string[] = [];
    const store = makeMemberStore(boundary.database);

    const removal = makeMemberRemoval(boundary.database, {
      clearMemberCaches: ({ guildId, discordId }) =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.sync(() => {
              invalidated.push(`${guildId}:${discordId}`);
            }),
      publishMemberRemoved: ({ globalUserId }) =>
        Effect.sync(() => {
          removed.push(globalUserId);
        }),
    });

    const sync = makeMemberSync(applicationLogger, store, removal, {
      getGuildMember: () =>
        notFound
          ? Effect.fail(new ResourceNotFoundError("Member not found"))
          : Effect.succeed(discordMember),
      nextRefreshAt: () => Effect.succeed(null),
      invalidateMember: ({ guildId, discordId, readProjectionChanged }) =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.sync(() => {
              invalidated.push(`${guildId}:${discordId}`);
              readProjectionChanges.push(readProjectionChanged);
            }),
    });

    const refresh = () =>
      boundary.run(
        sync.syncMemberFromDiscord({
          discordId: "discord-1",
          guildId: "guild-1",
          userId: "user-1",
        }),
      );

    const initial = await refresh();
    expect(initial.member?.roles.map(({ id }) => id)).toEqual(["role-1"]);
    expect(invalidated).toEqual(["guild-1:discord-1"]);

    discordMember = { ...discordMember, roles: [] };
    failInvalidation = true;
    await expect(refresh()).rejects.toThrow("cache unavailable");

    const persisted = await boundary.run(
      store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(persisted?.roles).toEqual([]);
    expect(persisted?.active).toBe(true);

    // The retry sees unchanged persisted roles but must repair invalidation.
    failInvalidation = false;
    const retried = await refresh();
    expect(retried.member?.roles).toEqual([]);
    expect(retried.member?.lastDiscordStatus).toBe("SUCCESS");
    expect(invalidated).toEqual(["guild-1:discord-1", "guild-1:discord-1"]);

    discordMember = { ...discordMember, roles: ["role-1"] };
    await refresh();
    await refresh();
    discordMember = { ...discordMember, nick: "Renamed" };
    await refresh();
    // Guild member lists are evicted only for syncs that change what they show.
    expect(readProjectionChanges).toEqual([true, false, true, false, true]);
    notFound = true;
    failInvalidation = true;
    await expect(refresh()).rejects.toThrow("cache unavailable");
    expect(removed).toEqual([]);
    expect(
      (await boundary.run(store.findMember("discord-1", "guild-1")))?.active,
    ).toBe(false);
    failInvalidation = false;
    const deactivated = await refresh();
    expect(deactivated.status).toBe("NOT_FOUND");
    expect(deactivated.member?.active).toBe(false);
    expect(deactivated.member?.roles).toEqual([]);
    expect(removed).toEqual(["user-1"]);
    expect(invalidated).toHaveLength(6);

    const storedRemoval = await boundary.run(
      store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(storedRemoval?.active).toBe(false);
    expect(storedRemoval?.roles).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("missing Discord membership retries invalidation and removal delivery after deactivation committed", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      boundary.database
        .insert(memberTable)
        .values(
          createMemberFixture({ userId: "discord-1", globalUserId: "user-1" }),
        ),
    );
    let failInvalidation = true;
    let failDelivery = false;
    const delivered: string[] = [];

    const removal = makeMemberRemoval(boundary.database, {
      clearMemberCaches: () =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.void,
      publishMemberRemoved: ({ globalUserId }) =>
        failDelivery
          ? Effect.fail(new Error("broker unavailable"))
          : Effect.sync(() => {
              delivered.push(globalUserId);
            }),
    });

    const removeMissing = () =>
      boundary.run(
        removal.deactivateMembersMissingFromDiscordGuilds({
          discordId: "discord-1",
          userId: "user-1",
          activeDiscordGuildIds: [],
          status: "GUILD_NOT_IN_DISCORD_LIST",
        }),
      );

    await expect(removeMissing()).rejects.toThrow("cache unavailable");
    expect(delivered).toEqual([]);
    expect(
      (
        await boundary.run(
          makeMemberStore(boundary.database).findMember("discord-1", "guild-1"),
        )
      )?.active,
    ).toBe(false);
    failInvalidation = false;
    failDelivery = true;
    await expect(removeMissing()).rejects.toThrow("broker unavailable");
    failDelivery = false;
    expect(await removeMissing()).toBe(0);
    expect(delivered).toEqual(["user-1"]);
  } finally {
    await boundary.dispose();
  }
});
