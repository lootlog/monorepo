import { makeAuthService } from "#src/auth/auth.service";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { makeDiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { makeDiscordRateLimiter } from "#src/discord/discord-rate-limiter.service";
import { makeDiscordRestClients } from "#src/discord/discord-rest-client.factory";
import {
  makeDiscordSyncDiagnostics,
  type DiscordSyncDiagnostics,
} from "#src/discord/discord-sync-diagnostics.service";
import { makeDiscordUserGuildsClient } from "#src/discord/discord-user-guilds.client";
import {
  makeDiscordOperations,
  type DiscordOperations,
} from "#src/discord/discord.operations";
import { makeRedisLockManager } from "#src/redis/redlock";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/member-refresh-queue";
import {
  makeMemberRefreshScheduler,
  type MemberRefreshScheduler,
} from "#src/members/member-refresh-scheduler";
import {
  makeMemberRefresh,
  type MemberRefresh,
} from "#src/members/member-refresh.operations";
import {
  makeMemberDelivery,
  type MemberDelivery,
} from "#src/members/member-delivery.operations";
import {
  makeMemberRemoval,
  type MemberRemoval,
} from "#src/members/member-removal.operations";
import {
  makeMemberSync,
  type MemberSync,
} from "#src/members/member-sync.operations";
import { makeMemberStore } from "#src/members/member.repository";
import {
  getMemberReadCacheScope,
  getPermissionsCacheKey,
  getUserGuildPermissionsCacheScope,
  getUserLootlogConfigCacheScope,
} from "#src/shared/cache";
import { AuthRpcGroup } from "@lootlog/rpc/auth";
import { makeRpcClient } from "@lootlog/rpc/client";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";
import {
  makeMembersDataLayer,
  type MemberCommandsPorts,
} from "#src/members/member-commands.data-layer";
import { makeMemberReadDataLayer } from "#src/members/member-read.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { MemberBulkRefreshQueue } from "#src/runtime/queues/member-bulk-refresh";
import { MemberRefreshQueue } from "#src/runtime/queues/member-refresh";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

interface MemberServicesValue {
  readonly database: ApiDatabaseValue;
  readonly refreshMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
  }) => Effect.Effect<{ readonly refreshQueued: boolean } | null, unknown>;
  readonly removal: MemberRemoval;
  readonly memberDelivery: MemberDelivery;
  readonly refresh: MemberRefresh;
  readonly discord: DiscordOperations;
  readonly scheduler: MemberRefreshScheduler;
  readonly diagnostics: DiscordSyncDiagnostics;
  readonly sync: MemberSync;
}

export class MemberServices extends Context.Service<
  MemberServices,
  MemberServicesValue
>()("@lootlog/api/http-api/MemberServices") {}

