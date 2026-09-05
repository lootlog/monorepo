import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
} from "./account-organization.operations.js";
import { UserOrganizationPermissionsResponse } from "#src/contracts/guilds/schemas";

const CACHE_TTL_SECONDS = 60;

export interface UserGuildPermissionsCache {
  readonly getJson: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
  ) => Effect.Effect<S["Type"] | null, unknown>;
  readonly setJson: (
    key: string,
    value: unknown,
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
}

export const makeUserGuildPermissions = (
  database: typeof ApiDatabase.Service,
  cache: UserGuildPermissionsCache,
) => {
  const operation = Effect.fn("getUserGuildsWithPermissions")(function* (
    identity: AuthenticatedIdentity,
  ) {
    const cacheKey = `user:${identity.userId}:discord:${identity.discordId}:guild-permissions`;
    const cached = yield* cache.getJson(
      cacheKey,
      UserOrganizationPermissionsResponse,
    );
    if (cached !== null) return cached;

    const guildRows = yield* selectAccessibleGuilds(
      database,
      identity.discordId,
    );
    const guilds = guildRows.map(({ guild }) => guild);
    if (guilds.length === 0) return [];

    const members = yield* database
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, identity.discordId),
          inArray(
            memberTable.guildId,
            guilds.map(({ id }) => id),
          ),
        ),
      );
    const roleRows =
      members.length === 0
        ? []
        : yield* database
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
    const membersByGuild = new Map(
      members.map((member) => [
        member.guildId,
        {
          ...member,
          roles: roleRows
            .filter(({ memberId }) => memberId === member.id)
            .map(({ role }) => role),
        },
      ]),
    );
    const allPermissions = Object.values(Permission);
    const result = guilds.flatMap((guild) => {
      if (guild.ownerId === identity.discordId) {
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
      const member = membersByGuild.get(guild.id);
      const hasAccess =
        member?.active &&
        member.roles.some((role) =>
          role.permissions.includes(Permission.LOOTLOG_ACCESS),
        );
      if (!hasAccess) return [];
      return [
        {
          guild: { id: guild.id, ownerId: guild.ownerId },
          roles: member.roles
            .filter((role) => role.permissions.length > 0)
            .map((role) => ({
              id: role.id,
              lvlRangeFrom: role.lvlRangeFrom,
              lvlRangeTo: role.lvlRangeTo,
              permissions: role.permissions,
            })),
        },
      ];
    });
    yield* cache.setJson(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  });

  return (identity: AuthenticatedIdentity) =>
    operation(identity).pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );
};
