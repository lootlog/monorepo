import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import type { APIGuild } from "discord-api-types/v10";
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
import { isDiscordAdministrator } from "#src/discord/is-discord-administrator";
import { getMemberCacheSoftTtl } from "#src/members/constants/member-cache.constant";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import { HttpException, HttpStatus } from "#src/shared/http/http-errors";
import {
  type AuthenticatedIdentity,
  UsersGuildsOperationError,
} from "./users-guilds.handlers.js";

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

export interface CurrentUserGuildPorts {
  readonly accessibleFallback: (
    identity: AuthenticatedIdentity,
  ) => Effect.Effect<ReadonlyArray<GuildSummary>, unknown>;
  readonly deactivateMissing: (options: {
    readonly discordId: string;
    readonly userId: string;
    readonly activeDiscordGuildIds: ReadonlyArray<string>;
  }) => Effect.Effect<unknown, unknown>;
  readonly freshDiscordGuilds: (
    identity: AuthenticatedIdentity,
  ) => Effect.Effect<ReadonlyArray<APIGuild>, unknown>;
  readonly queueMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly priority: number;
    readonly reason: string;
  }) => Effect.Effect<unknown, unknown>;
  readonly refreshMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly userId: string;
    readonly priority: number;
    readonly reason: string;
  }) => Effect.Effect<{ readonly refreshQueued: boolean }, unknown>;
}

const fallbackEligible = (error: unknown) => {
  if (!(error instanceof HttpException)) return false;
  const status = error.getStatus();
  return (
    status === HttpStatus.TOO_MANY_REQUESTS ||
    status === HttpStatus.REQUEST_TIMEOUT ||
    status >= HttpStatus.INTERNAL_SERVER_ERROR
  );
};

const discordOwner = (guild: APIGuild, discordId: string) =>
  Boolean(
    (guild as APIGuild & { owner?: boolean; owner_id?: string }).owner ||
    guild.owner_id === discordId,
  );

const discordAdmin = (guild: APIGuild) => {
  try {
    return isDiscordAdministrator(BigInt(guild.permissions));
  } catch {
    return false;
  }
};

export const makeCurrentUserGuilds = (
  database: typeof ApiDatabase.Service,
  ports: CurrentUserGuildPorts,
) => {
  const readMembers = (discordId: string, guildIds: ReadonlyArray<string>) =>
    Effect.gen(function* () {
      if (guildIds.length === 0) return [];
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
      const roles = yield* database
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
        roles: roles
          .filter(({ memberId }) => memberId === member.id)
          .map(({ role }) => role),
      }));
    });

  const sort = (userId: string, summaries: GuildSummary[]) =>
    database
      .select({ guildsOrder: userSettingsTable.guildsOrder })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1)
      .pipe(
        Effect.map((rows) => {
          const order = new Map(
            (rows[0]?.guildsOrder ?? []).map((id, index) => [id, index]),
          );
          return [...summaries].sort(
            (left, right) =>
              (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
              (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
          );
        }),
      );

  const operation = Effect.fn("getCurrentUserGuilds")(function* (
    identity: AuthenticatedIdentity,
  ) {
    const discordGuilds = yield* ports.freshDiscordGuilds(identity).pipe(
      Effect.catch((error) =>
        fallbackEligible(error)
          ? ports.accessibleFallback(identity).pipe(
              Effect.map((guilds) =>
                guilds.map((guild) => ({
                  ...guild,
                  isAccessDataStale: true,
                })),
              ),
            )
          : Effect.fail(error),
      ),
    );
    const firstGuild = discordGuilds[0];
    if (!firstGuild || !("permissions" in firstGuild)) {
      return discordGuilds as ReadonlyArray<GuildSummary>;
    }
    const apiGuilds = discordGuilds as ReadonlyArray<APIGuild>;
    const discordGuildIds = apiGuilds.map(({ id }) => id);
    yield* ports.deactivateMissing({
      ...identity,
      activeDiscordGuildIds: discordGuildIds,
    });
    if (discordGuildIds.length === 0) return [];
    const guilds = yield* database
      .select()
      .from(guildTable)
      .where(inArray(guildTable.id, discordGuildIds))
      .pipe(Effect.map((rows) => rows.filter(({ active }) => active)));
    let members = yield* readMembers(
      identity.discordId,
      guilds.map(({ id }) => id),
    );
    const memberByGuild = new Map(
      members.map((member) => [member.guildId, member]),
    );
    const staleThreshold =
      Date.now() - getMemberCacheSoftTtl(apiConfig.environment);
    const discordById = new Map(apiGuilds.map((guild) => [guild.id, guild]));
    const candidates = guilds
      .flatMap((guild) => {
        const member = memberByGuild.get(guild.id);
        const lastSync = member?.lastDiscordSyncAt ?? member?.updatedAt;
        if (
          member?.active &&
          lastSync &&
          lastSync.getTime() >= staleThreshold
        ) {
          return [];
        }
        const hasAccess = Boolean(
          member?.active &&
          member.roles.some((role) =>
            role.permissions.includes(Permission.LOOTLOG_ACCESS),
          ),
        );
        const discordGuild = discordById.get(guild.id);
        const privileged = Boolean(
          discordGuild &&
          (discordOwner(discordGuild, identity.discordId) ||
            discordAdmin(discordGuild)),
        );
        return [
          {
            guildId: guild.id,
            rank: !member ? 0 : !hasAccess ? 1 : privileged ? 2 : 3,
          },
        ];
      })
      .sort(
        (left, right) =>
          left.rank - right.rank || left.guildId.localeCompare(right.guildId),
      );
    let immediate = 0;
    for (const candidate of candidates) {
      if (immediate < 2) {
        const refreshed = yield* ports.refreshMember({
          ...identity,
          guildId: candidate.guildId,
          priority: MEMBER_REFRESH_PRIORITY.CONNECT,
          reason: "guild-connect",
        });
        if (!refreshed.refreshQueued) immediate += 1;
      } else {
        yield* ports.queueMember({
          ...identity,
          guildId: candidate.guildId,
          priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
          reason: "guild-connect-background",
        });
      }
    }
    if (candidates.length > 0) {
      members = yield* readMembers(
        identity.discordId,
        guilds.map(({ id }) => id),
      );
    }
    const refreshedByGuild = new Map(
      members.map((member) => [member.guildId, member]),
    );
    const summaries = guilds.map((guild): GuildSummary => {
      const member = refreshedByGuild.get(guild.id);
      const owner = guild.ownerId === identity.discordId;
      const lastSync = member?.lastDiscordSyncAt ?? member?.updatedAt;
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        vanityUrl: guild.vanityUrl,
        ownerId: guild.ownerId,
        publicStatsCardEnabled: guild.publicStatsCardEnabled,
        hasLootlogAccess: Boolean(
          owner ||
          (member?.active &&
            member.roles.some((role) =>
              role.permissions.includes(Permission.LOOTLOG_ACCESS),
            )),
        ),
        isAccessDataStale: Boolean(
          !owner && (!lastSync || lastSync.getTime() < staleThreshold),
        ),
      };
    });
    return yield* sort(identity.userId, summaries);
  });

  return (identity: AuthenticatedIdentity) =>
    operation(identity).pipe(
      Effect.mapError((cause) => new UsersGuildsOperationError({ cause })),
    );
};
