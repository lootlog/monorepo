import { readGuildOrderPreference } from "#src/guilds/guild-order-query";
import { sortGuildsByPreference } from "#src/guilds/guild-order";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { apiKeyCacheSuffix } from "#src/runtime/auth/organization-scope";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ApiDatabase } from "#src/database/drizzle/database";
import { memberTable } from "#src/database/drizzle/schema";
import { getMemberCacheSoftTtl } from "#src/members/member-cache";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/member-refresh-queue";
import {
  type AuthenticatedIdentity,
  AccountOrganizationOperationError,
} from "./account-organization.operations.js";

const CACHE_TTL_SECONDS = 30;

export const GuildSummaryCacheSchema = Schema.mutable(
  Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      icon: Schema.NullOr(Schema.String),
      vanityUrl: Schema.NullOr(Schema.String),
      ownerId: Schema.String,
      publicStatsCardEnabled: Schema.Boolean,
      hasLootlogAccess: Schema.Boolean,
      isAccessDataStale: Schema.Boolean,
    }),
  ),
);

export type GuildSummary = (typeof GuildSummaryCacheSchema.Type)[number];

export interface AccessibleGuildPorts {
  readonly getCached: (
    key: string,
  ) => Effect.Effect<GuildSummary[] | null, unknown>;
  readonly setCached: (
    key: string,
    value: GuildSummary[],
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly setIfAbsent: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
  readonly deleteCached: (key: string) => Effect.Effect<unknown, unknown>;
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
  environment: RuntimeEnvironment,
) => {
  // A refresh that succeeds keeps the member fresh for one soft TTL, and the
  // queued job retries on its own, so one background enqueue per window is
  // enough; later requests would only repeat BullMQ round trips.
  const refreshMarkerTtlSeconds = Math.ceil(
    getMemberCacheSoftTtl(environment) / 1000,
  );

  const queue = (
    identity: AuthenticatedIdentity,
    guildIds: ReadonlyArray<string>,
    reason: string,
  ) =>
    Effect.forEach(
      guildIds,
      (guildId) => {
        const markerKey = `member:refresh:background:${identity.userId}:${guildId}`;

        return ports.setIfAbsent(markerKey, "1", refreshMarkerTtlSeconds).pipe(
          Effect.flatMap((claimed) =>
            claimed
              ? ports
                  .queueRefresh({
                    ...identity,
                    guildId,
                    priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
                    reason,
                  })
                  .pipe(Effect.tapError(() => ports.deleteCached(markerKey)))
              : Effect.void,
          ),
          Effect.ignore,
        );
      },
      { concurrency: "unbounded", discard: true },
    );

  const operation = Effect.fn("getCurrentUserAccessibleGuilds")(function* (
    identity: AuthenticatedIdentity,
  ) {
    const cacheKey = `user:${identity.userId}:discord:${identity.discordId}:accessible-guilds${yield* apiKeyCacheSuffix}`;
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

    const membersWithRoles = yield* hydrateMemberRoles(database, members);

    const memberByGuild = new Map(
      membersWithRoles.map((member) => [member.guildId, member]),
    );

    const staleThreshold =
      (yield* Clock.currentTimeMillis) - getMemberCacheSoftTtl(environment);

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

    const preferredIds = yield* readGuildOrderPreference(
      database,
      identity.userId,
    );

    const result = sortGuildsByPreference(summaries, preferredIds);

    yield* ports.setCached(cacheKey, result, CACHE_TTL_SECONDS);

    return result;
  });

  return (identity: AuthenticatedIdentity) =>
    operation(identity).pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );
};
