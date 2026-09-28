import { expect, test } from "bun:test";
import { GuildMemberFlags, type APIGuildMember } from "discord-api-types/v10";
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import {
  guildTable,
  roleTable,
  memberSyncDeliveryTable,
  memberToRoleTable,
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
      refreshPermissionCache: () => Effect.void,
      publishMemberUpdated: () => Effect.void,
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
    await expect(refresh()).rejects.toThrow();

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

type DiscordBoundaryState = {
  member: APIGuildMember;
  error: Error | undefined;
  failDelivery: boolean;
  failCache: boolean;
};

const createSyncBoundary = async () => {
  const boundary = await createDatabaseBoundary();
  await boundary.run(
    boundary.database
      .insert(guildTable)
      .values([
        createGuildFixture(),
        createGuildFixture({ id: "other-guild" }),
      ]),
  );
  await boundary.run(
    boundary.database.insert(roleTable).values([
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Reader",
        updatedAt: new Date(0),
      },
      {
        id: "role-2",
        guildId: "guild-1",
        name: "Writer",
        updatedAt: new Date(0),
      },
      { id: "role-3", guildId: "guild-1", name: "New", updatedAt: new Date(0) },
      {
        id: "foreign-role",
        guildId: "other-guild",
        name: "Foreign",
        updatedAt: new Date(0),
      },
    ]),
  );

  const state: DiscordBoundaryState = {
    member: {
      user: {
        id: "discord-1",
        username: "Member",
        discriminator: "0",
        avatar: null,
        global_name: null,
      },
      roles: ["role-1", "role-2"],
      joined_at: "2026-01-01T00:00:00.000Z",
      deaf: false,
      mute: false,
      flags: GuildMemberFlags.CompletedOnboarding,
    },
    error: undefined,
    failDelivery: false,
    failCache: false,
  };

  const events: string[] = [];
  const store = makeMemberStore(boundary.database);

  const clearCaches = () =>
    Effect.try(() => {
      if (state.failCache) throw new Error("cache unavailable");
      events.push("cache");
    });

  const publish = (event: string) =>
    Effect.try(() => {
      if (state.failDelivery) throw new Error("broker unavailable");
      events.push(event);
    });

  const removal = makeMemberRemoval(boundary.database, {
    clearMemberCaches: clearCaches,
    publishMemberRemoved: () => publish("removed"),
  });

  const makeSync = () =>
    makeMemberSync(
      applicationLogger,
      makeMemberStore(boundary.database),
      removal,
      {
        getGuildMember: () =>
          state.error ? Effect.fail(state.error) : Effect.succeed(state.member),
        nextRefreshAt: () => Effect.succeed(null),
        refreshPermissionCache: () =>
          Effect.sync(() => {
            events.push("freshness");
          }),
        invalidateMember: clearCaches,
        publishMemberUpdated: () => publish("updated"),
      },
    );

  const sync = makeSync();

  return {
    ...boundary,
    state,
    events,
    store,
    makeSync,
    sync,
    refresh: () =>
      boundary.run(
        sync.syncMemberFromDiscord({
          discordId: "discord-1",
          guildId: "guild-1",
          userId: "user-1",
        }),
      ),
    roleRows: () =>
      boundary.run(
        boundary.database
          .select({ id: memberToRoleTable.B, tuple: sql<string>`ctid::text` })
          .from(memberToRoleTable)
          .orderBy(memberToRoleTable.B),
      ),
    pending: () =>
      boundary.run(boundary.database.select().from(memberSyncDeliveryTable)),
  };
};

