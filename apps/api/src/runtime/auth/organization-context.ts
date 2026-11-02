import { IsoDateTime } from "@lootlog/schema/primitives";
import { createSelectSchema } from "drizzle-orm/effect-schema";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Option, Schema } from "effect";
import {
  memberCapabilities,
  resolveCapabilities,
} from "@lootlog/domain/access-policy";
import type { Permission } from "@lootlog/schema/permissions";
import type { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { findActiveGuild } from "#src/guilds/active-guild-lookup";
import {
  readCachedGuild,
  writeGuildConfigurationCache,
} from "#src/guilds/guild-configuration-cache";
import { isActiveMember } from "#src/members/member-access-query";
import { getMemberCacheSoftTtl } from "#src/members/member-cache";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/member-refresh-queue";
import type { MemberWithRoles, Role } from "#src/members/member.types";
import {
  getPermissionsCacheKey,
  PERMISSIONS_CACHE_TTL_SECONDS,
} from "#src/shared/cache";
import { MembersData } from "#src/http-api/handlers/members/members.handlers";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

const CachedGuild = createSelectSchema(guildTable, {
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const decodeCachedGuild = Schema.decodeUnknownSync(
  Schema.fromJsonString(CachedGuild),
);

export type OrganizationContext = {
  readonly guildId: string;
  readonly ownerId: string;
  readonly permissions: ReadonlyArray<Permission>;
  readonly guild: typeof guildTable.$inferSelect;
  readonly member: MemberWithRoles;
  readonly roles: ReadonlyArray<Role>;
};

export interface OrganizationContextCache {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly del: (key: string) => Effect.Effect<unknown, unknown>;
  readonly setIfAbsent: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<boolean, unknown>;
}

export type OrganizationContextRefresh = (options: {
  readonly discordId: string;
  readonly guildId: string;
  readonly userId: string;
  readonly priority: number;
  readonly reason: string;
}) => Effect.Effect<unknown, unknown>;

// A context stays cached until its member reaches the soft TTL, and the next
// request then waits for Discord. Past two thirds of the soft TTL a request
// queues a background refresh so active members rarely reach that point. It
// never extends how long the cached permissions are trusted.
const REFRESH_AHEAD_FRACTION = 2 / 3;

const refreshAheadKey = (userId: string, guildId: string) =>
  `organization-context:refresh-ahead:${userId}:${guildId}`;

export class OrganizationNotFound extends TaggedErrorClass<OrganizationNotFound>()(
  "OrganizationNotFound",
  { guildId: Schema.String },
) {}

// The cache holds only the member and its roles, which cost a Discord sync to
// refresh. The guild row and the capabilities derived from it are read on every
// lookup, so a configuration change applies without evicting member entries.
const CachedMemberEntry = Schema.Struct({
  member: Schema.Struct({
    ...createSelectSchema(memberTable, {
      createdAt: IsoDateTime,
      updatedAt: IsoDateTime,
      lastDiscordSyncAt: Schema.NullOr(IsoDateTime),
      lastDiscordAttemptAt: Schema.NullOr(IsoDateTime),
    }).fields,
    roles: Schema.mutable(
      Schema.Array(
        createSelectSchema(roleTable, {
          permissions: (permissions) => Schema.mutable(permissions),
          createdAt: IsoDateTime,
          updatedAt: IsoDateTime,
        }),
      ),
    ),
  }),
});

const decodeCachedMemberEntry = Schema.decodeUnknownOption(
  Schema.fromJsonString(CachedMemberEntry),
);

/** The cached member, while it is active and inside the soft TTL. */
const readFreshCachedMember = (
  value: string,
  environment: RuntimeEnvironment,
  now: number,
): MemberWithRoles | null => {
  const member = Option.getOrNull(decodeCachedMemberEntry(value))?.member;
  const syncedAt = member?.lastDiscordSyncAt?.getTime() ?? 0;

  return member &&
    isActiveMember(member) &&
    syncedAt >= now - getMemberCacheSoftTtl(environment)
    ? member
    : null;
};

const toOrganizationContext = (
  guild: typeof guildTable.$inferSelect,
  member: MemberWithRoles,
  discordId: string,
): OrganizationContext => ({
  guildId: guild.id,
  ownerId: guild.ownerId,
  permissions: resolveCapabilities({
    capabilities: memberCapabilities({
      ownerId: guild.ownerId,
      viewerId: discordId,
      roles: member.roles,
    }),
  }),
  guild,
  member,
  roles: member.roles,
});

export class OrganizationContextLookup extends Context.Service<
  OrganizationContextLookup,
  {
    readonly lookup: (options: {
      readonly userId: string;
      readonly discordId: string;
      readonly guildId: string;
    }) => Effect.Effect<
      OrganizationContext | null,
      OrganizationNotFound | ReauthenticationRequired
    >;
  }
>()("@lootlog/api/http-api/organization-context") {
  static layerTest(service: OrganizationContextLookup["Service"]) {
    return Layer.succeed(OrganizationContextLookup, service);
  }

  static layerDatabase(
    cache: OrganizationContextCache,
    queueRefresh: OrganizationContextRefresh,
  ) {
    return Layer.effect(
      OrganizationContextLookup,
      Effect.gen(function* () {
        const config = yield* ApiRuntimeConfig;
        const database = yield* ApiDatabase;
        const members = yield* MembersData;

        const readGuild = (idOrVanityUrl: string) =>
          Effect.gen(function* () {
            const cached = yield* readCachedGuild(
              cache,
              idOrVanityUrl,
              decodeCachedGuild,
            ).pipe(Effect.catch(() => Effect.succeed(null)));

            if (cached) return cached;

            const guild = yield* findActiveGuild(database, idOrVanityUrl).pipe(
              Effect.orDie,
            );

            if (!guild) {
              return yield* Effect.fail(
                new OrganizationNotFound({ guildId: idOrVanityUrl }),
              );
            }

            yield* writeGuildConfigurationCache(
              cache,
              idOrVanityUrl,
              guild,
            ).pipe(Effect.ignore);

            return guild;
          });

        const refreshAhead = (
          options: { readonly userId: string; readonly discordId: string },
          guildId: string,
          lastSync: Date | null,
          now: number,
        ) =>
          Effect.gen(function* () {
            const softTtl = getMemberCacheSoftTtl(config.environment);

            if (
              !lastSync ||
              now - lastSync.getTime() < softTtl * REFRESH_AHEAD_FRACTION
            ) {
              return;
            }

            const key = refreshAheadKey(options.userId, guildId);

            // The marker lives until the context stops being fresh, so each
            // user and guild queues at most one refresh per aging window.
            const claimed = yield* cache.setIfAbsent(
              key,
              "1",
              Math.max(
                Math.ceil((lastSync.getTime() + softTtl - now) / 1000),
                1,
              ),
            );

            if (!claimed) return;

            yield* queueRefresh({
              discordId: options.discordId,
              guildId,
              userId: options.userId,
              priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
              reason: "organization-context-refresh-ahead",
            }).pipe(
              // A failed enqueue must not block the retry until the soft TTL.
              Effect.tapError(() => cache.del(key).pipe(Effect.ignore)),
            );
          }).pipe(
            Effect.ignore,
            Effect.withSpan("organization-context.refresh-ahead"),
            Effect.forkDetach,
          );

        return OrganizationContextLookup.of({
          lookup: (options) =>
            Effect.gen(function* () {
              const guild = yield* readGuild(options.guildId);

              const permissionsKey = getPermissionsCacheKey(
                options.userId,
                guild.id,
              );

              const cached = yield* cache
                .get(permissionsKey)
                .pipe(Effect.catch(() => Effect.succeed(null)));

              const now = yield* Clock.currentTimeMillis;

              if (cached) {
                const member = readFreshCachedMember(
                  cached,
                  config.environment,
                  now,
                );

                if (member) {
                  yield* refreshAhead(
                    options,
                    guild.id,
                    member.lastDiscordSyncAt,
                    now,
                  );

                  return toOrganizationContext(
                    guild,
                    member,
                    options.discordId,
                  );
                }

                yield* cache.del(permissionsKey).pipe(Effect.ignore);
              }

              const member = yield* members
                .getMe(
                  { userId: options.userId, discordId: options.discordId },
                  guild.id,
                  false,
                )
                .pipe(Effect.catchTag("MembersOperationError", Effect.die));

              if (!member || !isActiveMember(member)) return null;

              if (!member.isStale && !member.refreshQueued) {
                yield* refreshAhead(
                  options,
                  guild.id,
                  member.lastDiscordSyncAt,
                  now,
                );
                yield* cache
                  .set(
                    permissionsKey,
                    JSON.stringify({ member }),
                    PERMISSIONS_CACHE_TTL_SECONDS,
                  )
                  .pipe(Effect.ignore);
              }

              return toOrganizationContext(guild, member, options.discordId);
            }).pipe(
              Effect.withSpan("organization-context.lookup", {
                attributes: {
                  adapter: "drizzle-redis-discord",
                  retryCount: 0,
                },
              }),
            ),
        });
      }),
    );
  }
}
