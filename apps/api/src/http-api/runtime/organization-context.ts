import { and, eq, or } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import { resolveCapabilities } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { serviceConfig } from "#src/config/service.config";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";
import { getMemberCacheSoftTtl } from "#src/members/constants/member-cache.constant";
import type { MemberWithRoles, Role } from "#src/members/member.types";
import {
  getGuildCacheKey,
  getPermissionsCacheKey,
  GUILD_CACHE_TTL_SECONDS,
  PERMISSIONS_CACHE_TTL_SECONDS,
} from "#src/shared/constants/cache.constant";
import { MembersData } from "../handlers/members/members.handlers.js";

type GuildRecord = typeof guildTable.$inferSelect;

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
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class OrganizationNotFound extends Schema.TaggedError<OrganizationNotFound>()(
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
    lastSync &&
    lastSync.getTime() >= Date.now() - getMemberCacheSoftTtl(serviceConfig.env),
  );
};

const decodeCachedContext = (
  value: string,
): Effect.Effect<OrganizationContext | null> =>
  Effect.try(() => JSON.parse(value) as unknown).pipe(
    Effect.map((context) => (cachedContextIsFresh(context) ? context : null)),
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

  static layerDatabase(cache: OrganizationContextCache) {
    return Layer.effect(
      OrganizationContextLookup,
      Effect.gen(function* () {
        const database = yield* ApiDatabase;
        const members = yield* MembersData;

        const readGuild = (idOrVanityUrl: string) =>
          Effect.gen(function* () {
            const key = getGuildCacheKey(idOrVanityUrl);
            const cached = yield* cache
              .get(key)
              .pipe(Effect.catch(() => Effect.succeed(null)));
            if (cached) {
              const parsed = yield* Effect.try(
                () => JSON.parse(cached) as GuildRecord,
              ).pipe(Effect.option);
              if (parsed._tag === "Some") return parsed.value;
              yield* cache.del(key).pipe(Effect.ignore);
            }
            const rows = yield* database
              .select()
              .from(guildTable)
              .where(
                and(
                  eq(guildTable.active, true),
                  or(
                    eq(guildTable.id, idOrVanityUrl),
                    eq(guildTable.vanityUrl, idOrVanityUrl),
                  ),
                ),
              )
              .limit(1)
              .pipe(Effect.orDie);
            const guild = rows[0];
            if (!guild) {
              return yield* Effect.fail(
                new OrganizationNotFound({ guildId: idOrVanityUrl }),
              );
            }
            const encoded = JSON.stringify(guild);
            yield* Effect.all(
              [
                cache.set(
                  getGuildCacheKey(guild.id),
                  encoded,
                  GUILD_CACHE_TTL_SECONDS,
                ),
                ...(guild.vanityUrl
                  ? [
                      cache.set(
                        getGuildCacheKey(guild.vanityUrl),
                        encoded,
                        GUILD_CACHE_TTL_SECONDS,
                      ),
                    ]
                  : []),
              ],
              { concurrency: "unbounded", discard: true },
            ).pipe(Effect.ignore);
            return guild;
          });

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
              if (cached) {
                const context = yield* decodeCachedContext(cached);
                if (context) return context;
                yield* cache.del(permissionsKey).pipe(Effect.ignore);
              }

              const member = (yield* members
                .getMe(
                  { userId: options.userId, discordId: options.discordId },
                  guild.id,
                  false,
                )
                .pipe(Effect.orDie)) as MemberWithRoles | null;
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
