import {
  and,
  arrayOverlaps,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
} from "drizzle-orm";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { apiConfig } from "#src/config/api.config";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  userSettingsTable,
} from "#src/database/drizzle/schema";
import { getMemberCacheSoftTtl } from "#src/members/constants/member-cache.constant";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import {
  type AuthenticatedIdentity,
  UsersGuildsOperationError,
} from "./users-guilds.handlers.js";

const CACHE_TTL_SECONDS = 30;

type GuildSummary = {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly vanityUrl: string | null;
  readonly ownerId: string;
  readonly publicStatsCardEnabled: boolean;
  readonly hasLootlogAccess: boolean;
  readonly isAccessDataStale: boolean;
};

export interface AccessibleGuildPorts {
  readonly getCached: (
    key: string,
  ) => Effect.Effect<GuildSummary[] | null, unknown>;
  readonly setCached: (
    key: string,
    value: GuildSummary[],
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly queueRefresh: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly priority: number;
    readonly reason: string;
  }) => Effect.Effect<unknown, unknown>;
}

export const makeAccessibleGuilds = (
  database: typeof ApiDatabase.Service,
  ports: AccessibleGuildPorts,
) => {
  const queue = (
    identity: AuthenticatedIdentity,
    guildIds: ReadonlyArray<string>,
    reason: string,
  ) =>
    Effect.forEach(
      guildIds,
      (guildId) =>
        ports
          .queueRefresh({
            ...identity,
            guildId,
            priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
            reason,
          })
          .pipe(Effect.ignore),
      { concurrency: "unbounded", discard: true },
    );

  const operation = Effect.fn("getCurrentUserAccessibleGuilds")(function* (
    identity: AuthenticatedIdentity,
  ) {
    const cacheKey = `user:${identity.userId}:discord:${identity.discordId}:accessible-guilds`;
    const cached = yield* ports.getCached(cacheKey);
    if (cached !== null) {
      yield* queue(
        identity,
        cached
          .filter(
            (guild) =>
              guild.ownerId !== identity.discordId && guild.isAccessDataStale,
          )
          .map(({ id }) => id),
        "guild-access-cache-background",
      );
      return cached;
    }

    const guildRows = yield* database
      .selectDistinct({ guild: guildTable })
      .from(guildTable)
      .leftJoin(
        memberTable,
        and(
          eq(memberTable.guildId, guildTable.id),
          eq(memberTable.userId, identity.discordId),
          eq(memberTable.active, true),
          isNotNull(memberTable.globalUserId),
        ),
      )
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(
          eq(guildTable.active, true),
          or(
            eq(guildTable.ownerId, identity.discordId),
            arrayOverlaps(roleTable.permissions, [Permission.LOOTLOG_ACCESS]),
          ),
        ),
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
    const roles =
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
    const memberByGuild = new Map(
      members.map((member) => [
        member.guildId,
        {
          ...member,
          roles: roles
            .filter(({ memberId }) => memberId === member.id)
            .map(({ role }) => role),
        },
      ]),
    );
    const staleThreshold =
      Date.now() - getMemberCacheSoftTtl(apiConfig.environment);
    const summaries = guilds
      .map((guild): GuildSummary => {
        const member = memberByGuild.get(guild.id);
        const owner = guild.ownerId === identity.discordId;
        const hasAccess = Boolean(
          owner ||
          (member?.active &&
            member.roles.some((role) =>
              role.permissions.includes(Permission.LOOTLOG_ACCESS),
            )),
        );
        const lastSync = member?.lastDiscordSyncAt ?? member?.updatedAt;
        return {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          vanityUrl: guild.vanityUrl,
          ownerId: guild.ownerId,
          publicStatsCardEnabled: guild.publicStatsCardEnabled,
          hasLootlogAccess: hasAccess,
          isAccessDataStale:
            !owner && (!member || lastSync.getTime() < staleThreshold),
        };
      })
      .filter(({ hasLootlogAccess }) => hasLootlogAccess);
    yield* queue(
      identity,
      summaries
        .filter(
          (guild) =>
            guild.ownerId !== identity.discordId && guild.isAccessDataStale,
        )
        .filter((guild) => memberByGuild.get(guild.id)?.globalUserId)
        .map(({ id }) => id),
      "guild-access-background",
    );
    const orderRows = yield* database
      .select({ guildsOrder: userSettingsTable.guildsOrder })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, identity.userId))
      .limit(1);
    const order = new Map(
      (orderRows[0]?.guildsOrder ?? []).map((id, index) => [id, index]),
    );
    const result = [...summaries].sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
    yield* ports.setCached(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  });

  return (identity: AuthenticatedIdentity) =>
    operation(identity).pipe(
      Effect.mapError((cause) => new UsersGuildsOperationError({ cause })),
    );
};
