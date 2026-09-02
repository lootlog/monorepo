import { Context, Effect, Layer, Redacted } from "effect";
import { HttpClient } from "effect/unstable/http";
import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { Queue } from "bullmq";
import { ExecutionError } from "redlock";
import { inArray } from "drizzle-orm";
import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import { applicationLogger } from "#src/shared/logging/application-logger";
import {
  ConflictException,
  ServiceUnavailableException,
} from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import { AuthService } from "#src/auth/auth.service";
import { battlelogConfig } from "#src/config/battlelog.config";
import { discordBotConfig } from "#src/config/discord-bot.config";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/schema";
import { DiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "#src/discord/discord-rest-client.factory";
import {
  makeDiscordOperations,
  type DiscordOperations,
} from "#src/discord/discord.operations";
import { makeDiscordBotClient } from "#src/discord-bot-client/discord-bot-client";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { DiscordUserGuildsClient } from "#src/discord/discord-user-guilds.client";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/constants/event-hero-kill-queue.constant";
import { RESPAWN_WINDOW_QUEUE } from "#src/events/constants/respawn-queue.constant";
import { makeEventsAssignment } from "#src/events/events-assignment.operations";
import { makeEventsCatalog } from "#src/events/events-catalog.operations";
import { makeEventsCatalogRead } from "#src/events/events-catalog-read";
import { makeEventCreation } from "#src/events/event-creation";
import { makeEventAccess } from "#src/events/event-access";
import { makeEventDeletion } from "#src/events/event-deletion";
import { makeEventPointRecalculation } from "#src/events/event-point-recalculation";
import { makeEventPresenceStats } from "#src/events/event-presence-stats";
import { makeEventRankingRead } from "#src/events/event-ranking-read";
import { makeEventUpdate } from "#src/events/event-update";
import { makeEventCatalogMutations } from "#src/events/event-catalog-mutations";
import { makeEventMapAssignments } from "#src/events/event-map-assignments";
import { makeEventGapReads } from "#src/events/event-gap-reads";
import { makeEventParticipation } from "#src/events/event-participation";
import { makeEventPointEdits } from "#src/events/event-point-edits";
import { makeEventHeroSummary } from "#src/events/event-hero-summary";
import { makeEventRespawnCommands } from "#src/events/event-respawn-commands";
import { makeEventsMonitoring } from "#src/events/events-monitoring.operations";
import { makeEventsPins } from "#src/events/events-pins.operations";
import { makeEventsRanking } from "#src/events/events-ranking.operations";
import { makeActiveEventHeroStore } from "#src/events/services/active-event-hero.repository";
import { makeEventCoordinationStore } from "#src/events/services/event-coordination.repository";
import { makeEventCoordination } from "#src/events/services/event-coordination.service";
import { makeEventEmitter } from "#src/events/services/event-emitter.service";
import { makeEventKillStore } from "#src/events/services/event-kill.repository";
import {
  makeEventKills,
  type EventKills,
} from "#src/events/services/event-kill.service";
import { makeEventPointsStore } from "#src/events/services/event-points.repository";
import { makeEventPoints } from "#src/events/services/event-points.service";
import { makeEventReadCache } from "#src/events/services/event-read-cache.service";
import { makeEventRespawnStore } from "#src/events/services/event-respawn.repository";
import { makeEventRespawn } from "#src/events/services/event-respawn.service";
import { makeEventSummaryStore } from "#src/events/services/event-summary.repository";
import { makeEventSummary } from "#src/events/services/event-summary.service";
import {
  makeEventPresenceTracking,
  type EventPresenceTracking,
} from "#src/events/event-presence-tracking";
import {
  makeEventTimersPort,
  type EventTimersPort,
} from "#src/events/services/event-timers.port";
import { makeEventTimerStore } from "#src/events/services/event-timer.store";
import { makeEventWrappedStore } from "#src/events/services/event-wrapped.repository";
import { makeEventWrapped } from "#src/events/services/event-wrapped.service";
import { makePinnedEventsPersistence } from "#src/events/services/pinned-events.repository";
import { makeMapsOperation } from "#src/maps/maps.operation";
import { makeKillCreation } from "#src/kills/kill-creation";
import { makeUserKillQueries } from "#src/kills/user-kill-queries";
import { makeKillStatsPersistence } from "#src/kills/kill-stats-persistence";
import { makeMemberKillQuery } from "#src/kills/member-kill-query";
import { makeGuildKillQueries } from "#src/kills/guild-kill-queries";
import { makeLootAllocationPersistence } from "#src/loots/loot-allocation-persistence";
import { makeLootAllocationOperations } from "#src/loots/loot-allocation.operations";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/loot-submission-acceptance.repository";
import { makeLootSubmissionAcceptance } from "#src/loots/loot-submission-acceptance.service";
import {
  makeLootsOperations,
  type LootsOperations,
} from "#src/loots/loots.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootQueryPersistence } from "#src/loots/services/loot-query.persistence";
import { makeLootQueryOperations } from "#src/loots/services/loot-query.operations";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { makeLootStatsQuery } from "#src/loots/services/loot-stats-query";
import { makeMemberStore } from "#src/members/member.store";
import {
  makeMemberRefreshScheduler,
  type MemberRefreshScheduler,
} from "#src/members/member-refresh-scheduler";
import {
  makeMemberSync,
  type MemberSync,
} from "#src/members/member-sync.operations";
import {
  makeMemberRefresh,
  type MemberRefresh,
} from "#src/members/member-refresh.operations";
import {
  makeMemberRemoval,
  type MemberRemoval,
} from "#src/members/member-removal.operations";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_PRIORITY,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/constants/member-refresh-queue.constant";
import type { MemberBulkRefreshJobData } from "#src/members/member.types";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/constants/member-discord-status.constant";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import {
  getMemberReadCachePattern,
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "#src/shared/constants/cache.constant";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import {
  makePublicGuildStatsCard,
  PublicGuildStatsCardAdapterError,
  PublicGuildStatsCardImageAdapter,
} from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { NOTIFICATIONS_HISTORY_RETENTION_LIMIT } from "#src/notifications/constants/notifications-history.constant";
import { makeNotificationContent } from "#src/notifications/notification-content.service";
import { makeNotificationTestContent } from "#src/notifications/notification-test-content";
import { makeNotificationJobStore } from "#src/notifications/notification-job-store";
import {
  makeNotificationMatching,
  type NotificationMatching,
} from "#src/notifications/notification-matching.service";
import type { JsonValue } from "#src/notifications/notification-database.types";
import { Error as NotificationError } from "#src/notifications/enum/error.enum";
import { makeNotificationRuleOperations } from "#src/notifications/notification-rule-operations";
import { makeNotificationJobScheduler } from "#src/notifications/notification-job-scheduler";
import { makeNotificationJobDispatch } from "#src/notifications/notification-job-dispatch";
import { makeNotificationDeliveryResult } from "#src/notifications/notification-delivery-result";
import { makeNotificationJobRecurrence } from "#src/notifications/notification-job-recurrence";
import {
  makeNotificationJobRebuild,
  type NotificationJobRebuild,
} from "#src/notifications/notification-job-rebuild";
import {
  makeNotificationGuildTargets,
  type NotificationGuildTargets,
} from "#src/notifications/notification-guild-targets";
import { makeNotificationUserTargets } from "#src/notifications/notification-user-targets";
import { makeNotificationJobOperations } from "#src/notifications/notification-job-operations";
import {
  makeNotificationEventStore,
  type NotificationEventStore,
} from "#src/notifications/notification-event-store";
import { makeNotificationWatchedItems } from "#src/notifications/notification-watched-items";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import {
  InternalGuildsData,
  InternalGuildsOperationError,
  type InternalGuildsCache,
} from "../handlers/internal/internal.handlers.js";
import { notificationDataLayer } from "../handlers/notifications/notifications.data-layer.js";
import {
  makeMemberReadDataLayer,
  MemberRefreshJobDataLive,
} from "../handlers/members/member-read.data-layer.js";
import { makeMembersDataLayer } from "../handlers/members/member-commands.data-layer.js";
import {
  ReservationsRolesOperationError,
  MyReservationsData,
  RolesData,
} from "../handlers/reservations-roles/reservations-roles.handlers.js";
import { makeReservationSharingDataLayer } from "../handlers/reservations-roles/reservation-sharing.data-layer.js";
import { makeReservationReadDataLayer } from "../handlers/reservations-roles/reservation-read.data-layer.js";
import { makeReservationCatalogAdapter } from "../handlers/reservations-roles/reservation-catalog.adapter.js";
import { makeReservationMutationsDataLayer } from "../handlers/reservations-roles/reservation-mutations.data-layer.js";
import { env } from "#src/config/env";
import {
  PublicSystemData,
  PublicSystemOperationError,
} from "../handlers/public-system/public-system.handlers.js";
import {
  UserLootlogConfigData,
  UserLootlogConfigOperationError,
  type UserLootlogConfigCache,
} from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import {
  makeChatDataLayer,
  makeChatOperations,
  type ChatEvents,
  type ChatRedis,
} from "../handlers/chat/chat.data-layer.js";
import {
  createReadyRoomForNotification,
  makeReadyRoomDataLayer,
} from "../handlers/party-ready-room/ready-room.data-layer.js";
import { makeMessagingDataLayer } from "../handlers/messaging/messaging.data-layer.js";
import { eventDataLayer } from "../handlers/events/events.data-layer.js";
import { killsLootsDataLayer } from "../handlers/kills-loots/kills-loots.data-layer.js";
import { TimersData } from "../handlers/timers/timers.handlers.js";
import { makeTimerSearch } from "../handlers/timers/timer-search.data-layer.js";
import { makeTimerHistory } from "../handlers/timers/timer-history.data-layer.js";
import {
  makeAllTimerList,
  makeGuildTimerList,
} from "../handlers/timers/timer-list.data-layer.js";
import { makeManualTimer } from "../handlers/timers/timer-manual.data-layer.js";
import { makeDeleteTimer } from "../handlers/timers/timer-delete.data-layer.js";
import { makeRestoreTimer } from "../handlers/timers/timer-restore.data-layer.js";
import { makeResetTimer } from "../handlers/timers/timer-reset.data-layer.js";
import { makeAutoTimer } from "../handlers/timers/timer-auto.data-layer.js";
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "#src/events/utils/event-hero-kill-job";
import {
  GuildConfigurationData,
  UsersGuildsData,
  UsersGuildsOperationError,
} from "../handlers/users-guilds/users-guilds.handlers.js";
import { makeUserAccountDeletion } from "../handlers/users-guilds/user-account-deletion.data-layer.js";
import { makeUserPreferencesData } from "../handlers/users-guilds/user-preferences.data-layer.js";
import { makeManageableGuilds } from "../handlers/users-guilds/manageable-guilds.data-layer.js";
import { makeGuildDiscordSyncData } from "../handlers/users-guilds/guild-discord-sync.data-layer.js";
import { makeUserGuildPermissions } from "../handlers/users-guilds/user-guild-permissions.data-layer.js";
import { makeAccessibleGuilds } from "../handlers/users-guilds/accessible-guilds.data-layer.js";
import { makeUserGuildList } from "../handlers/users-guilds/user-guild-list.data-layer.js";
import { makeCurrentUserGuilds } from "../handlers/users-guilds/current-user-guilds.data-layer.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import {
  OrganizationContextLookup,
  type OrganizationContextCache,
} from "./organization-context.js";

