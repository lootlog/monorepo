import { IsoDateTime } from "@lootlog/schema/primitives";
import { createSelectSchema } from "drizzle-orm/effect-schema";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { resolveCapabilities } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";
import { findActiveGuild } from "#src/guilds/active-guild-lookup";
import {
  readCachedGuild,
  writeGuildConfigurationCache,
} from "#src/guilds/guild-configuration-cache";
import { getMemberCacheSoftTtl } from "#src/members/member-cache";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/member-refresh-queue";
import type { MemberWithRoles, Role } from "#src/members/member.types";
import {
  getPermissionsCacheKey,
  PERMISSIONS_CACHE_TTL_SECONDS,
} from "#src/shared/cache";
import { MembersData } from "#src/http-api/handlers/members/members.handlers";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { decodeJsonUnknown } from "#src/shared/schema/json";

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

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;

  if (typeof value !== "string") return null;
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const cachedContextIsFresh = (
  context: unknown,
  environment: RuntimeEnvironment,
  now: number,
): context is OrganizationContext => {
  if (
    typeof context !== "object" ||
    context === null ||
    !("member" in context) ||
    typeof context.member !== "object" ||
    context.member === null ||
    !("active" in context.member) ||
    context.member.active !== true ||
    !("lastDiscordSyncAt" in context.member)
  ) {
    return false;
  }

  const lastSync = parseDate(context.member.lastDiscordSyncAt);

  return Boolean(
    lastSync && lastSync.getTime() >= now - getMemberCacheSoftTtl(environment),
  );
};

const decodeCachedContext = (
  value: string,
  environment: RuntimeEnvironment,
  now: number,
): Effect.Effect<OrganizationContext | null> =>
  Effect.try(() => decodeJsonUnknown(value)).pipe(
    Effect.map((context) =>
      cachedContextIsFresh(context, environment, now) ? context : null,
    ),
    Effect.catch(() => Effect.succeed(null)),
  );

export class OrganizationContextLookup extends Context.Service<
  OrganizationContextLookup,
  {
    readonly lookup: (options: {
      readonly userId: string;
      readonly discordId: string;
      readonly guildId: string;
    }) => Effect.Effect<OrganizationContext | null, OrganizationNotFound>;
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
                const context = yield* decodeCachedContext(
                  cached,
                  config.environment,
                  now,
                );

                if (context) {
                  yield* refreshAhead(
                    options,
                    guild.id,
                    parseDate(context.member.lastDiscordSyncAt),
                    now,
                  );

                  return context;
                }

                yield* cache.del(permissionsKey).pipe(Effect.ignore);
              }

              const member = yield* members
                .getMe(
                  { userId: options.userId, discordId: options.discordId },
                  guild.id,
                  false,
                )
                .pipe(Effect.orDie);

              if (!member?.active) return null;

              const permissions = resolveCapabilities({
                capabilities:
                  guild.ownerId === options.discordId
                    ? Object.values(Permission)
                    : member.roles.flatMap((role) => role.permissions),
              });

              const context: OrganizationContext = {
                guildId: guild.id,
                ownerId: guild.ownerId,
                permissions,
                guild,
                member,
                roles: member.roles,
              };

              if (!member.isStale && !member.refreshQueued) {
                yield* refreshAhead(
                  options,
                  guild.id,
                  parseDate(member.lastDiscordSyncAt),
                  now,
                );
                yield* cache
                  .set(
                    permissionsKey,
                    JSON.stringify(context),
                    PERMISSIONS_CACHE_TTL_SECONDS,
                  )
                  .pipe(Effect.ignore);
              }

              return context;
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
