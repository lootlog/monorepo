import {
  readGuildConfigurationCache,
  writeGuildConfigurationCache,
} from "#src/guilds/guild-configuration-cache";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";

import { HttpApiBuilder } from "effect/unstable/httpapi";
import { decodeDomainJson } from "../../domain-json.schema.js";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { Permission } from "@lootlog/schema/permissions";
import { and, arrayOverlaps, eq, inArray, or } from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

import { OrganizationSummary } from "#src/contracts/shared";
import { InternalUserPermissionsResponse } from "#src/contracts/internal/schemas";
import { LootlogApi } from "../../lootlog-api.js";

export class InternalGuildsOperationError extends TaggedErrorClass<InternalGuildsOperationError>()(
  "InternalGuildsOperationError",
  { cause: Schema.Defect() },
) {}

export interface InternalGuildsCache {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly getJson: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
  ) => Effect.Effect<S["Type"] | null, unknown>;
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
      const cached = yield* readGuildConfigurationCache(cache, idOrVanityUrl);
      if (cached) return cached;

      const guild = yield* persistence.findActiveGuild(idOrVanityUrl);
      if (!guild) return yield* Effect.fail(new Error("Guild not found"));

      yield* writeGuildConfigurationCache(cache, guild, "unbounded");
      return { ...guild, ...resolveReservationSettings(guild) };
    });

  const getUserPermissions = (discordId: string, userId: string) =>
    Effect.gen(function* () {
      const cacheKey = `user:${userId}:discord:${discordId}:guild-permissions`;
      const cached = yield* cache.getJson(
        cacheKey,
        InternalUserPermissionsResponse,
      );
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
              .leftJoin(memberTable, activeGuildMemberJoin(discordId))
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
              return yield* hydrateMemberRoles(database, members);
            }),
        };

        return makeInternalGuildsData(persistence, cache);
      }),
    );
  }
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  decodeDomainJson(schema, value).pipe(
    Effect.mapError((cause) => new InternalGuildsOperationError({ cause })),
  );

export const getInternalUserPermissions = (discordId: string, userId: string) =>
  Effect.gen(function* () {
    if (discordId.length === 0 || userId.length === 0) return [];
    const data = yield* InternalGuildsData;
    return yield* Effect.flatMap(
      data.getUserPermissions(discordId, userId),
      (value) => decode(InternalUserPermissionsResponse, value),
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
      decode(OrganizationSummary, value),
    );
  }).pipe(
    Effect.withSpan("GuildsInternalControllerGetGuildByIdOrVanityUrl", {
      attributes: {
        operationId: "GuildsInternalControllerGetGuildByIdOrVanityUrl",
      },
    }),
  );

const orDieHttpFailure = <A, R>(
  effect: Effect.Effect<A, InternalGuildsOperationError, R>,
) =>
  Effect.catchTag(effect, "InternalGuildsOperationError", (error) =>
    Effect.die(error.cause),
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