export const NativePublicSystemData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const repository = yield* PublicGuildStatsCardRepository;
    const cacheOperation = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new PublicGuildStatsCardAdapterError({ cause }),
      });
    return PublicSystemData.layerServices({
      getMaps: makeMapsOperation({
        httpClient,
        redis,
        url: config.mapsApiUrl,
      }).pipe(
        Effect.mapError((cause) => new PublicSystemOperationError({ cause })),
      ),
      statsCard: makePublicGuildStatsCard({
        repository,
        environment: config.environment,
        image: new PublicGuildStatsCardImageAdapter(httpClient),
        cache: {
          get: (key) => cacheOperation(() => redis.get(key)),
          set: (key, value, ttl) =>
            cacheOperation(() => redis.set(key, value, ttl)),
          setNX: (key, value, ttl) =>
            cacheOperation(() => redis.setNX(key, value, ttl)),
          del: (key) =>
            cacheOperation(() => redis.del(key)).pipe(Effect.asVoid),
        },
      }),
      local: config.environment === "local",
    });
  }),
).pipe(Layer.provide(PublicGuildStatsCardRepository.layerDatabase));

export const NativeInternalGuildsData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const cacheOperation = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new InternalGuildsOperationError({ cause }),
      });
    const cache: InternalGuildsCache = {
      get: (key) => cacheOperation(() => redis.get(key)),
      getJson: <A>(key: string) => cacheOperation(() => redis.getJson<A>(key)),
      set: (key, value, ttl) =>
        cacheOperation(() => redis.set(key, value, ttl)),
      setJson: (key, value, ttl) =>
        cacheOperation(() => redis.setJson(key, value, ttl)),
      del: (key) => cacheOperation(() => redis.del(key)).pipe(Effect.asVoid),
    };
    return InternalGuildsData.layerDatabase(cache);
  }),
);

