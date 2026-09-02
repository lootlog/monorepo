import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { Permission } from "@lootlog/schema/permissions";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
} from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
} from "#src/shared/constants/cache.constant";
import {
  GuildsInternalControllerGetGuildByIdOrVanityUrl200,
  GuildsInternalControllerGetUserPermissions200,
  LootlogApi,
} from "../../lootlog-api.generated.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class InternalGuildsOperationError extends Schema.TaggedError<InternalGuildsOperationError>()(
  "InternalGuildsOperationError",
  { cause: Schema.Defect() },
) {}

export interface InternalGuildsCache {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly getJson: <A>(key: string) => Effect.Effect<A | null, unknown>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<void, unknown>;
  readonly setJson: (
    key: string,
    value: unknown,
    ttl: number,
  ) => Effect.Effect<void, unknown>;
  readonly del: (key: string) => Effect.Effect<void, unknown>;
}

type GuildRecord = typeof guildTable.$inferSelect;
type MemberRecord = typeof memberTable.$inferSelect;
type RoleRecord = typeof roleTable.$inferSelect;

export interface InternalGuildsPersistence {
  readonly findActiveGuild: (
    idOrVanityUrl: string,
  ) => Effect.Effect<GuildRecord | null, unknown>;
  readonly findGuildsForPermissions: (
    discordId: string,
  ) => Effect.Effect<ReadonlyArray<GuildRecord>, unknown>;
  readonly findMembersWithRoles: (
    discordId: string,
    guildIds: ReadonlyArray<string>,
  ) => Effect.Effect<
    ReadonlyArray<MemberRecord & { readonly roles: ReadonlyArray<RoleRecord> }>,
    unknown
  >;
}

export const makeInternalGuildsData = (
  persistence: InternalGuildsPersistence,
  cache: InternalGuildsCache,
) => {
  const operation = <A, E>(effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
    );

  const getGuild = (idOrVanityUrl: string) =>
    Effect.gen(function* () {
      const cacheKey = getGuildCacheKey(idOrVanityUrl);
      const cached = yield* cache.get(cacheKey);
      if (cached) {
        try {
          const guild = JSON.parse(cached) as Record<string, unknown>;
          return { ...guild, ...resolveReservationSettings(guild) };
        } catch {
          yield* cache.del(cacheKey);
        }
      }

      const guild = yield* persistence.findActiveGuild(idOrVanityUrl);
      if (!guild) return yield* Effect.fail(new Error("Guild not found"));

      const encoded = JSON.stringify(guild);
      yield* Effect.all([
        cache.set(getGuildCacheKey(guild.id), encoded, GUILD_CACHE_TTL_SECONDS),
        ...(guild.vanityUrl
          ? [
              cache.set(
                getGuildCacheKey(guild.vanityUrl),
                encoded,
                GUILD_CACHE_TTL_SECONDS,
              ),
            ]
          : []),
      ]);
      return { ...guild, ...resolveReservationSettings(guild) };
    });

  const getUserPermissions = (discordId: string, userId: string) =>
    Effect.gen(function* () {
      const cacheKey = `user:${userId}:discord:${discordId}:guild-permissions`;
      const cached = yield* cache.getJson<unknown[]>(cacheKey);
      if (cached !== null) return cached;

      const guilds = yield* persistence.findGuildsForPermissions(discordId);
      if (guilds.length === 0) return [];

      const members = yield* persistence.findMembersWithRoles(
        discordId,
        guilds.map(({ id }) => id),
      );
      const memberByGuild = new Map(
        members.map((member) => [member.guildId, member]),
      );
      const allPermissions = Object.values(Permission);
      const result = guilds.flatMap((guild) => {
        if (guild.ownerId === discordId) {
          return [
            {
              guild: { id: guild.id, ownerId: guild.ownerId },
              roles: [
                {
                  id: "owner",
                  lvlRangeFrom: 0,
                  lvlRangeTo: 999,
                  permissions: allPermissions,
                },
              ],
            },
          ];
        }

        const member = memberByGuild.get(guild.id);
        if (
          !member?.active ||
          !member.roles.some((role) =>
            role.permissions.includes(Permission.LOOTLOG_ACCESS),
          )
        ) {
          return [];
        }

        return [
          {
            guild: { id: guild.id, ownerId: guild.ownerId },
            roles: member.roles
              .filter(({ permissions }) => permissions.length > 0)
              .map(({ id, lvlRangeFrom, lvlRangeTo, permissions }) => ({
                id,
                lvlRangeFrom,
                lvlRangeTo,
                permissions,
              })),
          },
        ];
      });
      yield* cache.setJson(cacheKey, result, 60);
      return result;
    });

  return InternalGuildsData.of({
    getUserPermissions: (discordId, userId) =>
      operation(getUserPermissions(discordId, userId)),
    getGuild: (idOrVanityUrl) => operation(getGuild(idOrVanityUrl)),
  });
};