test("unchanged Discord membership refreshes freshness without rewriting roles or invalidating member views", async () => {
  const boundary = await createSyncBoundary();

  try {
    const initial = await boundary.refresh();
    const roles = await boundary.roleRows();
    boundary.events.length = 0;
    boundary.state.member.roles = [
      "role-2",
      "role-1",
      "role-2",
      "foreign-role",
      "unknown-role",
    ];

    const refreshed = await boundary.refresh();

    expect(refreshed.member?.updatedAt).toEqual(initial.member?.updatedAt);
    expect(
      refreshed.member?.lastDiscordSyncAt?.getTime(),
    ).toBeGreaterThanOrEqual(initial.member?.lastDiscordSyncAt?.getTime() ?? 0);
    expect(await boundary.roleRows()).toEqual(roles);
    expect(boundary.events).toEqual(["freshness"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("role deltas retain common rows and profile-only changes invalidate views without a permission update", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();

    const retained = (await boundary.roleRows()).find(
      ({ id }) => id === "role-2",
    );

    boundary.events.length = 0;
    boundary.state.member.roles = ["role-2", "role-3"];
    const changed = await boundary.refresh();

    expect(changed.member?.roles.map(({ id }) => id).sort()).toEqual([
      "role-2",
      "role-3",
    ]);
    expect(
      (await boundary.roleRows()).find(({ id }) => id === "role-2"),
    ).toEqual(retained);
    expect(boundary.events).toEqual(["cache", "updated", "freshness"]);

    boundary.events.length = 0;
    boundary.state.member = {
      ...boundary.state.member,
      nick: "New name",
      avatar: "new-avatar",
      banner: "new-banner",
    };
    const renamed = await boundary.refresh();
    expect(renamed.member).toMatchObject({
      name: "New name",
      avatar: "new-avatar",
      banner: "new-banner",
    });
    expect(boundary.events).toEqual(["cache", "freshness"]);
  } finally {
    await boundary.dispose();
  }
});

test("failed permission publication survives later profile changes and a restarted dispatcher", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.member.roles = [];
    boundary.state.failDelivery = true;
    await expect(boundary.refresh()).rejects.toThrow();
    boundary.state.member.nick = "Renamed while pending";
    await expect(boundary.refresh()).rejects.toThrow();
    expect(await boundary.pending()).toMatchObject([
      { permissionsChanged: true },
    ]);
    expect(
      (
        await boundary.run(
          boundary.store.findMemberWithRoles("discord-1", "guild-1"),
        )
      )?.roles,
    ).toEqual([]);

    boundary.events.length = 0;
    boundary.state.failDelivery = false;
    const restarted = boundary.makeSync();
    await boundary.run(restarted.dispatchPendingChanges());
    expect(boundary.events).toEqual(["cache", "updated"]);
    expect(await boundary.pending()).toEqual([]);
    boundary.events.length = 0;
    await boundary.refresh();
    expect(boundary.events).toEqual(["freshness"]);
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
    await boundary.run(boundary.makeSync().dispatchPendingChanges());
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

test("a transient Discord failure retains permissions and successful recovery remains a no-op", async () => {
  const boundary = await createSyncBoundary();

  try {
    const initial = await boundary.refresh();
    const roles = await boundary.roleRows();
    boundary.events.length = 0;
    boundary.state.error = new Error("Discord unavailable");
    await boundary.refresh();

    const failed = await boundary.run(
      boundary.store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(failed?.active).toBe(true);
    expect(failed?.lastDiscordSyncAt).toEqual(
      initial.member?.lastDiscordSyncAt,
    );
    expect(await boundary.roleRows()).toEqual(roles);
    expect(boundary.events).toEqual([]);

    boundary.state.error = undefined;
    await boundary.refresh();
    expect(boundary.events).toEqual(["freshness"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("cache failures delay permission publication until invalidation recovers", async () => {
  const boundary = await createSyncBoundary();

  try {
    await boundary.refresh();
    boundary.events.length = 0;
    boundary.state.member.roles = [];
    boundary.state.failCache = true;
    await expect(boundary.refresh()).rejects.toThrow();
    expect(boundary.events).toEqual([]);
    expect(await boundary.pending()).toMatchObject([
      { permissionsChanged: true },
    ]);

    boundary.state.failCache = false;
    await boundary.run(boundary.makeSync().dispatchPendingChanges());
    expect(boundary.events).toEqual(["cache", "updated"]);
    expect(await boundary.pending()).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});

test("a rejected role write rolls back profile and role changes before any publication", async () => {
  const boundary = await createSyncBoundary();

  try {
    const initial = await boundary.refresh();
    const roleRows = await boundary.roleRows();
    boundary.events.length = 0;
    // Drizzle's query builder has no ALTER TABLE API. Reject one external write
    // to exercise rollback through the real transaction and database boundary.
    await boundary.run(
      boundary.database.execute(sql`
      ALTER TABLE ${memberToRoleTable} ADD CONSTRAINT test_reject_role
      CHECK (${memberToRoleTable.B} <> 'role-3')
    `),
    );
    boundary.state.member.roles = ["role-2", "role-3"];
    boundary.state.member.nick = "New name";
    await expect(boundary.refresh()).rejects.toThrow();

    const persisted = await boundary.run(
      boundary.store.findMemberWithRoles("discord-1", "guild-1"),
    );

    expect(persisted).toEqual(initial.member);
    expect(await boundary.roleRows()).toEqual(roleRows);
    expect(await boundary.pending()).toEqual([]);
    expect(boundary.events).toEqual([]);

    await boundary.run(
      boundary.database.execute(sql`
      ALTER TABLE ${memberToRoleTable} DROP CONSTRAINT test_reject_role
    `),
    );
    const retried = await boundary.refresh();
    expect(retried.member?.name).toBe("New name");
    expect(retried.member?.roles.map(({ id }) => id).sort()).toEqual([
      "role-2",
      "role-3",
    ]);
    expect(boundary.events).toEqual(["cache", "updated", "freshness"]);
  } finally {
    await boundary.dispose();
  }
});