export const nativeLogger = applicationLogger;

export const makeAmqpAdapter = (rabbit: RabbitMessaging["Service"]) =>
  ({
    publish: (exchange: string, routingKey: string, payload: unknown) =>
      Effect.runPromise(
        rabbit.publish({
          exchange: exchange as "default",
          routingKey: routingKey as Parameters<
            typeof rabbit.publish
          >[0]["routingKey"],
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
      ),
  }) satisfies AmqpPublisher;

export const NativeMessagingData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const readyRedis = {
      getJson: <A>(key: string) => attempt(() => redis.getJson<A>(key)),
      eval: <A>(
        script: string,
        keys: ReadonlyArray<string>,
        arguments_: ReadonlyArray<string | number>,
      ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
    };
    const publishReadyRoom = (envelope: unknown) =>
      rabbit
        .publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
          content: new TextEncoder().encode(JSON.stringify(envelope)),
        })
        .pipe(Effect.asVoid);
    return makeMessagingDataLayer(
      {
        get: (key) => attempt(() => redis.get(key)),
        set: (key, value, ttl) => attempt(() => redis.set(key, value, ttl)),
        eval: <A>(
          script: string,
          keys: ReadonlyArray<string>,
          arguments_: ReadonlyArray<string | number>,
        ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
      },
      {
        publish: (routingKey, payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid),
      },
      {
        create: (input) =>
          createReadyRoomForNotification(
            readyRedis,
            { publish: publishReadyRoom },
            input,
          ),
      },
    );
  }),
);

export const NativeReadyRoomData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const redisAdapter: ChatRedis = {
      rpush: (key, value) => attempt(() => redis.rpush(key, value)),
      ltrim: (key, start, stop) => attempt(() => redis.ltrim(key, start, stop)),
      lrange: (key, start, stop) =>
        attempt(() => redis.lrange(key, start, stop)),
      lset: (key, index, value) => attempt(() => redis.lset(key, index, value)),
      lrem: (key, count, value) => attempt(() => redis.lrem(key, count, value)),
      del: (key) => attempt(() => redis.del(key)),
    };
    const chatEvents: ChatEvents = {
      publish: (routingKey, payload) =>
        rabbit
          .publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          })
          .pipe(Effect.asVoid),
    };
    const chat = yield* makeChatOperations(redisAdapter, chatEvents);
    return makeReadyRoomDataLayer(
      {
        getJson: <A>(key: string) => attempt(() => redis.getJson<A>(key)),
        eval: <A>(
          script: string,
          keys: ReadonlyArray<string>,
          arguments_: ReadonlyArray<string | number>,
        ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
      },
      {
        publish: (envelope) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
              content: new TextEncoder().encode(JSON.stringify(envelope)),
            })
            .pipe(Effect.asVoid),
        endPartyGatheringMessages: chat.endPartyGatheringMessages,
      },
    );
  }),
);

export const NativeChatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeChatDataLayer(
      {
        rpush: (key, value) => attempt(() => redis.rpush(key, value)),
        ltrim: (key, start, stop) =>
          attempt(() => redis.ltrim(key, start, stop)),
        lrange: (key, start, stop) =>
          attempt(() => redis.lrange(key, start, stop)),
        lset: (key, index, value) =>
          attempt(() => redis.lset(key, index, value)),
        lrem: (key, count, value) =>
          attempt(() => redis.lrem(key, count, value)),
        del: (key) => attempt(() => redis.del(key)),
      },
      {
        publish: (routingKey, payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid),
      },
    );
  }),
);

