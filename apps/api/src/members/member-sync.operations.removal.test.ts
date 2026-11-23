import { expect, test } from "bun:test";
import { RedisError } from "effect/persistence/Redis";
import { GuildMemberFlags, type APIGuildMember } from "discord-api-types/v10";
import { Effect } from "effect";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import {
  guildTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import { MEMBER_LAST_DISCORD_STATUS } from "./member-discord-status.js";
import { makeMemberDelivery } from "./member-delivery.operations.js";
import { makeMemberStore } from "./member.repository.js";
import { makeMemberSync } from "./member-sync.operations.js";
import { createSyncBoundary } from "./member-sync.operations.fixtures.js";

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
        permissions: [Capability.LOOTLOG_LOOTS_WRITE],
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
    const removed: string[] = [];
    const store = makeMemberStore(boundary.database);

    const delivery = makeMemberDelivery(store, {
      clearMemberCaches: ({ guildId, discordId }) =>
        Effect.sync(() => {
          invalidated.push(`${guildId}:${discordId}`);
        }),
      publishMemberRemoved: ({ globalUserId }) =>
        Effect.sync(() => {
          removed.push(globalUserId);
        }),
      publishMemberUpdated: () => Effect.void,
      invalidateMember: ({ guildId, discordId }) =>
        failInvalidation
          ? Effect.fail(new RedisError({ cause: "cache unavailable" }))
          : Effect.sync(() => {
              invalidated.push(`${guildId}:${discordId}`);
            }),
    });

    const sync = makeMemberSync(store, delivery, {
      getGuildMember: () =>
        notFound
          ? Effect.fail(new ResourceNotFoundError("Member not found"))
          : Effect.succeed(discordMember),
      nextRefreshAt: () => Effect.succeed(null),
      refreshPermissionCache: () => Effect.void,
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
    await expect(refresh()).rejects.toThrow();

    const persisted = await boundary.run(
      store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(persisted?.roles).toEqual([]);
    expect(persisted?.active).toBe(true);

    failInvalidation = false;
    const retried = await refresh();
    expect(retried.member?.roles).toEqual([]);
    expect(retried.member?.lastDiscordStatus).toBe("SUCCESS");
    expect(invalidated).toEqual(["guild-1:discord-1", "guild-1:discord-1"]);

    discordMember = { ...discordMember, roles: ["role-1"] };
    await refresh();
    notFound = true;
    const deactivated = await refresh();
    expect(deactivated.status).toBe("NOT_FOUND");
    expect(deactivated.member?.active).toBe(false);
    expect(deactivated.member?.roles).toEqual([]);
    expect(removed).toEqual(["user-1"]);
    expect(invalidated).toHaveLength(4);

    const storedRemoval = await boundary.run(
      store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(storedRemoval?.active).toBe(false);
    expect(storedRemoval?.roles).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("removal retries without another Discord request and reactivation publishes a real change", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.error = new ResourceNotFoundError("Member not found");
    boundary.state.failDelivery = true;
    await expect(boundary.refresh()).rejects.toThrow();

    const removed = await boundary.run(
      boundary.store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(removed).toMatchObject({ active: false, roles: [] });
    expect(await boundary.pending()).toMatchObject([
      { permissionsChanged: true },
    ]);

    boundary.events.length = 0;
    boundary.state.failDelivery = false;
    await boundary.run(boundary.makeDelivery().dispatchPending());
    expect(boundary.events).toEqual(["cache", "removed"]);
    boundary.events.length = 0;
    await boundary.refresh();
    expect(boundary.events).toEqual([]);

    boundary.state.error = undefined;
    const reactivated = await boundary.refresh();
    expect(reactivated.member?.active).toBe(true);
    expect(reactivated.member?.roles.map(({ id }) => id).sort()).toEqual([
      "role-1",
      "role-2",
    ]);
    expect(boundary.events).toEqual(["cache", "updated", "freshness"]);
  } finally {
    await boundary.dispose();
  }
});

test("a guild missing from Discord still publishes removal after a cache failure without replaying it", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.failCache = true;

    const deactivateMissing = () =>
      boundary.run(
        boundary.removal.deactivateMembersMissingFromDiscordGuilds({
          discordId: "discord-1",
          userId: "user-1",
          activeDiscordGuildIds: ["other-guild"],
          status: MEMBER_LAST_DISCORD_STATUS.GUILD_NOT_IN_DISCORD_LIST,
        }),
      );

    await expect(deactivateMissing()).rejects.toThrow();
    expect(
      await boundary.run(
        boundary.store.findMemberWithRoles("discord-1", "guild-1"),
      ),
    ).toMatchObject({ active: false, roles: [] });
    expect(await boundary.pending()).toMatchObject([
      { permissionsChanged: true },
    ]);

    expect(await deactivateMissing()).toBe(0);
    expect(boundary.events).toEqual([]);

    boundary.state.failCache = false;
    await boundary.run(boundary.makeDelivery().dispatchPending());
    expect(boundary.events).toEqual(["cache", "removed"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});
