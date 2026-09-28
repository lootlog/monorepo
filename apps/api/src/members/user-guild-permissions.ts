import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  type guildTable,
  memberTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import { UserOrganizationPermissionsResponse } from "#src/contracts/guilds/schemas";
import { apiKeyCacheSuffix } from "#src/runtime/auth/organization-scope";
import { makeJsonCodec, type RedisService } from "#src/redis/redis.service";
import { getUserGuildPermissionsCacheScope } from "#src/shared/cache";
import { selectAccessibleGuilds } from "./member-access-query.js";
import { hydrateMemberRoles } from "./member-role-hydration.js";

export type UserGuildPermissionsCache = Pick<
  RedisService,
  "getOrSetJsonEffect"
>;

export interface UserGuildPermissionsPersistence {
  readonly findGuildsForPermissions: (
    discordId: string,
  ) => Effect.Effect<ReadonlyArray<typeof guildTable.$inferSelect>, unknown>;
  readonly findMembersWithRoles: (
    discordId: string,
    guildIds: ReadonlyArray<string>,
  ) => Effect.Effect<
    ReadonlyArray<
      typeof memberTable.$inferSelect & {
        readonly roles: ReadonlyArray<typeof roleTable.$inferSelect>;
      }
    >,
    unknown
  >;
}

export const makeUserGuildPermissionsPersistence = (
  database: typeof ApiDatabase.Service,
): UserGuildPermissionsPersistence => ({
  findGuildsForPermissions: (discordId) =>
    selectAccessibleGuilds(database, discordId).pipe(
      Effect.map((rows) => rows.map(({ guild }) => guild)),
    ),
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
});

export const makeUserGuildPermissionsProjection = (
  persistence: UserGuildPermissionsPersistence,
  cache: UserGuildPermissionsCache,
) => {
  const load = Effect.fn("userGuildPermissions.load")(function* (
    discordId: string,
  ) {
    const guilds = yield* persistence.findGuildsForPermissions(discordId);

    if (guilds.length === 0) return [];

    const members = yield* persistence.findMembersWithRoles(
      discordId,
      guilds.map(({ id }) => id),
    );

    const membersByGuild = new Map(
      members.map((member) => [member.guildId, member]),
    );

    return guilds.flatMap((guild) => {
      if (guild.ownerId === discordId) {
        return [
          {
            guild: { id: guild.id, ownerId: guild.ownerId },
            roles: [
              {
                id: "owner",
                lvlRangeFrom: 0,
                lvlRangeTo: 999,
                permissions: Object.values(Permission),
              },
            ],
          },
        ];
      }

      const member = membersByGuild.get(guild.id);

      if (
        !member?.active ||
        !member.roles.some((role) =>
          role.permissions.includes(Permission.LOOTLOG_ACCESS),
        )
      )
        return [];

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
  });

  return Effect.fn("userGuildPermissions.read")(function* (
    discordId: string,
    userId: string,
    freshness?: "required",
  ) {
    if (freshness === "required") return yield* load(discordId);

    return yield* cache.getOrSetJsonEffect({
      key: `user:${userId}:discord:${discordId}:guild-permissions${yield* apiKeyCacheSuffix}`,
      scopes: [getUserGuildPermissionsCacheScope(discordId)],
      ttlSeconds: 60,
      codec: makeJsonCodec(UserOrganizationPermissionsResponse),
      factory: load(discordId),
    });
  });
};
