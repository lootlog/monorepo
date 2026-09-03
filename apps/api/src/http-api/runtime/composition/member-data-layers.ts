import { AuthService } from "#src/auth/auth.service";
import { makeJsonCodec } from "#src/redis/redis.service";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { makeDiscordBotClient } from "#src/discord-bot-client/discord-bot-client";
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
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/member-discord-status";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_PRIORITY,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/member-refresh-queue";
import {
  makeMemberRefreshScheduler,
  type MemberRefreshScheduler,
} from "#src/members/member-refresh-scheduler";
import {
  makeMemberRefresh,
  type MemberRefresh,
} from "#src/members/member-refresh.operations";
import {
  makeMemberRemoval,
  type MemberRemoval,
} from "#src/members/member-removal.operations";
import {
  makeMemberSync,
  type MemberSync,
} from "#src/members/member-sync.operations";
import { makeMemberStore } from "#src/members/member.store";
import type { MemberBulkRefreshJobData } from "#src/members/member.types";
import {
  getMemberReadCachePattern,
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "#src/shared/cache";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import { applicationLogger } from "#src/shared/application-logger";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { Queue } from "bullmq";
import { Context, Effect, FiberSet, Layer, Redacted } from "effect";
import { HttpClient } from "effect/unstable/http";
import { makeMembersDataLayer } from "#src/http-api/handlers/members/member-commands.data-layer";
import {
  makeMemberReadDataLayer,
  MemberRefreshJobDataLive,
} from "#src/http-api/handlers/members/member-read.data-layer";
import { MyReservationsData } from "#src/http-api/handlers/organization-workspace/organization-workspace.operations";
import {
  GuildSummaryCacheSchema,
  makeAccessibleGuilds,
} from "#src/http-api/handlers/account-organization/accessible-guilds.data-layer";
import { makeCurrentUserGuilds } from "#src/http-api/handlers/account-organization/current-user-guilds.data-layer";
import { makeGuildDiscordSyncData } from "#src/http-api/handlers/account-organization/guild-discord-sync.data-layer";
import { makeManageableGuilds } from "#src/http-api/handlers/account-organization/manageable-guilds.data-layer";
import { makeUserAccountDeletion } from "#src/http-api/handlers/account-organization/user-account-deletion.data-layer";
import { makeUserGuildList } from "#src/http-api/handlers/account-organization/user-guild-list.data-layer";
import { makeUserGuildPermissions } from "#src/http-api/handlers/account-organization/user-guild-permissions.data-layer";
import { makeUserPreferencesData } from "#src/http-api/handlers/account-organization/user-preferences.data-layer";
import { AccountOrganizationData } from "#src/http-api/handlers/account-organization/account-organization.operations";
import { ApiRedis } from "#src/http-api/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";
import {
  OrganizationContextLookup,
  type OrganizationContextCache,
} from "#src/http-api/runtime/auth/organization-context";

interface MemberServicesValue {
  readonly database: ApiDatabaseValue;
  readonly refreshMember: (options: {
    readonly discordId: string;
    readonly guildId: string;
    readonly skipTtlCheck?: boolean;
  }) => Effect.Effect<
    ({ readonly refreshQueued: boolean } & Record<string, unknown>) | null,
    unknown
  >;
  readonly removal: MemberRemoval;
  readonly bulkRefreshQueue: Queue<MemberBulkRefreshJobData>;
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
    const queueConnection = {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: Redacted.value(config.redis.password),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    const adapter = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });

    return yield* Effect.acquireRelease(
      Effect.sync(() => {
        const memberRefreshQueue = new Queue(MEMBER_REFRESH_QUEUE, {
          connection: queueConnection,
          prefix: "{bull}",
        });
        const memberBulkRefreshQueue = new Queue(MEMBER_BULK_REFRESH_QUEUE, {
          connection: queueConnection,
          prefix: "{bull}",
        });
        const memberStore = makeMemberStore(database);
        const diagnostics = new DiscordSyncDiagnosticsService(
          applicationLogger,
          redis,
        );
        const rateLimiter = new DiscordRateLimiterService(
          applicationLogger,
          redis,
        );
        const redlock = new RedlockService(redis);
        const restClientFactory = new DiscordRestClientFactory(
          new AuthService(
            applicationLogger,
            redis,
            httpClient,
            config.authServiceUrl,
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
          redlock,
          diagnostics,
          restClientFactory,
          config.environment,
        );
        userGuildsClient.initialize();
        guildMemberClient.initialize();
        const discord = makeDiscordOperations(
          userGuildsClient,
          guildMemberClient,
        );
        const removal = makeMemberRemoval(database, {
          clearMemberCaches: (member) =>
            Effect.all(
              [
                adapter(() =>
                  redis.deleteByPattern(
                    getUserLootlogConfigCachePattern(member.discordId),
                  ),
                ),
                adapter(() =>
                  redis.deleteByPattern(
                    getMemberReadCachePattern(member.guildId),
                  ),
                ),
                member.globalUserId
                  ? Effect.all(
                      [
                        discord.clearGuildMemberDataCache({
                          discordId: member.discordId,
                          guildId: member.guildId,
                          userId: member.globalUserId as string,
                        }),
                        adapter(() =>
                          redis.del(
                            getPermissionsCacheKey(
                              member.globalUserId as string,
                              member.guildId,
                            ),
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
        });
        const nextRefreshAt = (userId: string) =>
          adapter(() =>
            rateLimiter.getNextAvailableAtForUser(userId, "guild-member"),
          );
        const recordMetric = (options: {
          readonly outcome: "delayed" | "queued" | "rate_limited";
          readonly reason: string;
        }) => adapter(() => diagnostics.recordMemberRefreshMetric(options));
        const scheduler = makeMemberRefreshScheduler(
          applicationLogger,
          memberRefreshQueue,
          {
            nextRefreshAt,
            recordMetric,
            getLock: (key) => adapter(() => redis.get(key)),
            setLock: (key, owner, ttl) =>
              adapter(() => redis.setNX(key, owner, ttl)),
            evalLock: (script, keys, args) =>
              adapter(() => redis.eval(script, keys, args)),
          },
        );
        const memberDiscordSync = makeMemberSync(
          applicationLogger,
          memberStore,
          removal,
          {
            getGuildMember: discord.getGuildMember,
            nextRefreshAt,
            invalidateMember: ({ discordId, guildId, userId }) =>
              Effect.all(
                [
                  rabbit.publish({
                    exchange: "default",
                    routingKey: RabbitRoutingKey.GUILDS_MEMBERS_UPDATE,
                    content: new TextEncoder().encode(
                      JSON.stringify({
                        id: discordId,
                        discordId,
                        userId,
                        guildId,
                      }),
                    ),
                  }),
                  adapter(() =>
                    redis.del(getPermissionsCacheKey(userId, guildId)),
                  ),
                  adapter(() =>
                    redis.deleteByPattern(
                      getUserLootlogConfigCachePattern(discordId),
                    ),
                  ),
                  adapter(() =>
                    redis.deleteByPattern(getMemberReadCachePattern(guildId)),
                  ),
                ],
                { concurrency: "unbounded", discard: true },
              ),
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
          queues: [memberRefreshQueue, memberBulkRefreshQueue] as const,
          bulkRefreshQueue: memberBulkRefreshQueue,
          refreshMember,
          removal,
          refresh: memberDiscordRefresh,
          discord,
          scheduler,
          diagnostics,
          sync: memberDiscordSync,
        };
      }),
      ({ queues }) =>
        Effect.tryPromise(async () => {
          await Promise.all(queues.map((queue) => queue.close()));
        }),
    ).pipe(
      Effect.map(
        ({ queues: _queues, ...services }): MemberServicesValue => services,
      ),
    );
  }),
);

export const membersData = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const { refresh, diagnostics, discord, bulkRefreshQueue } =
      yield* MemberServices;
    const promise = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });
    const publish = (routingKey: RabbitRoutingKeyName, payload: unknown) =>
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
        clearMemberCaches: ({ discordId, guildId, userId }) =>
          Effect.all(
            [
              promise(() =>
                redis.deleteByPattern(
                  getUserLootlogConfigCachePattern(discordId),
                ),
              ),
              promise(() =>
                redis.deleteByPattern(getMemberReadCachePattern(guildId)),
              ),
              discord.clearGuildMemberDataCache({ discordId, guildId, userId }),
              promise(() => redis.del(getPermissionsCacheKey(userId, guildId))),
            ],
            { concurrency: "unbounded", discard: true },
          ),
        publishMemberRemoved: ({ discordId, guildId, userId }) =>
          publish(RabbitRoutingKey.GUILDS_MEMBERS_REMOVE, {
            id: discordId,
            discordId,
            userId,
            guildId,
          }),
        enqueueBulkRefresh: (data) =>
          promise(() =>
            bulkRefreshQueue.add("bulk-refresh", data, {
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
              jobId: `member-bulk-refresh-${data.jobId}`,
            }),
          ),
        publishRefreshJobUpdate: (job) =>
          publish(RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE, job),
      },
      config.environment,
    );
  }),
);