export const memberServicesLive = Layer.effect(
  MemberServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const database = yield* ApiDatabase;
    const memberRefreshQueue = yield* MemberRefreshQueue;

    const authRpc = yield* makeRpcClient(AuthRpcGroup, {
      url: config.authRpcUrl,
      spanPrefix: "api.auth-rpc",
    });

    const memberStore = makeMemberStore(database);
    const diagnostics = makeDiscordSyncDiagnostics(redis);
    const rateLimiter = makeDiscordRateLimiter(redis);

    const restClients = makeDiscordRestClients(
      makeAuthService({
        redis,
        authRpc,
      }),
    );

    const userGuildsClient = makeDiscordUserGuildsClient({
      redis,
      rateLimiter,
      locks: makeRedisLockManager(redis),
      diagnostics,
      restClients,
      environment: config.environment,
    });

    const guildMemberClient = makeDiscordGuildMemberClient({
      redis,
      rateLimiter,
      diagnostics,
      restClients,
      environment: config.environment,
    });

    const discord = makeDiscordOperations(userGuildsClient, guildMemberClient);

    const delivery = makeMemberDelivery(memberStore, {
      clearMemberCaches: (member) =>
        Effect.all(
          [
            redis.invalidateScopes(
              getUserLootlogConfigCacheScope(member.discordId),
              getUserGuildPermissionsCacheScope(member.discordId),
            ),
            redis.invalidateScopes(getMemberReadCacheScope(member.guildId)),
            member.globalUserId
              ? Effect.all(
                  [
                    discord.clearGuildMemberCache({
                      discordId: member.discordId,
                      guildId: member.guildId,
                      userId: member.globalUserId,
                    }),
                    redis.del(
                      getPermissionsCacheKey(
                        member.globalUserId,
                        member.guildId,
                      ),
                    ),
                  ],
                  { concurrency: "unbounded", discard: true },
                )
              : Effect.void,
          ],
          { concurrency: "unbounded", discard: true },
        ),
      publishMemberRemoved: (member) =>
        rabbit.publish(
          eventMessage(RabbitRoutingKey.GUILDS_MEMBERS_REMOVE, {
            discordId: member.discordId,
            userId: member.globalUserId,
            guildId: member.guildId,
          }),
        ),
      invalidateMember: ({ discordId, guildId, userId }) =>
        Effect.all(
          [
            redis.del(getPermissionsCacheKey(userId, guildId)),
            redis.invalidateScopes(
              getUserLootlogConfigCacheScope(discordId),
              getUserGuildPermissionsCacheScope(discordId),
            ),
            redis.invalidateScopes(getMemberReadCacheScope(guildId)),
          ],
          { concurrency: "unbounded", discard: true },
        ),
      publishMemberUpdated: ({ discordId, guildId, userId }) =>
        rabbit.publish(
          eventMessage(RabbitRoutingKey.GUILDS_MEMBERS_UPDATE, {
            discordId,
            userId,
            guildId,
          }),
        ),
    });

    const removal = makeMemberRemoval(database, delivery);

    const nextRefreshAt = (userId: string) =>
      rateLimiter.getNextAvailableAtForUser(userId, "guild-member");

    const recordMetric = (options: {
      readonly outcome: "delayed" | "queued" | "refused" | "rate_limited";
      readonly reason: string;
    }) => diagnostics.recordMemberRefreshMetric(options);

    const scheduler = makeMemberRefreshScheduler(memberRefreshQueue, {
      nextRefreshAt,
      isRefused: discord.isGuildMemberRefused,
      recordMetric,
      getLock: redis.get,
      setLock: redis.setNX,
      evalLock: redis.eval,
      releaseLock: redis.deleteIfValue,
    });

    const memberDiscordSync = makeMemberSync(memberStore, delivery, {
      getGuildMember: discord.getGuildMember,
      nextRefreshAt,
      refreshPermissionCache: ({ userId, guildId }) =>
        redis.del(getPermissionsCacheKey(userId, guildId)),
    });

    const memberDiscordRefresh = makeMemberRefresh(scheduler, {
      nextRefreshAt,
      recordMetric: (options) => recordMetric(options),
      syncMember: memberDiscordSync.syncMemberFromDiscord,
    });

    const refreshMember = (options: {
      readonly discordId: string;
      readonly guildId: string;
    }) =>
      Effect.gen(function* () {
        const member = yield* memberStore.findMember(
          options.discordId,
          options.guildId,
        );

        if (!member?.globalUserId) return null;

        const result =
          yield* memberDiscordRefresh.refreshGuildMemberWithinBudget({
            discordId: options.discordId,
            guildId: options.guildId,
            userId: member.globalUserId,
            priority: MEMBER_REFRESH_PRIORITY.MANUAL,
            reason: "bulk-refresh",
          });

        return result.member
          ? { ...result.member, refreshQueued: result.refreshQueued }
          : null;
      });

    return {
      database,
      refreshMember,
      removal,
      memberDelivery: delivery,
      refresh: memberDiscordRefresh,
      discord,
      scheduler,
      diagnostics,
      sync: memberDiscordSync,
    } satisfies MemberServicesValue;
  }),
);

type MemberPublishedEvents = {
  [RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE]: Parameters<
    MemberCommandsPorts["publishRefreshJobUpdate"]
  >[0];
};

export const membersData = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const rabbit = yield* RabbitMessaging;

    const { refresh, diagnostics, memberDelivery } = yield* MemberServices;
    const bulkRefreshQueue = yield* MemberBulkRefreshQueue;

    const publish = <Key extends keyof MemberPublishedEvents>(
      routingKey: Key,
      payload: MemberPublishedEvents[Key],
    ) => rabbit.publish(eventMessage(routingKey, payload));

    return makeMembersDataLayer(
      {
        refreshGuildMember: refresh.refreshGuildMemberWithinBudget,
        recordStaleUse: (reason) =>
          diagnostics.recordMemberRefreshMetric({
            outcome: "stale_used",
            reason,
          }),
        deliverMemberChanges: memberDelivery.deliverAll,
        enqueueBulkRefresh: bulkRefreshQueue.enqueue,
        publishRefreshJobUpdate: (job) =>
          publish(RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE, job),
      },
      config.environment,
    );
  }),
);

export const memberReadData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => makeMemberReadDataLayer(redis)),
);