export class InternalGuildsData extends Context.Service<
  InternalGuildsData,
  {
    readonly getUserPermissions: (
      discordId: string,
      userId: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
    readonly getGuild: (
      idOrVanityUrl: string,
    ) => Effect.Effect<unknown, InternalGuildsOperationError>;
  }
>()("@lootlog/api/http-api/internal-guilds/data") {
  static layerDatabase(cache: InternalGuildsCache) {
    return Layer.effect(
      InternalGuildsData,
      Effect.map(ApiDatabase, (database) => {
        const persistence: InternalGuildsPersistence = {
          findActiveGuild: (idOrVanityUrl) =>
            database
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
              .pipe(Effect.map((rows) => rows[0] ?? null)),
          findGuildsForPermissions: (discordId) =>
            database
              .selectDistinct({ guild: guildTable })
              .from(guildTable)
              .leftJoin(
                memberTable,
                and(
                  eq(memberTable.guildId, guildTable.id),
                  eq(memberTable.userId, discordId),
                  eq(memberTable.active, true),
                  isNotNull(memberTable.globalUserId),
                ),
              )
              .leftJoin(
                memberToRoleTable,
                eq(memberToRoleTable.A, memberTable.id),
              )
              .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
              .where(
                and(
                  eq(guildTable.active, true),
                  or(
                    eq(guildTable.ownerId, discordId),
                    arrayOverlaps(roleTable.permissions, [
                      Permission.LOOTLOG_ACCESS,
                    ]),
                  ),
                ),
              )
              .pipe(Effect.map((rows) => rows.map(({ guild }) => guild))),
          findMembersWithRoles: (discordId, guildIds) =>
            Effect.gen(function* () {
              const members = yield* database
                .select()
                .from(memberTable)
                .where(
                  and(
                    eq(memberTable.userId, discordId),
                    inArray(memberTable.guildId, [...guildIds]),
                  ),
                );
              if (members.length === 0) return [];

              const roleRows = yield* database
                .select({ memberId: memberToRoleTable.A, role: roleTable })
                .from(memberToRoleTable)
                .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
                .where(
                  inArray(
                    memberToRoleTable.A,
                    members.map(({ id }) => id),
                  ),
                )
                .orderBy(desc(roleTable.position));
              return members.map((member) => ({
                ...member,
                roles: roleRows
                  .filter(({ memberId }) => memberId === member.id)
                  .map(({ role }) => role),
              }));
            }),
        };

        return makeInternalGuildsData(persistence, cache);
      }),
    );
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(JSON.parse(JSON.stringify(value))).pipe(
    Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
  );

export const getInternalUserPermissions = (discordId: string, userId: string) =>
  Effect.gen(function* () {
    if (discordId.length === 0 || userId.length === 0) return [];
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(
      data.getUserPermissions(discordId, userId),
      (value) => decode(GuildsInternalControllerGetUserPermissions200, value),
    );
  }).pipe(
    Effect.withSpan("GuildsInternalControllerGetUserPermissions", {
      attributes: { operationId: "GuildsInternalControllerGetUserPermissions" },
    }),
  );

export const getInternalGuild = (idOrVanityUrl: string) =>
  Effect.gen(function* () {
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(data.getGuild(idOrVanityUrl), (value) =>
      decode(GuildsInternalControllerGetGuildByIdOrVanityUrl200, value),
    );
  }).pipe(
    Effect.withSpan("GuildsInternalControllerGetGuildByIdOrVanityUrl", {
      attributes: {
        operationId: "GuildsInternalControllerGetGuildByIdOrVanityUrl",
      },
    }),
  );

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) =>
    Effect.die(
      error instanceof InternalGuildsOperationError ? error.cause : error,
    ),
  );

export const InternalGuildsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "internal",
  (handlers) =>
    handlers
      .handle("GuildsInternalControllerGetUserPermissions", ({ query }) =>
        orDieHttpFailure(
          getInternalUserPermissions(query.discordId, query.userId),
        ),
      )
      .handle("GuildsInternalControllerGetGuildByIdOrVanityUrl", ({ params }) =>
        orDieHttpFailure(getInternalGuild(params.idOrVanityUrl)),
      ),
);