export const memberReadData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeMemberReadDataLayer({
      getJson: (key, schema) =>
        attempt(() => redis.getJson(key, makeJsonCodec(schema))),
      setJson: (key, value, ttl) =>
        attempt(() => redis.setJson(key, value, ttl)),
    });
  }),
);

export const memberRefreshJobData = MemberRefreshJobDataLive;

type GuildDiscordSyncValue = ReturnType<typeof makeGuildDiscordSyncData>;

export class GuildDiscordSync extends Context.Service<
  GuildDiscordSync,
  GuildDiscordSyncValue
>()("@lootlog/api/http-api/GuildDiscordSync") {}

export const guildDiscordSyncLive = Layer.effect(
  GuildDiscordSync,
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const rabbit = yield* RabbitMessaging;
    const httpClient = yield* HttpClient.HttpClient;
    const config = yield* ApiRuntimeConfig;
    const discordBot = makeDiscordBotClient(
      httpClient,
      config.discordBotServiceUrl,
    );
    return makeGuildDiscordSyncData(database, {
      staleAfterMs: 900 * 1000,
      refresh: (guildId) => discordBot.refreshGuildChannels(guildId),
      publishChannelDeleted: (payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
  }),
);

export const organizationContextLookup = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const cache: OrganizationContextCache = {
      get: (key) => attempt(() => redis.get(key)),
      set: (key, value, ttl) => attempt(() => redis.set(key, value, ttl)),
      del: (key) => attempt(() => redis.del(key)),
    };
    return OrganizationContextLookup.layerDatabase(cache);
  }),
).pipe(Layer.provide(membersData));

