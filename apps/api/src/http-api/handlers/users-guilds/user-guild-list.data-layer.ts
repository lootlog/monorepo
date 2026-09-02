import { and, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { Effect } from "effect";
import type { APIGuild } from "discord-api-types/v10";
import { apiConfig } from "#src/config/api.config";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  userSettingsTable,
} from "#src/database/drizzle/schema";
import { getMemberCacheSoftTtl } from "#src/members/constants/member-cache.constant";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import {
  type AuthenticatedIdentity,
  UsersGuildsOperationError,
} from "./users-guilds.handlers.js";

const SYNC_THROTTLE_TTL_SECONDS = 600;

type PlainGuild = {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly vanityUrl: string | null;
  readonly ownerId: string;
  readonly publicStatsCardEnabled: boolean;
};

export interface UserGuildListPorts {
  readonly accessible: (identity: AuthenticatedIdentity) => Effect.Effect<
    ReadonlyArray<
      PlainGuild & {
        readonly hasLootlogAccess: boolean;
        readonly isAccessDataStale: boolean;
      }
    >,
    unknown
  >;
  readonly deactivateMissing: (options: {
    readonly discordId: string;
    readonly userId: string;
    readonly activeDiscordGuildIds: ReadonlyArray<string>;
  }) => Effect.Effect<unknown, unknown>;
  readonly freshDiscordGuilds: (
    identity: AuthenticatedIdentity,
  ) => Effect.Effect<ReadonlyArray<APIGuild>, unknown>;
  readonly getCache: (key: string) => Effect.Effect<string | null, unknown>;
  readonly setCache: (
    key: string,
    value: string,
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

export const makeUserGuildList = (
  database: typeof ApiDatabase.Service,
  ports: UserGuildListPorts,
) => {
  const queueStale = (
    identity: AuthenticatedIdentity,
    guilds: ReadonlyArray<{ readonly id: string }>,
  ) =>
    Effect.gen(function* () {
      if (guilds.length === 0) return;
      const throttleKey = `member:sync:throttle:${identity.discordId}`;
      if (yield* ports.getCache(throttleKey)) return;
      const staleThreshold = new Date(
        Date.now() - getMemberCacheSoftTtl(apiConfig.environment),
      );
      const stale = yield* database
        .select({
          discordId: memberTable.userId,
          guildId: memberTable.guildId,
          userId: memberTable.globalUserId,
        })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, identity.discordId),
            inArray(
              memberTable.guildId,
              guilds.map(({ id }) => id),
            ),
            isNotNull(memberTable.globalUserId),
            eq(memberTable.active, true),
            or(
              isNull(memberTable.lastDiscordSyncAt),
              lt(memberTable.lastDiscordSyncAt, staleThreshold),
            ),
          ),
        );
      if (stale.length === 0) return;
      yield* ports.setCache(throttleKey, "1", SYNC_THROTTLE_TTL_SECONDS);
      yield* Effect.forEach(
        stale,
        (member) =>
          member.userId
            ? ports
                .queueRefresh({
                  discordId: member.discordId,
                  guildId: member.guildId,
                  userId: member.userId,
                  priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
                  reason: "guild-list-sync",
                })
                .pipe(Effect.ignore)
            : Effect.void,
        { concurrency: "unbounded", discard: true },
      );
    });

  const operation = Effect.fn("getUserGuilds")(function* (
    identity: AuthenticatedIdentity,
    source?: string,
  ) {
    if (source === "game") {
      const summaries = yield* ports.accessible(identity);
      const guilds = summaries.map(
        ({ hasLootlogAccess: _access, isAccessDataStale: _stale, ...guild }) =>
          guild,
      );
      yield* queueStale(identity, guilds);
      return guilds;
    }

    const discordGuilds = yield* ports.freshDiscordGuilds(identity);
    const discordGuildIds = discordGuilds.map(({ id }) => id);
    yield* ports.deactivateMissing({
      ...identity,
      activeDiscordGuildIds: discordGuildIds,
    });
    if (discordGuildIds.length === 0) return [];
    const guilds = yield* database
      .select()
      .from(guildTable)
      .where(
        and(
          inArray(guildTable.id, discordGuildIds),
          eq(guildTable.active, true),
        ),
      );
    const orderRows = yield* database
      .select({ guildsOrder: userSettingsTable.guildsOrder })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, identity.userId))
      .limit(1);
    const order = new Map(
      (orderRows[0]?.guildsOrder ?? []).map((id, index) => [id, index]),
    );
    const result = [...guilds].sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
    yield* queueStale(identity, result);
    return result;
  });

  return (identity: AuthenticatedIdentity, source?: string) =>
    operation(identity, source).pipe(
      Effect.mapError((cause) => new UsersGuildsOperationError({ cause })),
    );
};