export const NativeUserLootlogConfigData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new UserLootlogConfigOperationError({ cause }),
      });
    const cache: UserLootlogConfigCache = {
      getJson: <A>(key: string) => attempt(() => redis.getJson<A>(key)),
      setJson: (key, value, ttl) =>
        attempt(() => redis.setJson(key, value, ttl)),
      deleteByPattern: (pattern) =>
        attempt(() => redis.deleteByPattern(pattern)).pipe(Effect.asVoid),
    };
    return UserLootlogConfigData.layerDatabase(cache);
  }),
);

export const NativeRolesData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    RolesData.layerDatabase({
      deleteByPattern: (pattern) =>
        Effect.tryPromise({
          try: () => redis.deleteByPattern(pattern),
          catch: (cause) => new ReservationsRolesOperationError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  ),
);

export const NativeGuildConfigurationData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    GuildConfigurationData.layerDatabase({
      get: (key) =>
        Effect.tryPromise({
          try: () => redis.get(key),
          catch: (cause) => new UsersGuildsOperationError({ cause }),
        }),
      set: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.set(key, value, ttl),
          catch: (cause) => new UsersGuildsOperationError({ cause }),
        }),
      del: (key) =>
        Effect.tryPromise({
          try: () => redis.del(key),
          catch: (cause) => new UsersGuildsOperationError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  ),
);

export const NativeReservationSharingData = Layer.unwrap(
  Effect.map(RabbitMessaging, (rabbit) =>
    makeReservationSharingDataLayer({
      sharingChanged: (sourceGuildId, audienceGuildIds) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
          content: new TextEncoder().encode(
            JSON.stringify({
              version: 2,
              action: "sharing-changed",
              sourceGuildId,
              audienceGuildIds,
              reservationId: null,
              spotId: null,
            }),
          ),
        }),
    }),
  ),
);

export const NativeReservationReadData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const httpClient = yield* HttpClient.HttpClient;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeReservationReadDataLayer(
      makeReservationCatalogAdapter({
        cache: {
          getJson: <A>(key: string) => attempt(() => redis.getJson<A>(key)),
          setJson: (key, value, ttl) =>
            attempt(() => redis.setJson(key, value, ttl)),
        },
        httpClient,
        url: env.RESERVATIONS_CARDS_URL,
      }),
    );
  }),
);

interface NativeMemberServicesValue {
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

export class NativeMemberServices extends Context.Service<
  NativeMemberServices,
  NativeMemberServicesValue
>()("@lootlog/api/http-api/NativeMemberServices") {}

export const NativeMemberServicesLive = Layer.effect(
  NativeMemberServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const database = yield* ApiDatabase;
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
          nativeLogger,
          redis,
        );
        const rateLimiter = new DiscordRateLimiterService(nativeLogger, redis);
        const redlock = new RedlockService(redis);
        const restClientFactory = new DiscordRestClientFactory(
          new AuthService(nativeLogger, redis, httpClient),
        );
        const userGuildsClient = new DiscordUserGuildsClient(
          nativeLogger,
          redis,
          rateLimiter,
          redlock,
          diagnostics,
          restClientFactory,
        );
        const guildMemberClient = new DiscordGuildMemberClient(
          nativeLogger,
          redis,
          rateLimiter,
          redlock,
          diagnostics,
          restClientFactory,
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
          nativeLogger,
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
          nativeLogger,
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
        Effect.promise(async () => {
          await Promise.all(queues.map((queue) => queue.close()));
        }),
    ).pipe(
      Effect.map(
        ({ queues: _queues, ...services }): NativeMemberServicesValue =>
          services,
      ),
    );
  }),
);

export const NativeMembersData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const { refresh, diagnostics, discord, bulkRefreshQueue } =
      yield* NativeMemberServices;
    const promise = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });
    const publish = (routingKey: RabbitRoutingKeyName, payload: unknown) =>
      rabbit.publish({
        exchange: "default",
        routingKey,
        content: new TextEncoder().encode(JSON.stringify(payload)),
      });
    return makeMembersDataLayer({
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
    });
  }),
);

export const NativeMemberReadData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeMemberReadDataLayer({
      getJson: <A>(key: string) => attempt(() => redis.getJson<A>(key)),
      setJson: (key, value, ttl) =>
        attempt(() => redis.setJson(key, value, ttl)),
    });
  }),
);

export const NativeMemberRefreshJobData = MemberRefreshJobDataLive;

type NativeGuildDiscordSyncValue = ReturnType<typeof makeGuildDiscordSyncData>;

export class NativeGuildDiscordSync extends Context.Service<
  NativeGuildDiscordSync,
  NativeGuildDiscordSyncValue
>()("@lootlog/api/http-api/NativeGuildDiscordSync") {}

