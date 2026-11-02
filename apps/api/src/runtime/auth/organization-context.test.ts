import { describe, expect, it, mock } from "bun:test";
import { Effect, Layer, Queue } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ApiDatabase } from "#src/database/drizzle/database";
import { getGuildCacheKey } from "#src/guilds/guild-configuration-cache";
import { MembersData } from "#src/http-api/handlers/members/members.handlers";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/member-refresh-queue";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { getPermissionsCacheKey } from "#src/shared/cache";
import {
  type OrganizationContextCache,
  type OrganizationContextRefresh,
  OrganizationContextLookup,
} from "./organization-context.js";

const guildId = "123456789012345678";

const identity = { userId: "user-1", discordId: "discord-1", guildId };

const guild = {
  id: guildId,
  name: "Organization",
  icon: null,
  banner: null,
  ownerId: "owner",
  vanityUrl: null,
  notificationRuleLimit: 20,
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
  documentLimit: 50,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
  active: true,
};

describe("organization context lookup", () => {
  it("queues one background refresh for an aging cached member, retries a failed enqueue, and reads the current guild configuration", async () => {
    const roles = [
      {
        id: "role-1",
        guildId,
        name: "Member",
        color: null,
        position: 1,
        permissions: [Permission.LOOTLOG_ACCESS],
        lvlRangeFrom: 0,
        lvlRangeTo: 500,
        createdAt: guild.createdAt,
        updatedAt: guild.updatedAt,
      },
    ];

    // An entry written before the guild configuration changed.
    const cachedContext = {
      guildId,
      ownerId: guild.ownerId,
      permissions: [Permission.LOOTLOG_ACCESS],
      guild,
      member: {
        id: 1,
        userId: identity.discordId,
        guildId,
        type: "USER",
        name: "Member",
        discordDisplayName: null,
        avatar: null,
        banner: null,
        active: true,
        globalUserId: identity.userId,
        createdAt: guild.createdAt,
        updatedAt: guild.updatedAt,
        // Fresh for another four minutes, past the refresh-ahead point.
        lastDiscordSyncAt: new Date(Date.now() - 11 * 60_000).toISOString(),
        lastDiscordAttemptAt: null,
        lastDiscordStatus: null,
        roles,
      },
      roles,
    };

    const updatedGuild = { ...guild, reservationActiveLimitPerSpot: 5 };

    const store = new Map([
      [getGuildCacheKey(guildId), JSON.stringify(updatedGuild)],
      [
        getPermissionsCacheKey(identity.userId, guildId),
        JSON.stringify(cachedContext),
      ],
    ]);

    const getMe = mock(() =>
      Effect.die("cached context must not reach Discord"),
    );

    const result = await Effect.gen(function* () {
      // Each lookup forks its refresh-ahead; one entry per finished attempt.
      const settled = yield* Queue.unbounded<void>();
      let enqueueAttempts = 0;

      const cache: OrganizationContextCache = {
        get: (key) => Effect.sync(() => store.get(key) ?? null),
        set: (key, value) => Effect.sync(() => store.set(key, value)),
        del: (key) =>
          Effect.sync(() => store.delete(key)).pipe(
            Effect.tap(() => Queue.offer(settled, undefined)),
          ),
        setIfAbsent: (key, value) =>
          Effect.gen(function* () {
            const claimed = !store.has(key);

            if (claimed) store.set(key, value);
            else yield* Queue.offer(settled, undefined);

            return claimed;
          }),
      };

      // The queue is briefly unavailable for the first enqueue.
      const queueRefresh = mock<OrganizationContextRefresh>(() =>
        Effect.suspend(() =>
          (enqueueAttempts += 1) === 1
            ? Effect.fail("queue unavailable")
            : Queue.offer(settled, undefined),
        ),
      );

      const contexts = yield* Effect.gen(function* () {
        const lookup = yield* OrganizationContextLookup;

        return yield* Effect.forEach([1, 2, 3], () =>
          lookup
            .lookup(identity)
            .pipe(
              Effect.tap(() =>
                Queue.take(settled).pipe(Effect.timeout("1 second")),
              ),
            ),
        );
      }).pipe(
        Effect.provide(
          OrganizationContextLookup.layerDatabase(cache, queueRefresh).pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.succeed(
                  ApiRuntimeConfig,
                  // SAFETY: the lookup reads only `environment` from config.
                  ApiRuntimeConfig.of({
                    environment: RuntimeEnvironment.PROD,
                  } as ApiRuntimeConfig["Service"]),
                ),
                // SAFETY: the guild and context come from the cache, so the
                // lookup never queries the database.
                Layer.succeed(ApiDatabase, {} as ApiDatabase["Service"]),
                Layer.succeed(
                  MembersData,
                  MembersData.of({
                    getMe,
                    refreshMember: () => Effect.die("unused"),
                    deactivateMember: () => Effect.die("unused"),
                    refreshAllMembers: () => Effect.die("unused"),
                  }),
                ),
              ),
            ),
          ),
        ),
      );

      return { contexts, queueRefresh };
    }).pipe(Effect.runPromise);

    expect(result.contexts.map((context) => context?.permissions)).toEqual([
      cachedContext.permissions,
      cachedContext.permissions,
      cachedContext.permissions,
    ]);
    expect(
      result.contexts.map(
        (context) => context?.guild.reservationActiveLimitPerSpot,
      ),
    ).toEqual([5, 5, 5]);
    expect(getMe).not.toHaveBeenCalled();

    const refresh = {
      discordId: identity.discordId,
      guildId,
      userId: identity.userId,
      priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
      reason: "organization-context-refresh-ahead",
    };

    // The failed enqueue released its claim; the retry then holds it.
    expect(result.queueRefresh.mock.calls).toEqual([[refresh], [refresh]]);
  });

  it("grants the Discord guild owner nothing until Discord confirms an active, User-linked member row", async () => {
    const owner = { userId: "owner-user", discordId: guild.ownerId, guildId };

    const member = {
      id: 2,
      userId: owner.discordId,
      guildId,
      type: "USER" as const,
      name: "Owner",
      discordDisplayName: null,
      avatar: null,
      banner: null,
      active: true,
      globalUserId: owner.userId,
      createdAt: new Date(guild.createdAt),
      updatedAt: new Date(guild.updatedAt),
      lastDiscordSyncAt: new Date(),
      lastDiscordAttemptAt: null,
      lastDiscordStatus: null,
      roles: [],
      isStale: false,
      refreshQueued: true,
    };

    const lookupWith = (stored: typeof member | null) =>
      Effect.gen(function* () {
        const lookup = yield* OrganizationContextLookup;

        return yield* lookup.lookup(owner);
      }).pipe(
        Effect.provide(
          OrganizationContextLookup.layerDatabase(
            {
              get: (key) =>
                Effect.succeed(
                  key === getGuildCacheKey(guildId)
                    ? JSON.stringify(guild)
                    : null,
                ),
              set: () => Effect.void,
              del: () => Effect.void,
              setIfAbsent: () => Effect.succeed(false),
            },
            () => Effect.void,
          ).pipe(
            Layer.provide(
              Layer.mergeAll(
                Layer.succeed(
                  ApiRuntimeConfig,
                  // SAFETY: the lookup reads only `environment` from config.
                  ApiRuntimeConfig.of({
                    environment: RuntimeEnvironment.PROD,
                  } as ApiRuntimeConfig["Service"]),
                ),
                // SAFETY: the guild comes from the cache and the member from
                // `getMe`, so the lookup never queries the database.
                Layer.succeed(ApiDatabase, {} as ApiDatabase["Service"]),
                Layer.succeed(
                  MembersData,
                  MembersData.of({
                    getMe: () => Effect.succeed(stored),
                    refreshMember: () => Effect.die("unused"),
                    deactivateMember: () => Effect.die("unused"),
                    refreshAllMembers: () => Effect.die("unused"),
                  }),
                ),
              ),
            ),
          ),
        ),
        Effect.runPromise,
      );

    expect(await lookupWith(null)).toBeNull();
    expect(await lookupWith({ ...member, active: false })).toBeNull();
    expect(await lookupWith({ ...member, globalUserId: null })).toBeNull();
    expect((await lookupWith(member))?.permissions).toContain(Permission.OWNER);
  });
});
