import { AuthService } from "#src/auth/auth.service";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { DiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "#src/discord/discord-rest-client.factory";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { DiscordUserGuildsClient } from "#src/discord/discord-user-guilds.client";
import {
  makeDiscordOperations,
  type DiscordOperations,
} from "#src/discord/discord.operations";
import { RedlockService } from "#src/redis/redlock";
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
import { applicationLogger } from "#src/shared/application-logger";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, FiberSet, Layer } from "effect";
import { HttpClient } from "effect/http";
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
  readonly diagnostics: DiscordSyncDiagnosticsService;
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
    const httpClient = yield* HttpClient.HttpClient;
    const database = yield* ApiDatabase;
    const fibers = yield* FiberSet.make<unknown, unknown>();
    const runPromise = yield* FiberSet.runtimePromise(fibers)<never>();
    const memberRefreshQueue = yield* MemberRefreshQueue;

    const adapter = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });

    const memberStore = makeMemberStore(database);

    const diagnostics = new DiscordSyncDiagnosticsService(
      applicationLogger,
      redis,
    );

    const rateLimiter = new DiscordRateLimiterService(applicationLogger, redis);

    const redlock = new RedlockService(redis);

    const restClientFactory = new DiscordRestClientFactory(
      new AuthService(
        applicationLogger,
        redis,
        httpClient,
        config.authServiceUrl,
        config.authIdpTokenSecret,
      ),
      runPromise,
    );

    const userGuildsClient = new DiscordUserGuildsClient(
      applicationLogger,
      redis,
      rateLimiter,
      redlock,
      diagnostics,
      restClientFactory,
      config.environment,
    );

    const guildMemberClient = new DiscordGuildMemberClient(
      applicationLogger,
      redis,
      rateLimiter,
      diagnostics,
      restClientFactory,
      config.environment,
    );

    userGuildsClient.initialize();

    const discord = makeDiscordOperations(userGuildsClient, guildMemberClient);

    const delivery = makeMemberDelivery(memberStore, {
      clearMemberCaches: (member) =>
        Effect.all(
          [
            redis.effect.invalidateScopes(
              getUserLootlogConfigCacheScope(member.discordId),
              getUserGuildPermissionsCacheScope(member.discordId),
            ),
            redis.effect.invalidateScopes(
              getMemberReadCacheScope(member.guildId),
            ),
            member.globalUserId
              ? Effect.all(
                  [
                    discord.clearGuildMemberCache({
                      discordId: member.discordId,
                      guildId: member.guildId,
                      userId: member.globalUserId,
                    }),
                    redis.effect.del(
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
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
          content: new TextEncoder().encode(
            JSON.stringify({
              id: member.discordId,
              discordId: member.discordId,
              userId: member.globalUserId,
              guildId: member.guildId,
            }),
          ),
        }),
      invalidateMember: ({ discordId, guildId, userId }) =>
        Effect.all(
          [
            redis.effect.del(getPermissionsCacheKey(userId, guildId)),
            redis.effect.invalidateScopes(
              getUserLootlogConfigCacheScope(discordId),
              getUserGuildPermissionsCacheScope(discordId),
            ),
            redis.effect.invalidateScopes(getMemberReadCacheScope(guildId)),
          ],
          { concurrency: "unbounded", discard: true },
        ),
      publishMemberUpdated: ({ discordId, guildId, userId }) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_MEMBERS_UPDATE,
          content: new TextEncoder().encode(
            JSON.stringify({ id: discordId, discordId, userId, guildId }),
          ),
        }),
    });

    const removal = makeMemberRemoval(database, delivery);

    const nextRefreshAt = (userId: string) =>
      adapter(() =>
        rateLimiter.getNextAvailableAtForUser(userId, "guild-member"),
      );

    const recordMetric = (options: {
      readonly outcome: "delayed" | "queued" | "refused" | "rate_limited";
      readonly reason: string;
    }) => adapter(() => diagnostics.recordMemberRefreshMetric(options));

    const scheduler = makeMemberRefreshScheduler(
      applicationLogger,
      memberRefreshQueue,
      {
        nextRefreshAt,
        isRefused: discord.isGuildMemberRefused,
        recordMetric,
        getLock: redis.effect.get,
        setLock: redis.effect.setNX,
        evalLock: redis.effect.eval,
        releaseLock: redis.effect.deleteIfValue,
      },
    );

    const memberDiscordSync = makeMemberSync(
      applicationLogger,
      memberStore,
      delivery,
      {
        getGuildMember: discord.getGuildMember,
        nextRefreshAt,
        refreshPermissionCache: ({ userId, guildId }) =>
          redis.effect.del(getPermissionsCacheKey(userId, guildId)),
      },
    );

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

    const promise = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });

    const publish = <Key extends keyof MemberPublishedEvents>(
      routingKey: Key,
      payload: MemberPublishedEvents[Key],
    ) =>
      rabbit.publish({
        exchange: "default",
        routingKey,
        content: new TextEncoder().encode(JSON.stringify(payload)),
      });

    return makeMembersDataLayer(
      {
        refreshGuildMember: refresh.refreshGuildMemberWithinBudget,
        recordStaleUse: (reason) =>
          promise(() =>
            diagnostics.recordMemberRefreshMetric({
              outcome: "stale_used",
              reason,
            }),
          ),
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