export const NativeGuildDiscordSyncLive = Layer.effect(
  NativeGuildDiscordSync,
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const rabbit = yield* RabbitMessaging;
    const httpClient = yield* HttpClient.HttpClient;
    const discordBot = makeDiscordBotClient(httpClient);
    return makeGuildDiscordSyncData(database, {
      staleAfterMs: discordBotConfig.channelSnapshotStaleSeconds * 1000,
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

export const NativeOrganizationContextLookup = Layer.unwrap(
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
).pipe(Layer.provide(NativeMembersData));

export const NativeMyReservationsData = MyReservationsData.layerDatabase;

type NativeUsersGuildsOperationsValue = UsersGuildsData["Service"];

export class NativeUsersGuildsOperations extends Context.Service<
  NativeUsersGuildsOperations,
  NativeUsersGuildsOperationsValue
>()("@lootlog/api/http-api/NativeUsersGuildsOperations") {}

export const NativeUsersGuildsOperationsLive = Layer.effect(
  NativeUsersGuildsOperations,
  Effect.gen(function* () {
    const { discord, refresh, removal } = yield* NativeMemberServices;
    const discordSync = yield* NativeGuildDiscordSync;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const httpClient = yield* HttpClient.HttpClient;
    const database = yield* ApiDatabase;
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
          url: `${battlelogConfig.serviceUrl}/internal/delete-user-data`,
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
      getJson: <A>(key: string) =>
        Effect.tryPromise({
          try: () => redis.getJson<A>(key),
          catch: (error) => error,
        }),
      setJson: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttl),
          catch: (error) => error,
        }),
    });
    const getCurrentUserAccessibleGuilds = makeAccessibleGuilds(database, {
      getCached: (key) =>
        Effect.tryPromise({
          try: () => redis.getJson(key),
          catch: (error) => error,
        }),
      setCached: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttl),
          catch: (error) => error,
        }),
      queueRefresh: refresh.queueMemberRefresh,
    });
    const getUserGuilds = makeUserGuildList(database, {
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
    });
    const getCurrentUserGuilds = makeCurrentUserGuilds(database, {
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
    });
    return NativeUsersGuildsOperations.of({
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

export const NativeUsersGuildsData = Layer.effect(
  UsersGuildsData,
  Effect.map(NativeUsersGuildsOperations, (operations) =>
    UsersGuildsData.of(operations),
  ),
);

export const NativeReservationMutationsData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const notificationsQueue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(NOTIFICATIONS_DISPATCH_QUEUE, {
            connection: {
              host: config.redis.host,
              port: config.redis.port,
              username: config.redis.username,
              password: Redacted.value(config.redis.password),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
            prefix: "{bull}",
          }),
      ),
      (queue) => Effect.promise(() => queue.close()),
    );
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const catalog = makeReservationCatalogAdapter({
      cache: {
        getJson: <A>(key: string) => attempt(() => redis.getJson<A>(key)),
        setJson: (key, value, ttl) =>
          attempt(() => redis.setJson(key, value, ttl)),
      },
      httpClient,
      url: env.RESERVATIONS_CARDS_URL,
    });
    return makeReservationMutationsDataLayer({
      catalog,
      enqueueNotification: (notificationJobId, delay) =>
        attempt(() =>
          notificationsQueue.add(
            notificationJobId,
            { notificationJobId },
            {
              jobId: notificationJobId,
              delay,
              removeOnComplete: true,
              removeOnFail: true,
            },
          ),
        ),
      removeNotification: (notificationJobId) =>
        attempt(async () => {
          const job = await notificationsQueue.getJob(notificationJobId);
          await job?.remove();
        }),
      publish: (routingKey, payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
  }),
);

export class NativeEventTimers extends Context.Service<
  NativeEventTimers,
  EventTimersPort
>()("@lootlog/api/http-api/NativeEventTimers") {}

export const NativeEventTimersLive = Layer.effect(
  NativeEventTimers,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    return makeEventTimersPort({
      logger: nativeLogger,
      store: makeEventTimerStore(database),
      amqp: makeAmqpAdapter(rabbit),
      redis,
      redlock: new RedlockService(redis),
    });
  }),
);

export const NativeTimersData = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const eventHeroKillQueue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(EVENT_HERO_KILL_QUEUE, {
            connection: {
              host: config.redis.host,
              port: config.redis.port,
              username: config.redis.username,
              password: Redacted.value(config.redis.password),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
            prefix: "{bull}",
          }),
      ),
      (queue) => Effect.promise(() => queue.close()),
    );
    const redlock = new RedlockService(redis).createInstance({
      automaticExtensionThreshold: 5000,
    });
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const service = TimersData.makeService({
      ...makeTimerHistory(database),
      createAuto: makeAutoTimer(database, {
        enqueueEventHeroCheck: (check) => {
          const windowKey = getEventHeroKillWindowKey(check.timerData);
          const jobId = buildEventHeroKillJobId({
            guildId: check.guildId,
            world: check.world,
            npcId: check.npcId,
            windowKey,
            isManualClose: false,
          });
          return attempt(() =>
            eventHeroKillQueue.add(
              EVENT_HERO_KILL_JOB_NAME,
              createEventHeroKillJobData(check, false),
              {
                jobId,
                attempts: 5,
                backoff: { type: "exponential", delay: 1000 },
                removeOnComplete: true,
                removeOnFail: false,
              },
            ),
          );
        },
        get: (key) => attempt(() => redis.get(key)),
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
        releaseDedup: (script, key, token) =>
          attempt(() => redis.eval(script, [key], [token])).pipe(Effect.ignore),
        set: (key, value, ttlSeconds) =>
          attempt(() => redis.set(key, value, ttlSeconds)),
        setNx: (key, value, ttlSeconds) =>
          attempt(() => redis.setNX(key, value, ttlSeconds)),
        withLock: (key, effect) =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => redlock.acquire([key], 30_000),
              catch: (error) =>
                new ConflictException({
                  message: ErrorKey.TIMER_RACE_CONDITION,
                  cause: error,
                }),
            }),
            () => effect,
            (lock: Awaited<ReturnType<typeof redlock.acquire>>) =>
              Effect.promise(() => lock.release()).pipe(Effect.ignore),
          ),
      }),
      createManual: makeManualTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
      }),
      delete: makeDeleteTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
      }),
      restore: makeRestoreTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
      }),
      reset: makeResetTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
        withLock: (key, effect) =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => redlock.acquire([key], 30_000),
              catch: (error) =>
                new ConflictException({
                  message: ErrorKey.TIMER_RACE_CONDITION,
                  cause: error,
                }),
            }),
            () => effect,
            (lock: Awaited<ReturnType<typeof redlock.acquire>>) =>
              Effect.promise(() => lock.release()).pipe(Effect.ignore),
          ),
      }),
      getAll: makeAllTimerList(database),
      getGuildTimers: makeGuildTimerList(database, {
        get: (key) => attempt(() => redis.getJson(key)),
        set: (key, value, ttlSeconds) =>
          attempt(() => redis.setJson(key, value, ttlSeconds)),
      }),
      searchNpcs: makeTimerSearch(database),
    });
    return Layer.succeed(TimersData, service);
  }),
);

