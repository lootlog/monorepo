import { expect, test } from "bun:test";
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
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { makeMemberDelivery } from "#src/members/member-delivery.operations";
import { makeMemberStore } from "#src/members/member.store";
import { makeGuildLifecycle } from "./guild-lifecycle.operations.js";

test("Discord role revocation and deletion rebalance only active holders, survive failed delivery, and ignore cosmetic edits", async () => {
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
    const delivered: string[] = [];
    let failInvalidation = true;
    let failDelivery = false;

    const delivery = makeMemberDelivery(makeMemberStore(boundary.database), {
      clearMemberCaches: () => Effect.void,
      publishMemberRemoved: () => Effect.void,
      invalidateMember: ({ discordId }) =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.sync(() => {
              invalidated.add(discordId);
            }),
      publishMemberUpdated: ({ discordId }) =>
        Effect.gen(function* () {
          expect(invalidated.has(discordId)).toBe(true);

          if (failDelivery)
            return yield* Effect.fail(new Error("broker unavailable"));

          expect(
            yield* selectAccessibleGuilds(boundary.database, discordId),
          ).toEqual([]);
          delivered.push(discordId);
        }),
    });

    const lifecycle = makeGuildLifecycle(boundary.database, {
      invalidateUserGuildPermissions: () => Effect.void,
      clearCacheKey: () => Effect.void,
      clearCachePattern: () => Effect.void,
      deliverMemberChanges: delivery.deliverAll,
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
    failInvalidation = false;
    // The redelivered event sees no change; the committed outbox row repairs it.
    await boundary.run(lifecycle.upsertRole(role));
    expect(delivered).toEqual([]);
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual(["discord-1"]);
    expect(invalidated.has("other-discord")).toBe(false);

    // A rename or recolor leaves every permission projection unchanged.
    delivered.length = 0;
    invalidated.clear();
    await boundary.run(
      lifecycle.upsertRole({ ...role, name: "Renamed", color: 0xff0000 }),
    );
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual([]);
    expect(invalidated.size).toBe(0);

    // Deleting the now permissionless role changes no projection either.
    await boundary.run(lifecycle.deleteRole(role));
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual([]);

    await boundary.run(
      boundary.database.insert(roleTable).values({
        id: "role-2",
        guildId: "guild-1",
        name: "Reader",
        permissions: [Permission.LOOTLOG_ACCESS],
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values({ A: 1, B: "role-2" }),
    );
    const reader = { ...role, id: "role-2", name: "Reader" };
    failDelivery = true;
    await expect(boundary.run(lifecycle.deleteRole(reader))).rejects.toThrow(
      "broker unavailable",
    );
    failDelivery = false;
    // Holders were queued before the assignments cascaded with the role.
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual(["discord-1"]);
  } finally {
    await boundary.dispose();
  }
});

test("Organization removal revokes members through the outbox and the owner's aggregate projection", async () => {
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
    let failInvalidation = true;
    const delivered: string[] = [];
    const invalidatedOwners: string[] = [];

    const delivery = makeMemberDelivery(makeMemberStore(boundary.database), {
      clearMemberCaches: () =>
        failInvalidation
          ? Effect.fail(new Error("cache unavailable"))
          : Effect.void,
      publishMemberRemoved: ({ discordId, globalUserId }) =>
        Effect.gen(function* () {
          expect(
            yield* selectAccessibleGuilds(boundary.database, discordId),
          ).toEqual([]);
          delivered.push(globalUserId);
        }),
      invalidateMember: () => Effect.void,
      publishMemberUpdated: () => Effect.void,
    });

    const lifecycle = makeGuildLifecycle(boundary.database, {
      invalidateUserGuildPermissions: (discordId) =>
        Effect.sync(() => {
          invalidatedOwners.push(discordId);
        }),
      clearCacheKey: () => Effect.void,
      clearCachePattern: () => Effect.void,
      deliverMemberChanges: delivery.deliverAll,
    });

    const removeGuild = () =>
      boundary.run(lifecycle.deleteGuild({ guildId: "guild-1" }));

    await expect(removeGuild()).rejects.toThrow("cache unavailable");
    expect(delivered).toEqual([]);
    failInvalidation = false;
    await removeGuild();
    await boundary.run(delivery.dispatchPending());
    expect(delivered).toEqual(["user-1"]);
    expect(invalidatedOwners).toEqual(["owner-1"]);
  } finally {
    await boundary.dispose();
  }
});
