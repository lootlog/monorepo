import { expect, test } from "bun:test";
import { GuildMemberFlags, type APIGuildMember } from "discord-api-types/v10";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import { guildTable, roleTable } from "#src/database/drizzle/schema";
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
    const removed: string[] = [];
    const store = makeMemberStore(boundary.database);

    const removal = makeMemberRemoval(boundary.database, {
      clearMemberCaches: ({ guildId, discordId }) =>
        Effect.sync(() => {
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
      invalidateMember: ({ guildId, discordId }) =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.sync(() => {
              invalidated.push(`${guildId}:${discordId}`);
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