interface NativeKillsLootsServicesValue {
  readonly layer: ReturnType<typeof killsLootsDataLayer>;
  readonly loots: LootsOperations;
}

export class NativeKillsLootsServices extends Context.Service<
  NativeKillsLootsServices,
  NativeKillsLootsServicesValue
>()("@lootlog/api/http-api/NativeKillsLootsServices") {}

export const NativeKillsLootsServicesLive = Layer.effect(
  NativeKillsLootsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const lootStats = new LootStatsService(makeLootStatsQuery(database), redis);
    const redlock = new RedlockService(redis).createInstance();
    const acceptance = makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        publish: (exchange, routingKey, message) =>
          rabbit
            .publish({
              exchange: exchange as "default",
              routingKey: routingKey as Parameters<
                typeof rabbit.publish
              >[0]["routingKey"],
              content: new TextEncoder().encode(JSON.stringify(message)),
            })
            .pipe(Effect.asVoid),
      },
      lootStats,
      {
        deleteByPattern: (pattern) =>
          Effect.tryPromise({
            try: () => redis.deleteByPattern(pattern),
            catch: (cause) => cause,
          }),
      },
      nativeLogger,
      {
        withLock: (resource, ttlMilliseconds, options, effect) =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => redlock.acquire([resource], ttlMilliseconds, options),
              catch: (cause) => {
                if (cause instanceof ExecutionError) {
                  nativeLogger.log({
                    level: "error",
                    message: "Lock acquisition failed for createLoot",
                    resource,
                  });
                  return new ServiceUnavailableException(
                    "Failed to acquire loot lock",
                  );
                }
                return cause;
              },
            }),
            () => effect,
            (heldLock) =>
              Effect.promise(() =>
                (
                  heldLock as Awaited<ReturnType<typeof redlock.acquire>>
                ).release(),
              ).pipe(Effect.ignore),
          ),
      },
    );
    const loots = makeLootsOperations({
      persistence: makeLootPersistence(database),
      query: makeLootQueryOperations(makeLootQueryPersistence(database)),
      stats: lootStats,
      redis,
      logger: nativeLogger,
    });
    const killStatsPersistence = makeKillStatsPersistence(database);
    const killQueryCache = {
      get: <A>(key: string) =>
        Effect.tryPromise({
          try: () => redis.getJson<A>(key),
          catch: (error) => error,
        }),
      set: <A>(key: string, value: A, ttlSeconds: number) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttlSeconds),
          catch: (error) => error,
        }),
    };
    return {
      loots,
      layer: killsLootsDataLayer({
        createKill: makeKillCreation(
          database,
          {
            deleteByPattern: (pattern) =>
              Effect.tryPromise({
                try: () => redis.deleteByPattern(pattern),
                catch: (error) => error,
              }),
            setNx: (key, value, ttlSeconds) =>
              Effect.tryPromise({
                try: () => redis.setNX(key, value, ttlSeconds),
                catch: (error) => error,
              }),
          },
          nativeLogger,
        ),
        guildKillQueries: makeGuildKillQueries(
          killStatsPersistence,
          killQueryCache,
          nativeLogger,
        ),
        memberKillQuery: makeMemberKillQuery(
          killStatsPersistence,
          killQueryCache,
          nativeLogger,
        ),
        userKillQueries: makeUserKillQueries(
          database,
          killQueryCache,
          nativeLogger,
        ),
        loots,
        lootStats,
        lootSubmissionAcceptance: acceptance,
        lootAllocation: makeLootAllocationOperations({
          persistence: makeLootAllocationPersistence(database),
          cache: {
            deleteByPattern: (pattern) =>
              Effect.tryPromise({
                try: () => redis.deleteByPattern(pattern),
                catch: (error) => error,
              }),
          },
          publisher: {
            publish: (exchange, routingKey, event) =>
              rabbit
                .publish({
                  exchange: exchange as "default",
                  routingKey: routingKey as Parameters<
                    typeof rabbit.publish
                  >[0]["routingKey"],
                  content: new TextEncoder().encode(JSON.stringify(event)),
                })
                .pipe(Effect.asVoid),
          },
          logger: nativeLogger,
        }),
      }),
    };
  }),
);

export const NativeKillsLootsData = Layer.unwrap(
  Effect.map(NativeKillsLootsServices, ({ layer }) => layer),
);

interface NativeEventsServicesValue {
  readonly layer: ReturnType<typeof eventDataLayer>;
  readonly kills: EventKills;
  readonly tracking: EventPresenceTracking;
}

export class NativeEventsServices extends Context.Service<
  NativeEventsServices,
  NativeEventsServicesValue
>()("@lootlog/api/http-api/NativeEventsServices") {}

