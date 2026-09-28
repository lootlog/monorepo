import { expect, test } from "bun:test";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type { GuildMemberChanged } from "@lootlog/protocol/rabbit/events";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { makeGuildLifecycle } from "./guild-lifecycle.operations.js";
import { makeMemberRemoval } from "#src/members/member-removal.operations";

test("Discord role revocation and deletion invalidate members before publishing and repair failed delivery on replay", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database
        .insert(guildTable)
        .values([
          createGuildFixture(),
          createGuildFixture({ id: "other-guild" }),
        ]),
    );
    await boundary.run(
      boundary.database.insert(memberTable).values([
        createMemberFixture({
          userId: "discord-1",
          globalUserId: "user-1",
          active: true,
        }),
        createMemberFixture({
          id: 2,
          userId: "other-discord",
          globalUserId: "other-user",
          guildId: "other-guild",
        }),
      ]),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values({
        id: "role-1",
        guildId: "guild-1",
        name: "Admin",
        permissions: [Permission.ADMIN, Permission.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values({ A: 1, B: "role-1" }),
    );
    const invalidated = new Set<string>();
    const delivered: Array<typeof GuildMemberChanged.Type> = [];
    let failInvalidation = true;
    let failDelivery = false;

    const lifecycle = makeGuildLifecycle(boundary.database, {
      clearCacheKey: () => Effect.void,
      clearCachePattern: () => Effect.void,
      notifyMembersRemoved: () => Effect.void,
      invalidateUserGuildPermissions: (discordId) =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.sync(() => {
              invalidated.add(discordId);
            }),
      publishMemberPolicyChanged: (member) =>
        Effect.gen(function* () {
          expect(invalidated.has(member.discordId)).toBe(true);

          if (failDelivery)
            return yield* Effect.fail(new Error("broker unavailable"));

          const current = yield* selectAccessibleGuilds(
            boundary.database,
            member.discordId,
          );

          expect(current).toEqual([]);
          delivered.push(member);
        }),
    });

    const role = {
      guildId: "guild-1",
      id: "role-1",
      name: "Member",
      color: 0,
      position: 0,
      admin: false,
    };

    await expect(boundary.run(lifecycle.upsertRole(role))).rejects.toThrow(
      "cache unavailable",
    );
    expect(delivered).toEqual([]);
    failInvalidation = false;
    await boundary.run(lifecycle.upsertRole(role));
    expect(delivered).toEqual([
      { guildId: "guild-1", discordId: "discord-1", userId: "user-1" },
    ]);
    expect(invalidated.has("other-discord")).toBe(false);

    delivered.length = 0;
    failDelivery = true;
    await expect(boundary.run(lifecycle.deleteRole(role))).rejects.toThrow(
      "broker unavailable",
    );
    failDelivery = false;
    await boundary.run(lifecycle.deleteRole(role));
    expect(delivered).toEqual([
      { guildId: "guild-1", discordId: "discord-1", userId: "user-1" },
    ]);
  } finally {
    await boundary.dispose();
  }
});

test("Organization removal retries member revocation after persisted deactivation and notification failure", async () => {
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
    await boundary.run(
      boundary.database.insert(roleTable).values({
        id: "role-1",
        guildId: "guild-1",
        name: "Reader",
        permissions: [Permission.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values({ A: 1, B: "role-1" }),
    );
    expect(
      await boundary.run(
        selectAccessibleGuilds(boundary.database, "discord-1"),
      ),
    ).toHaveLength(1);
    let failInvalidation = true;
    let failDelivery = false;
    const delivered: string[] = [];

    const removal = makeMemberRemoval(boundary.database, {
      clearMemberCaches: () =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.void,
      publishMemberRemoved: ({ discordId, globalUserId }) =>
        Effect.gen(function* () {
          if (failDelivery)
            return yield* Effect.fail(new Error("broker unavailable"));
          expect(
            yield* selectAccessibleGuilds(boundary.database, discordId),
          ).toEqual([]);
          delivered.push(globalUserId);
        }),
    });

    const lifecycle = makeGuildLifecycle(boundary.database, {
      clearCacheKey: () => Effect.void,
      clearCachePattern: () => Effect.void,
      invalidateUserGuildPermissions: () => Effect.void,
      publishMemberPolicyChanged: () => Effect.void,
      notifyMembersRemoved: removal.notifyMembersRemoved,
    });

    const removeGuild = () =>
      boundary.run(lifecycle.deleteGuild({ guildId: "guild-1" }));

    await expect(removeGuild()).rejects.toThrow("cache unavailable");
    expect(delivered).toEqual([]);
    expect(
      await boundary.run(
        selectAccessibleGuilds(boundary.database, "discord-1"),
      ),
    ).toEqual([]);
    failInvalidation = false;
    failDelivery = true;
    await expect(removeGuild()).rejects.toThrow("broker unavailable");
    failDelivery = false;
    await removeGuild();
    expect(delivered).toEqual(["user-1"]);
  } finally {
    await boundary.dispose();
  }
});