export const myReservationsData = MyReservationsData.layerDatabase;

type AccountOrganizationOperationsValue = AccountOrganizationData["Service"];

export class AccountOrganizationOperations extends Context.Service<
  AccountOrganizationOperations,
  AccountOrganizationOperationsValue
>()("@lootlog/api/http-api/AccountOrganizationOperations") {}

export const accountOrganizationOperationsLive = Layer.effect(
  AccountOrganizationOperations,
  Effect.gen(function* () {
    const { discord, refresh, removal } = yield* MemberServices;
    const discordSync = yield* GuildDiscordSync;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const httpClient = yield* HttpClient.HttpClient;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const cacheAttempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });
    const deleteAccount = makeUserAccountDeletion(database, {
      cleanupBattlelog: (userId) =>
        outboundHttpRequest(httpClient, {
          adapter: "battlelog-account-cleanup",
          body: JSON.stringify({ userId }),
          headers: { "content-type": "application/json" },
          method: "POST",
          responseLimitBytes: 1024 * 1024,
          retryTimes: 0,
          timeout: "5 seconds",
          url: new URL(
            "/internal/delete-user-data",
            config.battlelogServiceUrl,
          ).toString(),
        }).pipe(
          Effect.flatMap((response) => {
            if (response.status < 200 || response.status >= 300) {
              return Effect.fail(
                new Error(`Request failed with status ${response.status}`),
              );
            }
            return Effect.try(() =>
              JSON.parse(new TextDecoder().decode(response.body)),
            );
          }),
          Effect.flatMap((body) =>
            typeof body === "object" &&
            body !== null &&
            "status" in body &&
            body.status === "ACCEPTED"
              ? Effect.void
              : Effect.fail(new Error("Unexpected Battlelog cleanup response")),
          ),
        ),
      deleteCacheKey: (key) => cacheAttempt(() => redis.del(key)),
      deleteCachePattern: (pattern) =>
        cacheAttempt(() => redis.deleteByPattern(pattern)),
      publishMemberRemoved: (payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
    const preferences = makeUserPreferencesData(database);
    const getManageableUserGuilds = makeManageableGuilds(
      ({ userId, discordId }) => discord.getUserGuilds(userId, discordId),
    );
    const getUserGuildsWithPermissions = makeUserGuildPermissions(database, {
      getJson: (key, schema) =>
        Effect.tryPromise({
          try: () => redis.getJson(key, makeJsonCodec(schema)),
          catch: (error) => error,
        }),
      setJson: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttl),
          catch: (error) => error,
        }),
    });
    const getCurrentUserAccessibleGuilds = makeAccessibleGuilds(
      database,
      {
        getCached: (key) =>
          Effect.tryPromise({
            try: () =>
              redis.getJson(key, makeJsonCodec(GuildSummaryCacheSchema)),
            catch: (error) => error,
          }),
        setCached: (key, value, ttl) =>
          Effect.tryPromise({
            try: () => redis.setJson(key, value, ttl),
            catch: (error) => error,
          }),
        queueRefresh: refresh.queueMemberRefresh,
      },
      config.environment,
    );
    const getUserGuilds = makeUserGuildList(
      database,
      {
        accessible: getCurrentUserAccessibleGuilds,
        deactivateMissing: (options) =>
          removal.deactivateMembersMissingFromDiscordGuilds({
            ...options,
            activeDiscordGuildIds: [...options.activeDiscordGuildIds],
            status: MEMBER_LAST_DISCORD_STATUS.GUILD_NOT_IN_DISCORD_LIST,
          }),
        freshDiscordGuilds: ({ userId, discordId }) =>
          discord
            .getFreshCompleteUserGuilds(userId, discordId)
            .pipe(Effect.map(({ guilds }) => guilds)),
        getCache: (key) =>
          Effect.tryPromise({
            try: () => redis.get(key),
            catch: (error) => error,
          }),
        setCache: (key, value, ttl) =>
          Effect.tryPromise({
            try: () => redis.set(key, value, ttl),
            catch: (error) => error,
          }),
        queueRefresh: refresh.queueMemberRefresh,
      },
      config.environment,
    );
    const getCurrentUserGuilds = makeCurrentUserGuilds(
      database,
      {
        accessibleFallback: getCurrentUserAccessibleGuilds,
        deactivateMissing: (options) =>
          removal.deactivateMembersMissingFromDiscordGuilds({
            ...options,
            activeDiscordGuildIds: [...options.activeDiscordGuildIds],
            status: MEMBER_LAST_DISCORD_STATUS.GUILD_NOT_IN_DISCORD_LIST,
          }),
        freshDiscordGuilds: ({ userId, discordId }) =>
          discord
            .getFreshCompleteUserGuilds(userId, discordId)
            .pipe(Effect.map(({ guilds }) => guilds)),
        queueMember: refresh.queueMemberRefresh,
        refreshMember: refresh.refreshGuildMemberWithinBudget,
      },
      config.environment,
    );
    return AccountOrganizationOperations.of({
      deleteAccount,
      ...discordSync,
      getManageableUserGuilds,
      getCurrentUserAccessibleGuilds,
      getCurrentUserGuilds,
      getUserGuilds,
      getUserGuildsWithPermissions,
      ...preferences,
    });
  }),
);

export const accountOrganizationData = Layer.effect(
  AccountOrganizationData,
  Effect.map(AccountOrganizationOperations, (operations) =>
    AccountOrganizationData.of(operations),
  ),
);