export const NativeEventsServicesLive = Layer.effect(
  NativeEventsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const timers = yield* NativeEventTimers;
    const { loots } = yield* NativeKillsLootsServices;
    const queueOptions = {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        username: config.redis.username,
        password: Redacted.value(config.redis.password),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
      prefix: "{bull}",
    } as const;
    const queues = yield* Effect.acquireRelease(
      Effect.sync(() => ({
        respawn: new Queue(RESPAWN_WINDOW_QUEUE, queueOptions),
      })),
      ({ respawn }) => Effect.promise(() => respawn.close()),
    );
    const amqp = makeAmqpAdapter(rabbit);
    const readCache = makeEventReadCache(redis);
    const emitter = makeEventEmitter(amqp);
    const summary = makeEventSummary(makeEventSummaryStore(database));
    const tracking = makeEventPresenceTracking(
      database,
      timers,
      new RedlockService(redis),
      emitter,
      nativeLogger,
    );
    const points = makeEventPoints(
      makeEventPointsStore(database),
      emitter,
      readCache,
    );
    const kill = makeEventKills(
      makeEventKillStore(database),
      makeActiveEventHeroStore(database),
      redis,
      emitter,
      readCache,
      points,
      tracking,
      summary,
      timers,
      queues.respawn,
    );
    const respawn = makeEventRespawn(
      makeEventRespawnStore(database),
      readCache,
      timers,
    );
    const wrapped = makeEventWrapped(
      makeEventWrappedStore(database),
      redis,
      loots,
    );
    const coordination = makeEventCoordination(
      makeEventCoordinationStore(database),
      timers,
    );
    const presenceStats = makeEventPresenceStats(database, readCache);
    const rankingRead = makeEventRankingRead(database, readCache);
    const catalogRead = makeEventsCatalogRead(database, redis, nativeLogger);
    const eventAccess = makeEventAccess(database);
    const layer = eventDataLayer({
      assignment: makeEventsAssignment(
        eventAccess,
        makeEventCatalogMutations(database, redis, nativeLogger),
        makeEventMapAssignments(
          database,
          redis,
          timers,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
                .pipe(Effect.asVoid),
          },
          nativeLogger,
        ),
      ),
      catalog: {
        ...makeEventsCatalog(wrapped),
        ...catalogRead,
        createEvent: makeEventCreation(database, redis, nativeLogger),
        deleteEvent: makeEventDeletion(
          database,
          redis,
          {
            pending: () =>
              queues.respawn.getJobs(["waiting"]).then((jobs) =>
                jobs.map((job) => ({
                  eventId: job.data.eventId,
                  remove: () => job.remove(),
                })),
              ),
            delayed: () =>
              queues.respawn.getJobs(["delayed"]).then((jobs) =>
                jobs.map((job) => ({
                  eventId: job.data.eventId,
                  remove: () => job.remove(),
                })),
              ),
          },
          nativeLogger,
        ),
        recalculatePoints: makeEventPointRecalculation(
          database,
          redis,
          {
            recalculate: (eventId, basePointsPerKill) =>
              points.recalculateEventPoints(eventId, basePointsPerKill),
          },
          nativeLogger,
        ),
        updateEvent: makeEventUpdate(
          database,
          redis,
          catalogRead,
          nativeLogger,
        ),
      },
      monitoring: makeEventsMonitoring(
        coordination,
        kill,
        presenceStats,
        respawn,
        eventAccess,
        makeEventGapReads(database, redis, nativeLogger),
        makeEventRespawnCommands(
          database,
          redis,
          timers,
          {
            delayed: () =>
              Effect.tryPromise({
                try: () => queues.respawn.getJobs(["delayed"]),
                catch: (error) => error,
              }).pipe(
                Effect.map((jobs) =>
                  jobs.map((job) => ({
                    heroId: job.data.heroId,
                    remove: Effect.tryPromise({
                      try: () => job.remove(),
                      catch: (error) => error,
                    }).pipe(Effect.asVoid),
                  })),
                ),
              ),
          },
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
                .pipe(Effect.asVoid),
          },
          {
            record: ({ guildId, hero, event, timer }) =>
              kill
                .recordHeroKill(
                  guildId,
                  hero,
                  event,
                  {
                    minSpawnTime: timer.minSpawnTime,
                    maxSpawnTime: timer.maxSpawnTime,
                    memberId: timer.createdById ?? undefined,
                    previousMinSpawnTime: timer.minSpawnTime,
                    previousMaxSpawnTime: timer.maxSpawnTime,
                    windowOpenedAt: timer.windowOpenedAt ?? undefined,
                  },
                  true,
                )
                .pipe(Effect.asVoid),
          },
          nativeLogger,
        ),
      ),
      pins: makeEventsPins(makePinnedEventsPersistence(database)),
      ranking: makeEventsRanking(
        rankingRead,
        kill,
        catalogRead,
        eventAccess,
        makeEventParticipation(
          database,
          redis,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
                .pipe(Effect.asVoid),
          },
          nativeLogger,
        ),
        makeEventPointEdits(
          database,
          redis,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
                .pipe(Effect.asVoid),
          },
          nativeLogger,
        ),
        makeEventHeroSummary(database, redis, timers, nativeLogger),
      ),
    });
    return { kills: kill, layer, tracking };
  }),
);

export const NativeEventsData = Layer.unwrap(
  Effect.map(NativeEventsServices, ({ layer }) => layer),
);

interface NativeNotificationsServicesValue {
  readonly layer: ReturnType<typeof notificationDataLayer>;
  readonly scheduler: ReturnType<typeof makeNotificationJobScheduler>;
  readonly matching: NotificationMatching;
  readonly store: NotificationEventStore;
  readonly targets: NotificationGuildTargets;
  readonly dispatch: ReturnType<typeof makeNotificationJobDispatch>;
  readonly delivery: ReturnType<typeof makeNotificationDeliveryResult>;
  readonly rebuild: NotificationJobRebuild;
}

export class NativeNotificationsServices extends Context.Service<
  NativeNotificationsServices,
  NativeNotificationsServicesValue
