import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import { createPermissionCacheBoundary } from "../../../../test/permission-cache-fixtures.js";
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
import {
  ForwardAuthIdentity,
  type ForwardAuthIdentityValue,
} from "#src/runtime/auth/forward-auth-identity";
import {
  getInternalUserPermissions,
  InternalGuildsData,
} from "../internal/internal.handlers.js";
import { makeUserGuildPermissions } from "./user-guild-permissions.data-layer.js";
import { getUserGuildPermissionsCacheScope } from "#src/shared/cache";
import { makeGuildLifecycle } from "#src/guilds/guild-lifecycle.operations";

const identity = { userId: "user-a", discordId: "discord-a" };

const scopedIdentity = (
  keyId: string,
  organizationIds: string[],
): ForwardAuthIdentityValue => ({
  ...identity,
  apiKey: {
    keyId,
    organizationIds,
    personalData: false,
    mode: "read",
    expiresAt: null,
  },
});

const createFixture = async () => {
  const boundary = await createDatabaseBoundary();
  const { database } = boundary;
  const cacheBoundary = createPermissionCacheBoundary();

  await boundary.run(
    Effect.gen(function* () {
      yield* database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "1" }),
          createGuildFixture({ id: "2" }),
        ]);
      yield* database.insert(memberTable).values([
        createMemberFixture({
          id: 1,
          guildId: "1",
          userId: identity.discordId,
          globalUserId: identity.userId,
        }),
        createMemberFixture({
          id: 2,
          guildId: "2",
          userId: identity.discordId,
          globalUserId: identity.userId,
        }),
      ]);
      yield* database.insert(roleTable).values([
        {
          id: "role-1",
          guildId: "1",
          name: "Access",
          updatedAt: new Date(0),
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_LOOTS_READ,
          ],
        },
        {
          id: "role-2",
          guildId: "2",
          name: "Access",
          updatedAt: new Date(0),
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_LOOTS_READ,
          ],
        },
      ]);
      yield* database.insert(memberToRoleTable).values([
        { A: 1, B: "role-1" },
        { A: 2, B: "role-2" },
      ]);
    }),
  );

  const publicProjection = makeUserGuildPermissions(
    database,
    cacheBoundary.cache,
  );

  const read = (requestIdentity: ForwardAuthIdentityValue = identity) =>
    boundary.run(
      publicProjection(requestIdentity).pipe(
        Effect.provideService(ForwardAuthIdentity, requestIdentity),
      ),
    );

  const internalRead = (freshness?: "required") =>
    boundary.run(
      getInternalUserPermissions(
        identity.discordId,
        identity.userId,
        freshness,
      ).pipe(
        Effect.provide(InternalGuildsData.layerDatabase(cacheBoundary.cache)),
      ),
    );

  return {
    ...boundary,
    ...cacheBoundary,
    read,
    internalRead,
    revokeRole: () =>
      boundary.run(
        database
          .update(roleTable)
          .set({ permissions: [] })
          .where(eq(roleTable.id, "role-1")),
      ),
    removeMember: () =>
      boundary.run(
        database
          .update(memberTable)
          .set({ active: false })
          .where(eq(memberTable.id, 1)),
      ),
    invalidate: () =>
      cacheBoundary.redis.invalidateScopes(
        getUserGuildPermissionsCacheScope(identity.discordId),
      ),
  };
};

describe("aggregate permission revocation", () => {
  it.each(["role", "member"] as const)(
    "revokes warm session and API-key projections after %s access is removed",
    async (change) => {
      const fixture = await createFixture();

      try {
        const selected = scopedIdentity("selected", ["1"]);
        const both = scopedIdentity("both", ["1", "2"]);
        const unrelated = scopedIdentity("unrelated", ["2"]);
        const requests = [identity, selected, both, unrelated];
        const before = await Promise.all(requests.map(fixture.read));
        expect(
          before.map((result) => result.map(({ guild }) => guild.id).sort()),
        ).toEqual([["1", "2"], ["1"], ["1", "2"], ["2"]]);

        if (change === "role") await fixture.revokeRole();
        else await fixture.removeMember();
        await fixture.invalidate();

        const after = await Promise.all(requests.map(fixture.read));
        expect(
          after.map((result) => result.map(({ guild }) => guild.id)),
        ).toEqual([["2"], [], ["2"], ["2"]]);
        expect(
          (await fixture.internalRead()).map(({ guild }) => guild.id),
        ).toEqual(["2"]);
      } finally {
        await fixture.dispose();
      }
    },
  );

  it("bypasses a successful stale API projection during gateway reconciliation", async () => {
    const fixture = await createFixture();

    try {
      expect(await fixture.read()).toHaveLength(2);
      await fixture.removeMember();
      expect(await fixture.internalRead()).toHaveLength(2);
      expect(
        (await fixture.internalRead("required")).map(({ guild }) => guild.id),
      ).toEqual(["2"]);
    } finally {
      await fixture.dispose();
    }
  });

  it("cannot repopulate a revoked grant when an old fill publishes after invalidation", async () => {
    const fixture = await createFixture();

    try {
      const paused = fixture.pauseNextPublication();
      const stale = fixture.read();
      await paused.started;

      try {
        await fixture.revokeRole();
        await fixture.invalidate();
      } finally {
        paused.release();
      }

      expect(await stale).toHaveLength(2);
      expect((await fixture.read()).map(({ guild }) => guild.id)).toEqual([
        "2",
      ]);
      expect(
        (await fixture.internalRead("required")).map(({ guild }) => guild.id),
      ).toEqual(["2"]);
    } finally {
      await fixture.dispose();
    }
  });

  it("grants a first-time owner access immediately after activation and moves it with ownership", async () => {
    const fixture = await createFixture();
    const owner = { userId: "owner-user", discordId: "owner-discord" };

    const lifecycle = makeGuildLifecycle(fixture.database, {
      invalidateUserGuildPermissions: (discordId) =>
        Effect.promise(() =>
          fixture.redis.invalidateScopes(
            getUserGuildPermissionsCacheScope(discordId),
          ),
        ),
      clearCacheKey: () => Effect.void,
      clearCachePattern: () => Effect.void,
      deliverMemberChanges: () => Effect.void,
    });

    const guildIds = async (requestIdentity: ForwardAuthIdentityValue) =>
      (await fixture.read(requestIdentity)).map(({ guild }) => guild.id).sort();

    try {
      // The owner opens Lootlog before adding the bot and caches no access.
      expect(await guildIds(owner)).toEqual([]);

      await fixture.run(
        lifecycle.createGuild({
          guildId: "3",
          name: "New Organization",
          icon: null,
          ownerId: owner.discordId,
          roles: [],
        }),
      );
      expect(await guildIds(owner)).toEqual(["3"]);

      expect(await guildIds(identity)).toEqual(["1", "2"]);
      await fixture.run(
        lifecycle.updateGuild({
          guildId: "3",
          name: "New Organization",
          icon: null,
          ownerId: identity.discordId,
        }),
      );
      expect(await guildIds(owner)).toEqual([]);
      expect(await guildIds(identity)).toEqual(["1", "2", "3"]);
    } finally {
      await fixture.dispose();
    }
  });
});