>()("@lootlog/api/http-api/NativeNotificationsServices") {}

export const NativeNotificationsServicesLive = Layer.effect(
  NativeNotificationsServices,
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const guildSync = yield* NativeGuildDiscordSync;
    const userGuilds = yield* NativeUsersGuildsOperations;
    const queue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(NOTIFICATIONS_DISPATCH_QUEUE, {
            connection: {
              host: config.redis.host,
              port: config.redis.port,
              username: config.redis.username,
              password: Redacted.value(config.redis.password),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
            prefix: "{bull}",
          }),
      ),
      (notificationsQueue) => Effect.promise(() => notificationsQueue.close()),
    );
    const store = makeNotificationEventStore(database);
    const jobsStore = makeNotificationJobStore(database);
    const matching = makeNotificationMatching(database);
    const content = makeNotificationContent();
    const testContent = makeNotificationTestContent(store, matching, content);
    const notificationScheduler = makeNotificationJobScheduler(database, {
      remove: (jobId) =>
        Effect.tryPromise({
          try: async () => {
            const job = await queue.getJob(jobId);
            await job?.remove();
          },
          catch: (cause) => cause,
        }),
      add: (jobId, delay) =>
        Effect.tryPromise({
          try: () =>
            queue.add(
              jobId,
              { notificationJobId: jobId },
              {
                jobId,
                delay,
                removeOnComplete: true,
                removeOnFail: true,
              },
            ),
          catch: (cause) => cause,
        }).pipe(Effect.asVoid),
    });
    const rebuild = makeNotificationJobRebuild(
      {
        findRule: (ruleId) => jobsStore.findRule(ruleId),
        timers: jobsStore.findTimers,
      },
      (filters, npcId) => matching.matchesTimerRule(filters, npcId),
      guildSync.hasRequiredGuildPermissions,
      {
        timer: (options) => content.buildTimerNotificationPayload(options),
        scheduledMessage: (options) =>
          content.buildScheduledMessagePayload(options),
      },
      notificationScheduler,
    );
    const dispatch = makeNotificationJobDispatch(
      {
        find: jobsStore.findJobWithRelations,
        update: jobsStore.updateJob,
        claim: jobsStore.claimJob,
      },
      {
        hasRequiredGuildPermissions: guildSync.hasRequiredGuildPermissions,
      },
      {
        publish: (payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey: RabbitRoutingKey.NOTIFICATIONS_DISCORD_SEND,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid) as Effect.Effect<void, unknown, never>,
      },
      notificationScheduler,
      (value) => content.parseAllowedMentions(value as JsonValue),
    );
    const recurrence = makeNotificationJobRecurrence(
      {
        findRule: jobsStore.findRule,
        cycleStatuses: jobsStore.cycleStatuses,
        advance: jobsStore.advanceRule,
      },
      guildSync.hasRequiredGuildPermissions,
      {
        scheduledMessage: (options) =>
          content.buildScheduledMessagePayload(options),
      },
      notificationScheduler,
    );
    const delivery = makeNotificationDeliveryResult(
      {
        find: jobsStore.findJob,
        record: jobsStore.recordDelivery,
        prune: ({ ownerType, ownerId }) =>
          jobsStore.prune(
            ownerType,
            ownerId,
            ["SENT", "FAILED", "CANCELED"],
            NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
          ),
      },
      notificationScheduler,
      recurrence,
    );
    const targets = makeNotificationGuildTargets(
      database,
      {
        selectable: guildSync.getSelectableGuildChannels,
      },
      {
        cancel: notificationScheduler.cancel,
      },
    );
    return {
      scheduler: notificationScheduler,
      matching,
      store,
      targets,
      dispatch,
      delivery,
      rebuild,
      layer: notificationDataLayer({
        guildTargets: targets,
        jobOperations: makeNotificationJobOperations(database, {
          cancel: notificationScheduler.cancel,
        }),
        rules: makeNotificationRuleOperations(database, {
          ensureGuildPermissions: (guildId) =>
            guildSync.getGuildDiscordSyncStatus(guildId).pipe(
              Effect.flatMap((syncState) =>
                syncState.hasRequiredPermissions
                  ? Effect.succeed(syncState)
                  : Effect.fail(
                      new ConflictException({
                        message:
                          NotificationError.DISCORD_BOT_MISSING_REQUIRED_PERMISSIONS,
                        missingPermissions: syncState.missingPermissions,
                        syncState,
                      }),
                    ),
              ),
            ),
          rebuildJobs: rebuild.rebuildRule,
          cancelJobs: notificationScheduler.cancel,
          buildTestPayload: (options) =>
            testContent({
              ...options,
              notificationRule: {
                ...options.notificationRule,
                filters: options.notificationRule.filters as JsonValue,
              },
            }),
          createTestJob: notificationScheduler.create,
          enqueueJob: notificationScheduler.enqueue,
        }),
        userTargets: makeNotificationUserTargets(database, {
          cancel: notificationScheduler.cancel,
          create: notificationScheduler.create,
          enqueue: notificationScheduler.enqueue,
        }),
        watchedItems: makeNotificationWatchedItems(
          database,
          {
            list: (discordId, userId) =>
              userGuilds.getUserGuilds({ userId, discordId }).pipe(
                Effect.map(
                  (guilds) =>
                    guilds as ReadonlyArray<{
                      readonly id: string;
                      readonly vanityUrl: string | null;
                    }>,
                ),
              ),
          },
          {
            cancel: notificationScheduler.cancel,
          },
        ),
      }),
    };
  }),
);

export const NativeNotificationsData = Layer.unwrap(
  Effect.map(NativeNotificationsServices, ({ layer }) => layer),
);
