import { randomUUID } from "node:crypto";
import { Context, Effect, Layer, Redacted } from "effect";
import {
  RabbitMessaging,
  type FailurePolicy,
  type RabbitDelivery,
} from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import type { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Permission } from "@lootlog/schema/permissions";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordGuildChannelUpsertedEvent,
  DiscordGuildChannelsSyncFailedEvent,
  DiscordGuildChannelsSyncedEvent,
  DiscordGuildSyncStateUpdatedEvent,
  DiscordNotificationDeliveryResultEvent,
  LootCreatedNotificationEventV2,
} from "@lootlog/schema/notifications";
import { Queue, Worker } from "bullmq";
import type { Logger } from "winston";
import { AuthService } from "#src/auth/auth.service";
import { ChannelsRepository } from "#src/channels/channels.repository";
import { ChannelsService } from "#src/channels/channels.service";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { DiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "#src/discord/discord-rest-client.factory";
import { DiscordService } from "#src/discord/discord.service";
import { DiscordBotClientService } from "#src/discord-bot-client/discord-bot-client.service";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { DiscordUserGuildsClient } from "#src/discord/discord-user-guilds.client";
import { Queue as ApiQueue } from "#src/enum/queue.enum";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/constants/event-hero-kill-queue.constant";
import { RESPAWN_WINDOW_QUEUE } from "#src/events/constants/respawn-queue.constant";
import { EventsAssignmentController } from "#src/events/events-assignment.controller";
import { EventsCatalogController } from "#src/events/events-catalog.controller";
import { EventsMonitoringController } from "#src/events/events-monitoring.controller";
import { EventsPinsController } from "#src/events/events-pins.controller";
import { EventsRankingController } from "#src/events/events-ranking.controller";
import { EventsService } from "#src/events/events.service";
import { EventHeroKillProcessor } from "#src/events/event-hero-kill.processor";
import { ActiveEventHeroRepository } from "#src/events/services/active-event-hero.repository";
import { EventAccessRepository } from "#src/events/services/event-access.repository";
import { EventAccessService } from "#src/events/services/event-access.service";
import { EventCatalogRepository } from "#src/events/services/event-catalog.repository";
import { EventCatalogService } from "#src/events/services/event-catalog.service";
import { EventCoordinationRepository } from "#src/events/services/event-coordination.repository";
import { EventCoordinationService } from "#src/events/services/event-coordination.service";
import { EventEmitterService } from "#src/events/services/event-emitter.service";
import { EventKillRepository } from "#src/events/services/event-kill.repository";
import { EventKillService } from "#src/events/services/event-kill.service";
import { EventPointsRepository } from "#src/events/services/event-points.repository";
import { EventPointsService } from "#src/events/services/event-points.service";
import { EventQueueDiagnosticsRepository } from "#src/events/services/event-queue-diagnostics.repository";
import { EventQueueDiagnosticsService } from "#src/events/services/event-queue-diagnostics.service";
import { EventReadCacheService } from "#src/events/services/event-read-cache.service";
import { EventRespawnRepository } from "#src/events/services/event-respawn.repository";
import { EventRespawnService } from "#src/events/services/event-respawn.service";
import { EventSummaryRepository } from "#src/events/services/event-summary.repository";
import { EventSummaryService } from "#src/events/services/event-summary.service";
import { EventTimerHooksService } from "#src/events/services/event-timer-hooks.service";
import { EventTrackingRepository } from "#src/events/services/event-tracking.repository";
import { EventTrackingService } from "#src/events/services/event-tracking.service";
import { EventWrappedRepository } from "#src/events/services/event-wrapped.repository";
import { EventWrappedService } from "#src/events/services/event-wrapped.service";
import { PinnedEventsRepository } from "#src/events/services/pinned-events.repository";
import { PinnedEventsService } from "#src/events/services/pinned-events.service";
import { DocsRepository } from "#src/docs/docs.repository";
import { DocsService } from "#src/docs/docs.service";
import { MapsService } from "#src/maps/maps.service";
import { GuildsRepository } from "#src/guilds/guilds.repository";
import { GuildsService } from "#src/guilds/guilds.service";
import type { CreateGuildDto } from "#src/guilds/dto/create-guild.dto";
import { GuildConfigurationService } from "#src/guilds/guild-configuration.service";
import { GuildAccessSummaryService } from "#src/guilds/guild-access-summary.service";
import { UserGuildAccessResolver } from "#src/guilds/user-guild-access-resolver.service";
import { ItemsService } from "#src/items/items.service";
import { KillsRepository } from "#src/kills/kills.repository";
import { KillsService } from "#src/kills/kills.service";
import { LootlogConfigService } from "#src/lootlog-config/lootlog-config.service";
import { LootAllocationRepository } from "#src/loots/loot-allocation.repository";
import { LootAllocationService } from "#src/loots/loot-allocation.service";
import { LootSubmissionAcceptanceRepository } from "#src/loots/loot-submission-acceptance.repository";
import { LootSubmissionAcceptanceService } from "#src/loots/loot-submission-acceptance.service";
import { LootsRepository } from "#src/loots/loots.repository";
import { LootsService } from "#src/loots/loots.service";
import { LootCommentService } from "#src/loots/services/loot-comment.service";
import { LootQueryRepository } from "#src/loots/services/loot-query.repository";
import { LootQueryService } from "#src/loots/services/loot-query.service";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { MembersRepository } from "#src/members/members.repository";
import type { MembersService } from "#src/members/members.service";
import { MemberBulkRefreshService } from "#src/members/member-bulk-refresh.service";
import { MemberBulkRefreshProcessor } from "#src/members/member-bulk-refresh.processor";
import { MemberDiscordAccessService } from "#src/members/member-discord-access.service";
import { MemberDiscordRefreshService } from "#src/members/member-discord-refresh.service";
import { MemberDiscordSyncService } from "#src/members/member-discord-sync.service";
import { MemberReadService } from "#src/members/member-read.service";
import { MemberRefreshJobEventsService } from "#src/members/member-refresh-job-events.service";
import { MemberRefreshJobRepository } from "#src/members/member-refresh-job.repository";
import { MemberRefreshJobReadService } from "#src/members/member-refresh-job-read.service";
import { MemberRefreshProcessor } from "#src/members/member-refresh.processor";
import { MemberRefreshSchedulerService } from "#src/members/member-refresh-scheduler.service";
import { MemberRemovalService } from "#src/members/member-removal.service";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/constants/member-refresh-queue.constant";
import { ChatService } from "#src/chat/chat.service";
import { MessagingService } from "#src/messaging/messaging.service";
import { NotificationRateLimiterService } from "#src/messaging/notification-rate-limiter.service";
import { NpcsService } from "#src/npcs/npcs.service";
import { PlayersService } from "#src/players/players.service";
import { ReadyRoomPublisher } from "#src/messaging/ready-room/ready-room-publisher";
import { ReadyRoomRedisRepository } from "#src/messaging/ready-room/ready-room-redis.repository";
import { ReadyRoomService } from "#src/messaging/ready-room/ready-room.service";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import { PublicGuildStatsCardService } from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { RolesRepository } from "#src/roles/roles.repository";
import { RolesService } from "#src/roles/roles.service";
import type { CreateRoleDto } from "#src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "#src/roles/dto/delete-role.dto";
import type { UpdateRoleDto } from "#src/roles/dto/update-role.dto";
import { ReservationEventsPublisher } from "#src/reservations/reservation-events.publisher";
import { ReservationSharingRepository } from "#src/reservations/reservation-sharing.repository";
import { ReservationSharingService } from "#src/reservations/reservation-sharing.service";
import { ReservationCatalogService } from "#src/reservations/reservation-catalog.service";
import { ReservationReadService } from "#src/reservations/reservation-read.service";
import { MyReservationsService } from "#src/reservations/my-reservations.service";
import { ReservationMutationsRepository } from "#src/reservations/reservation-mutations.repository";
import { ReservationMutationsService } from "#src/reservations/reservation-mutations.service";
import { ReservationReminderRepository } from "#src/reservations/reservation-reminder.repository";
import { ReservationReminderService } from "#src/reservations/reservation-reminder.service";
import { ReservationsRepository } from "#src/reservations/reservations.repository";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { NotificationJobSchedulerService } from "#src/notifications/notification-job-scheduler.service";
import { NotificationContentService } from "#src/notifications/notification-content.service";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { NotificationJobsRepository } from "#src/notifications/notification-jobs.repository";
import { NotificationMatchingService } from "#src/notifications/notification-matching.service";
import { NotificationRuleService } from "#src/notifications/notification-rule.service";
import { NotificationTargetService } from "#src/notifications/notification-target.service";
import { NotificationsDispatchProcessor } from "#src/notifications/notifications-dispatch.processor";
import { NotificationsEventsHandler } from "#src/notifications/notifications-events.handler";
import { NotificationsGuildController } from "#src/notifications/notifications-guild.controller";
import { NotificationsRepository } from "#src/notifications/notifications.repository";
import { NotificationsUserController } from "#src/notifications/notifications-user.controller";
import { WatchedItemService } from "#src/notifications/watched-item.service";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
import { TimersRepository } from "#src/timers/timers.repository";
import { TimersService } from "#src/timers/timers.service";
import { UserLootlogConfigRepository } from "#src/user-lootlog-config/user-lootlog-config.repository";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import { UsersRepository } from "#src/users/users.repository";
import { UsersService } from "#src/users/users.service";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { MemberContextRepository } from "#src/shared/permissions/member-context.repository";
import { MemberContextService } from "#src/shared/permissions/member-context.service";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { DocsData } from "../handlers/docs/docs.handlers.js";
import { InternalGuildsData } from "../handlers/internal/internal.handlers.js";
import { MessagingData } from "../handlers/messaging/messaging.handlers.js";
import { NotificationsData } from "../handlers/notifications/notifications.handlers.js";
import {
  MembersData,
  MemberReadData,
  MemberRefreshJobData,
} from "../handlers/members/members.handlers.js";
import { ReadyRoomData } from "../handlers/party-ready-room/party-ready-room.handlers.js";
import {
  ReservationSharingData,
  ReservationReadData,
  ReservationsRolesData,
  MyReservationsData,
  RolesData,
} from "../handlers/reservations-roles/reservations-roles.handlers.js";
import { PublicSystemData } from "../handlers/public-system/public-system.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";
import { UserLootlogConfigData } from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import { ChatData } from "../handlers/chat/chat.handlers.js";
import { EventsData } from "../handlers/events/events.handlers.js";
import { legacyKillsLootsDataLayer } from "../handlers/kills-loots/kills-loots.legacy-layer.js";
import { TimersData } from "../handlers/timers/timers.handlers.js";
import {
  GuildConfigurationData,
  UsersGuildsData,
} from "../handlers/users-guilds/users-guilds.handlers.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import { createControllerDispatcher } from "./legacy-controller-dispatcher.js";
import { OrganizationContextLookup } from "./organization-context.js";

const makeScopedCompatibilityLayer = <I, S>(
  service: import("effect").Context.Key<I, S>,
  make: (runtime: DrizzleDatabaseRuntime) => S,
) =>
  Layer.effect(
    service,
    Effect.acquireRelease(
      Effect.sync(() => {
        const runtime = new DrizzleDatabaseRuntime();
        return { runtime, service: make(runtime) };
      }),
      ({ runtime }) => Effect.promise(() => runtime.onApplicationShutdown()),
    ).pipe(Effect.map(({ service: value }) => value)),
  );

const NativeSettingsData = makeScopedCompatibilityLayer(
  SettingsData,
  (runtime) => {
    const documents = new SettingsDocumentsService(
      new SettingsDocumentsRepository(runtime),
    );
    return SettingsData.makeServices({
      documents,
      timer: new TimerSettingsService(documents),
      sound: new SoundSettingsService(documents),
    });
  },
);

const NativeDocsData = makeScopedCompatibilityLayer(DocsData, (runtime) =>
  DocsData.makeLegacy(new DocsService(new DocsRepository(runtime))),
);

const NativePublicSystemData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    return makeScopedCompatibilityLayer(PublicSystemData, (runtime) =>
      PublicSystemData.makeServices({
        maps: new MapsService(redis, config.mapsApiUrl),
        statsCard: new PublicGuildStatsCardService(
          new PublicGuildStatsCardRepository(runtime),
          redis,
          config.environment,
        ),
        local: config.environment === "local",
      }),
    );
  }),
);

const NativeInternalGuildsData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    makeScopedCompatibilityLayer(InternalGuildsData, (runtime) =>
      InternalGuildsData.makeRepositories({
        guilds: new GuildsRepository(runtime),
        members: new MembersRepository(runtime),
        redis,
      }),
    ),
  ),
);

const nativeLogger = {
  log: (entry: unknown) =>
    Effect.runSync(
      Effect.log(typeof entry === "string" ? entry : JSON.stringify(entry)),
    ),
  warn: (entry: unknown) =>
    Effect.runSync(
      Effect.logWarning(
        typeof entry === "string" ? entry : JSON.stringify(entry),
      ),
    ),
} as Logger;

const makeAmqpAdapter = (rabbit: RabbitMessaging["Service"]) =>
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
  }) as unknown as AmqpConnection;

const makeReadyRoomService = (
  redis: ApiRedis["Service"],
  amqp: AmqpConnection,
) =>
  new ReadyRoomService(
    new ReadyRoomRedisRepository(redis),
    {} as ChatService,
    Date.now,
    randomUUID,
    new ReadyRoomPublisher(amqp, nativeLogger),
    randomUUID,
  );

const makeGuildPermissionsFacade = (runtime: DrizzleDatabaseRuntime) => {
  const guildsRepository = new GuildsRepository(runtime);
  const membersRepository = new MembersRepository(runtime);
  return {
    getMultipleGuildsPermissions: async (
      discordId: string,
      guildIds: string[],
    ) => {
      const [guilds, members] = await Promise.all([
        guildsRepository.findByIds(guildIds, true),
        membersRepository.findMembersByUserGuildIds(discordId, guildIds, true),
      ]);
      const memberByGuild = new Map(
        members.map((member) => [member.guildId, member]),
      );
      const allPermissions = Object.values(Permission);
      return guilds.map((guild) => {
        const member = memberByGuild.get(guild.id);
        return {
          guild,
          permissions:
            guild.ownerId === discordId
              ? allPermissions
              : (member?.roles.flatMap(({ permissions }) => permissions) ?? []),
          roles: member?.roles ?? [],
        };
      });
    },
  };
};

const NativeMessagingData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const amqp = makeAmqpAdapter(rabbit);

    return makeScopedCompatibilityLayer(MessagingData, (runtime) => {
      const guildsRepository = new GuildsRepository(runtime);
      const guilds = {
        getGuildsForRequiredPermissions: (
          discordId: string,
          permissions: Parameters<GuildsRepository["findForPermissions"]>[1],
        ) => guildsRepository.findForPermissions(discordId, permissions),
      };
      const readyRoom = makeReadyRoomService(redis, amqp);
      const service = new MessagingService(
        nativeLogger,
        amqp,
        guilds as never,
        redis,
        readyRoom,
        new NotificationRateLimiterService(nativeLogger, redis),
      );
      return MessagingData.makeService(service);
    });
  }),
);

const NativeReadyRoomData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const readyRoom = makeReadyRoomService(redis, makeAmqpAdapter(rabbit));
    return makeScopedCompatibilityLayer(ReadyRoomData, (runtime) => {
      const guilds = new GuildsRepository(runtime);
      return ReadyRoomData.makeServices(readyRoom, {
        getGuildsForRequiredPermissions: (discordId, permissions) =>
          guilds.findForPermissions(discordId, permissions),
      });
    });
  }),
);

const NativeChatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const amqp = makeAmqpAdapter(rabbit);
    return makeScopedCompatibilityLayer(ChatData, (runtime) =>
      ChatData.makeService(
        new ChatService(
          amqp,
          redis,
          makeGuildPermissionsFacade(runtime) as never,
          nativeLogger,
        ),
      ),
    );
  }),
);

const NativeUserLootlogConfigData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    makeScopedCompatibilityLayer(UserLootlogConfigData, (runtime) => {
      const guilds = new GuildsRepository(runtime);
      const service = new UserLootlogConfigService(
        new UserLootlogConfigRepository(runtime),
        {
          getGuildsForRequiredPermissions: (discordId, permissions) =>
            guilds.findForPermissions(discordId, permissions),
        } as never,
        redis,
      );
      return UserLootlogConfigData.makeService(service);
    }),
  ),
);

const NativeRolesData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    makeScopedCompatibilityLayer(RolesData, (runtime) =>
      RolesData.makeService(
        new RolesService(new RolesRepository(runtime), nativeLogger, redis),
      ),
    ),
  ),
);

const NativeGuildConfigurationData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    makeScopedCompatibilityLayer(GuildConfigurationData, (runtime) =>
      GuildConfigurationData.makeService(
        new GuildConfigurationService(
          new GuildsRepository(runtime),
          redis,
          nativeLogger,
        ),
      ),
    ),
  ),
);

const NativeReservationSharingData = Layer.unwrap(
  Effect.map(RabbitMessaging, (rabbit) =>
    makeScopedCompatibilityLayer(ReservationSharingData, (runtime) => {
      const guilds = new GuildsRepository(runtime);
      const amqp = makeAmqpAdapter(rabbit);
      return ReservationSharingData.makeService(
        new ReservationSharingService(
          new ReservationSharingRepository(runtime),
          {
            getGuildsForRequiredPermissions: (discordId, permissions) =>
              guilds.findForPermissions(discordId, permissions),
          },
          new ReservationEventsPublisher(amqp),
        ),
      );
    }),
  ),
);

const NativeReservationReadData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    return makeScopedCompatibilityLayer(ReservationReadData, (runtime) => {
      const guilds = new GuildsRepository(runtime);
      const sharing = new ReservationSharingService(
        new ReservationSharingRepository(runtime),
        {
          getGuildsForRequiredPermissions: (discordId, permissions) =>
            guilds.findForPermissions(discordId, permissions),
        },
        new ReservationEventsPublisher(makeAmqpAdapter(rabbit)),
      );
      return ReservationReadData.makeService(
        new ReservationReadService(
          new ReservationsRepository(runtime),
          new ReservationCatalogService(redis),
          sharing,
        ),
      );
    });
  }),
);

interface NativeMemberServicesValue {
  readonly runtime: DrizzleDatabaseRuntime;
  readonly access: MemberDiscordAccessService;
  readonly removal: MemberRemovalService;
  readonly bulkRefresh: MemberBulkRefreshService;
  readonly read: MemberReadService;
  readonly refreshJobRead: MemberRefreshJobReadService;
  readonly refresh: MemberDiscordRefreshService;
  readonly discord: DiscordService;
  readonly scheduler: MemberRefreshSchedulerService;
  readonly diagnostics: DiscordSyncDiagnosticsService;
  readonly sync: MemberDiscordSyncService;
}

class NativeMemberServices extends Context.Service<
  NativeMemberServices,
  NativeMemberServicesValue
>()("@lootlog/api/http-api/NativeMemberServices") {}

const NativeMemberServicesLive = Layer.effect(
  NativeMemberServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const queueConnection = {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: Redacted.value(config.redis.password),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    return yield* Effect.acquireRelease(
      Effect.sync(() => {
        const runtime = new DrizzleDatabaseRuntime();
        const memberRefreshQueue = new Queue(MEMBER_REFRESH_QUEUE, {
          connection: queueConnection,
          prefix: "{bull}",
        });
        const memberBulkRefreshQueue = new Queue(MEMBER_BULK_REFRESH_QUEUE, {
          connection: queueConnection,
          prefix: "{bull}",
        });
        const repository = new MembersRepository(runtime);
        const refreshJobs = new MemberRefreshJobRepository(runtime);
        const diagnostics = new DiscordSyncDiagnosticsService(
          nativeLogger,
          redis,
        );
        const rateLimiter = new DiscordRateLimiterService(nativeLogger, redis);
        const redlock = new RedlockService(redis);
        const restClientFactory = new DiscordRestClientFactory(
          new AuthService(nativeLogger, redis),
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
        userGuildsClient.onModuleInit();
        guildMemberClient.onModuleInit();
        const discord = new DiscordService(userGuildsClient, guildMemberClient);
        const removal = new MemberRemovalService(
          nativeLogger,
          repository,
          discord,
          makeAmqpAdapter(rabbit),
          redis,
        );
        const memberDiscordSync = new MemberDiscordSyncService(
          nativeLogger,
          repository,
          discord,
          rateLimiter,
          makeAmqpAdapter(rabbit),
          redis,
          removal,
        );
        const scheduler = new MemberRefreshSchedulerService(
          nativeLogger,
          memberRefreshQueue,
          rateLimiter,
          redis,
          diagnostics,
        );
        const memberDiscordRefresh = new MemberDiscordRefreshService(
          rateLimiter,
          scheduler,
          diagnostics,
          memberDiscordSync,
        );
        const memberAccess = new MemberDiscordAccessService(
          repository,
          memberDiscordRefresh,
          diagnostics,
        );
        const memberRead = new MemberReadService(repository, redis);
        const refreshJobEvents = new MemberRefreshJobEventsService(
          nativeLogger,
          refreshJobs,
          makeAmqpAdapter(rabbit),
        );
        const bulkRefresh = new MemberBulkRefreshService(
          nativeLogger,
          memberBulkRefreshQueue,
          refreshJobs,
          memberRead,
          refreshJobEvents,
        );

        return {
          runtime,
          queues: [memberRefreshQueue, memberBulkRefreshQueue] as const,
          access: memberAccess,
          removal,
          bulkRefresh,
          read: memberRead,
          refreshJobRead: new MemberRefreshJobReadService(refreshJobs),
          refresh: memberDiscordRefresh,
          discord,
          scheduler,
          diagnostics,
          sync: memberDiscordSync,
        };
      }),
      ({ runtime, queues }) =>
        Effect.promise(async () => {
          await Promise.all(queues.map((queue) => queue.close()));
          await runtime.onApplicationShutdown();
        }),
    ).pipe(
      Effect.map(
        ({ queues: _queues, ...services }): NativeMemberServicesValue =>
          services,
      ),
    );
  }),
);

const NativeMembersData = Layer.effect(
  MembersData,
  Effect.map(NativeMemberServices, ({ access, removal, bulkRefresh }) =>
    MembersData.makeServices({ access, removal, bulkRefresh }),
  ),
);

const NativeMemberReadData = Layer.effect(
  MemberReadData,
  Effect.map(NativeMemberServices, ({ read }) =>
    MemberReadData.makeService(read),
  ),
);

const NativeMemberRefreshJobData = Layer.effect(
  MemberRefreshJobData,
  Effect.map(NativeMemberServices, ({ refreshJobRead }) =>
    MemberRefreshJobData.makeService(refreshJobRead),
  ),
);

const NativeOrganizationContextLookup = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const { runtime, access } = yield* NativeMemberServices;
    return OrganizationContextLookup.layerLegacy(
      new MemberContextService(
        nativeLogger,
        new MemberContextRepository(runtime),
        redis,
        access,
      ),
    );
  }),
);

class NativeGuildAccessSummary extends Context.Service<
  NativeGuildAccessSummary,
  GuildAccessSummaryService
>()("@lootlog/api/http-api/NativeGuildAccessSummary") {}

const NativeGuildAccessSummaryLive = Layer.effect(
  NativeGuildAccessSummary,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const { runtime, access, refresh } = yield* NativeMemberServices;
    return new GuildAccessSummaryService(
      nativeLogger,
      new GuildsRepository(runtime),
      new MembersRepository(runtime),
      access,
      refresh,
      redis,
    );
  }),
);

const NativeMyReservationsData = Layer.effect(
  MyReservationsData,
  Effect.gen(function* () {
    const { runtime } = yield* NativeMemberServices;
    const guildAccess = yield* NativeGuildAccessSummary;
    return MyReservationsData.makeService(
      new MyReservationsService(
        new ReservationsRepository(runtime),
        guildAccess,
      ),
    );
  }),
);

interface NativeUsersGuildsServicesValue {
  readonly data: UsersGuildsData["Service"];
  readonly guilds: GuildsService;
  readonly channels: ChannelsService;
}

class NativeUsersGuildsServices extends Context.Service<
  NativeUsersGuildsServices,
  NativeUsersGuildsServicesValue
>()("@lootlog/api/http-api/NativeUsersGuildsServices") {}

const NativeUsersGuildsServicesLive = Layer.effect(
  NativeUsersGuildsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const { runtime, access, removal, refresh, discord } =
      yield* NativeMemberServices;
    const amqp = makeAmqpAdapter(rabbit);
    const members = {
      getGuildMemberById: access.getGuildMemberById.bind(access),
      refreshMember: access.refreshMember.bind(access),
      isMemberSoftStale: access.isMemberSoftStale.bind(access),
      getMemberSoftStaleThreshold:
        access.getMemberSoftStaleThreshold.bind(access),
      refreshGuildMemberWithinBudget:
        refresh.refreshGuildMemberWithinBudget.bind(refresh),
      queueMemberRefresh: refresh.queueMemberRefresh.bind(refresh),
      deactivateMember: removal.deactivateMember.bind(removal),
      deactivateMembersMissingFromDiscordGuilds:
        removal.deactivateMembersMissingFromDiscordGuilds.bind(removal),
      deleteMembersByGuildId: removal.deleteMembersByGuildId.bind(removal),
      notifyMembersRemoved: removal.notifyMembersRemoved.bind(removal),
      notifyMemberRemoved: removal.notifyMemberRemoved.bind(removal),
    } as unknown as MembersService;
    const guildsRepository = new GuildsRepository(runtime);
    const roles = new RolesService(
      new RolesRepository(runtime),
      nativeLogger,
      redis,
    );
    const channels = new ChannelsService(
      new ChannelsRepository(runtime),
      new DiscordBotClientService(),
      amqp,
      nativeLogger,
    );
    const guilds = new GuildsService(
      nativeLogger,
      members,
      channels,
      roles,
      guildsRepository,
      new MembersRepository(runtime),
      discord,
      redis,
      amqp,
      new UserGuildAccessResolver(
        nativeLogger,
        guildsRepository,
        discord,
        members,
      ),
    );
    const users = new UsersService(
      nativeLogger,
      new UsersRepository(runtime),
      new AuthService(nativeLogger, redis),
      members,
      redis,
      guilds,
    );
    return {
      data: UsersGuildsData.makeService(users, guilds),
      guilds,
      channels,
    };
  }),
);

const NativeUsersGuildsData = Layer.effect(
  UsersGuildsData,
  Effect.map(NativeUsersGuildsServices, ({ data }) => data),
);

const NativeReservationMutationsData = Layer.effect(
  ReservationsRolesData,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const { runtime } = yield* NativeMemberServices;
    const guildAccess = yield* NativeGuildAccessSummary;
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
    const events = new ReservationEventsPublisher(makeAmqpAdapter(rabbit));
    const guilds = new GuildsRepository(runtime);
    const sharing = new ReservationSharingService(
      new ReservationSharingRepository(runtime),
      {
        getGuildsForRequiredPermissions: (discordId, permissions) =>
          guilds.findForPermissions(discordId, permissions),
      },
      events,
    );
    const notificationScheduler = new NotificationJobSchedulerService(
      new NotificationJobsRepository(runtime),
      notificationsQueue,
    );
    return ReservationsRolesData.makeService(
      new ReservationMutationsService(
        new ReservationMutationsRepository(runtime),
        guildAccess,
        new ReservationCatalogService(redis),
        sharing,
        new ReservationReminderService(
          new ReservationReminderRepository(runtime),
          notificationScheduler,
        ),
        events,
      ),
    );
  }),
);

class NativeTimerService extends Context.Service<
  NativeTimerService,
  TimersService
>()("@lootlog/api/http-api/NativeTimerService") {}

const NativeTimerServiceLive = Layer.effect(
  NativeTimerService,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const { runtime } = yield* NativeMemberServices;
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
    const guildsRepository = new GuildsRepository(runtime);
    const guilds = {
      getGuildsForRequiredPermissions: (
        discordId: string,
        permissions: Permission[],
      ) => guildsRepository.findForPermissions(discordId, permissions),
      getMultipleGuildsPermissions:
        makeGuildPermissionsFacade(runtime).getMultipleGuildsPermissions,
    } as unknown as GuildsService;
    const userLootlogConfig = new UserLootlogConfigService(
      new UserLootlogConfigRepository(runtime),
      guilds,
      redis,
    );
    const service = new TimersService(
      nativeLogger,
      new TimersRepository(runtime),
      makeAmqpAdapter(rabbit),
      guilds,
      userLootlogConfig,
      redis,
      new EventTimerHooksService(
        new ActiveEventHeroRepository(runtime),
        eventHeroKillQueue,
      ),
      new RedlockService(redis),
    );
    service.onModuleInit();
    return service;
  }),
);

const NativeTimersData = Layer.effect(
  TimersData,
  Effect.map(NativeTimerService, TimersData.makeService),
);

interface NativeKillsLootsServicesValue {
  readonly layer: ReturnType<typeof legacyKillsLootsDataLayer>;
  readonly loots: LootsService;
}

class NativeKillsLootsServices extends Context.Service<
  NativeKillsLootsServices,
  NativeKillsLootsServicesValue
>()("@lootlog/api/http-api/NativeKillsLootsServices") {}

const NativeKillsLootsServicesLive = Layer.effect(
  NativeKillsLootsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const { runtime } = yield* NativeMemberServices;
    const amqp = makeAmqpAdapter(rabbit);
    const guildsRepository = new GuildsRepository(runtime);
    const guilds = {
      getGuildsForRequiredPermissions: (
        discordId: string,
        permissions: Permission[],
      ) => guildsRepository.findForPermissions(discordId, permissions),
    } as unknown as GuildsService;
    const userLootlogConfig = new UserLootlogConfigService(
      new UserLootlogConfigRepository(runtime),
      guilds,
      redis,
    );
    const lootsRepository = new LootsRepository(runtime);
    const lootStats = new LootStatsService(lootsRepository, redis);
    const allocation = new LootAllocationService(
      amqp,
      new LootAllocationRepository(runtime),
      redis,
      nativeLogger,
    );
    const acceptance = new LootSubmissionAcceptanceService(
      allocation,
      amqp,
      new PlayersService(amqp),
      new NpcsService(amqp),
      new ItemsService(amqp),
      guilds,
      new LootSubmissionAcceptanceRepository(runtime),
      new LootlogConfigService(runtime),
      userLootlogConfig,
      lootStats,
      redis,
      nativeLogger,
      new RedlockService(redis),
    );
    acceptance.onModuleInit();
    const loots = new LootsService(
      lootsRepository,
      new LootQueryService(new LootQueryRepository(runtime)),
      new LootCommentService(lootsRepository),
      lootStats,
      redis,
      nativeLogger,
    );
    return {
      loots,
      layer: legacyKillsLootsDataLayer({
        kills: new KillsService(
          nativeLogger,
          new KillsRepository(runtime),
          redis,
          userLootlogConfig,
          guilds,
        ),
        loots,
        lootStats,
        lootSubmissionAcceptance: acceptance,
        lootAllocation: allocation,
      }),
    };
  }),
);

const NativeKillsLootsData = Layer.unwrap(
  Effect.map(NativeKillsLootsServices, ({ layer }) => layer),
);

interface NativeEventsServicesValue {
  readonly layer: ReturnType<typeof EventsData.layerLegacy>;
  readonly events: EventsService;
}

class NativeEventsServices extends Context.Service<
  NativeEventsServices,
  NativeEventsServicesValue
>()("@lootlog/api/http-api/NativeEventsServices") {}

const NativeEventsServicesLive = Layer.effect(
  NativeEventsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const { runtime } = yield* NativeMemberServices;
    const timers = yield* NativeTimerService;
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
        heroKill: new Queue(EVENT_HERO_KILL_QUEUE, queueOptions),
      })),
      ({ respawn, heroKill }) =>
        Effect.promise(() => Promise.all([respawn.close(), heroKill.close()])),
    );
    const amqp = makeAmqpAdapter(rabbit);
    const readCache = new EventReadCacheService(redis);
    const emitter = new EventEmitterService(amqp);
    const summary = new EventSummaryService(
      new EventSummaryRepository(runtime),
    );
    const tracking = new EventTrackingService(
      new EventTrackingRepository(runtime),
      emitter,
      readCache,
      amqp,
      redis,
      new RedlockService(redis),
      timers,
    );
    tracking.onModuleInit();
    const points = new EventPointsService(
      new EventPointsRepository(runtime),
      emitter,
      readCache,
    );
    const kill = new EventKillService(
      new EventKillRepository(runtime),
      new ActiveEventHeroRepository(runtime),
      redis,
      emitter,
      readCache,
      points,
      tracking,
      summary,
      timers,
      queues.respawn,
    );
    const events = new EventsService(
      new EventCatalogService(
        new EventCatalogRepository(runtime),
        redis,
        readCache,
        points,
        tracking,
        queues.respawn,
      ),
      new EventAccessService(new EventAccessRepository(runtime)),
      new EventQueueDiagnosticsService(
        new EventQueueDiagnosticsRepository(runtime),
        queues.respawn,
      ),
      points,
      tracking,
      kill,
      new EventRespawnService(
        new EventRespawnRepository(runtime),
        queues.respawn,
        emitter,
        kill,
        readCache,
        tracking,
        summary,
        timers,
      ),
      new EventWrappedService(
        new EventWrappedRepository(runtime),
        redis,
        loots,
      ),
      new EventCoordinationService(
        new EventCoordinationRepository(runtime),
        timers,
      ),
      queues.heroKill,
    );
    const controllers = new Map<unknown, unknown>([
      [EventsAssignmentController, new EventsAssignmentController(events)],
      [EventsCatalogController, new EventsCatalogController(events)],
      [EventsMonitoringController, new EventsMonitoringController(events)],
      [
        EventsPinsController,
        new EventsPinsController(
          new PinnedEventsService(new PinnedEventsRepository(runtime)),
        ),
      ],
      [EventsRankingController, new EventsRankingController(events)],
    ]);
    const dispatch = createControllerDispatcher({
      get: (token: unknown) => controllers.get(token),
    } as never);
    return { events, layer: EventsData.layerLegacy(dispatch) };
  }),
);

const NativeEventsData = Layer.unwrap(
  Effect.map(NativeEventsServices, ({ layer }) => layer),
);

interface NativeNotificationsServicesValue {
  readonly layer: ReturnType<typeof NotificationsData.layerLegacy>;
  readonly jobs: NotificationJobService;
  readonly matching: NotificationMatchingService;
  readonly repository: NotificationsRepository;
  readonly targets: NotificationTargetService;
}

class NativeNotificationsServices extends Context.Service<
  NativeNotificationsServices,
  NativeNotificationsServicesValue
>()("@lootlog/api/http-api/NativeNotificationsServices") {}

const NativeNotificationsServicesLive = Layer.effect(
  NativeNotificationsServices,
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const { runtime } = yield* NativeMemberServices;
    const { guilds, channels } = yield* NativeUsersGuildsServices;
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
    const repository = new NotificationsRepository(runtime);
    const matching = new NotificationMatchingService(repository);
    const content = new NotificationContentService(repository, matching);
    const jobsHolder: { current?: NotificationJobService } = {};
    const getJobs = () => {
      if (!jobsHolder.current) {
        throw new Error("Notification jobs service is not initialized");
      }
      return jobsHolder.current;
    };
    const jobDelegate = {
      cancelPendingJobs: (
        filters: Parameters<NotificationJobService["cancelPendingJobs"]>[0],
      ) => getJobs().cancelPendingJobs(filters),
      createNotificationJob: (
        options: Parameters<NotificationJobService["createNotificationJob"]>[0],
      ) => getJobs().createNotificationJob(options),
      enqueueNotificationJob: (jobId: string, delay: number) =>
        getJobs().enqueueNotificationJob(jobId, delay),
    } as NotificationJobService;
    const targets = new NotificationTargetService(
      repository,
      channels,
      jobDelegate,
    );
    const jobs = new NotificationJobService(
      new NotificationJobsRepository(runtime),
      guilds,
      content,
      matching,
      makeAmqpAdapter(rabbit),
      queue,
    );
    jobsHolder.current = jobs;
    const rules = new NotificationRuleService(
      repository,
      guilds,
      targets,
      jobs,
      content,
    );
    const watchedItems = new WatchedItemService(
      repository,
      guilds,
      targets,
      jobs,
      matching,
    );
    const controllers = new Map<unknown, unknown>([
      [
        NotificationsGuildController,
        new NotificationsGuildController(targets, rules, jobs, channels),
      ],
      [
        NotificationsUserController,
        new NotificationsUserController(targets, rules, jobs, watchedItems),
      ],
    ]);
    const dispatch = createControllerDispatcher({
      get: (token: unknown) => controllers.get(token),
    } as never);
    return {
      jobs,
      matching,
      repository,
      targets,
      layer: NotificationsData.layerLegacy(dispatch),
    };
  }),
);

const NativeNotificationsData = Layer.unwrap(
  Effect.map(NativeNotificationsServices, ({ layer }) => layer),
);

interface PresenceCoveragePayload {
  readonly guildId: string;
  readonly mapName: string;
  readonly discordId: string;
  readonly hasPlayer: boolean;
  readonly isAfk?: boolean;
}

interface TimerUpdatedPayload {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly timerKey: string;
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
  readonly npc?: { readonly name?: string } | null;
}

interface TimerDeletedPayload {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
  readonly npcId?: number;
}

const rabbitRetryPolicy = (
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
): FailurePolicy => ({
  strategy: "retry",
  maxRetries: 3,
  retryRoutingKey,
  deadLetterRoutingKey,
});

const decodeRabbitJson = <Payload>(delivery: RabbitDelivery): Payload =>
  JSON.parse(new TextDecoder().decode(delivery.content)) as Payload;

export const NativeRabbitConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const redis = yield* ApiRedis;
    const { runtime } = yield* NativeMemberServices;
    const { guilds, channels } = yield* NativeUsersGuildsServices;
    const { events } = yield* NativeEventsServices;
    const { jobs, matching, repository, targets } =
      yield* NativeNotificationsServices;
    const roles = new RolesService(
      new RolesRepository(runtime),
      nativeLogger,
      redis,
    );
    const notificationEvents = new NotificationsEventsHandler(
      repository,
      jobs,
      matching,
      targets,
      guilds,
    );

    const consume = <Payload>(
      queue: string,
      handler: (
        payload: Payload,
        delivery: RabbitDelivery,
      ) => Promise<void> | void,
      failurePolicy: FailurePolicy = { strategy: "nack" },
    ) =>
      Effect.acquireRelease(
        rabbit.consume({ queue, failurePolicy }, (delivery) =>
          Effect.tryPromise({
            try: () =>
              Promise.resolve(
                handler(decodeRabbitJson<Payload>(delivery), delivery),
              ),
            catch: (cause) => cause,
          }),
        ),
        ({ cancel }) => cancel.pipe(Effect.ignore),
      );

    const retry = {
      guildCreate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_CREATE_RETRY,
        RabbitRoutingKey.GUILDS_CREATE_DLQ,
      ),
      guildUpdate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_UPDATE_RETRY,
        RabbitRoutingKey.GUILDS_UPDATE_DLQ,
      ),
      guildDelete: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_DELETE_RETRY,
        RabbitRoutingKey.GUILDS_DELETE_DLQ,
      ),
      roleCreate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_CREATE_ROLE_RETRY,
        RabbitRoutingKey.GUILDS_CREATE_ROLE_DLQ,
      ),
      roleUpdate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_UPDATE_ROLE_RETRY,
        RabbitRoutingKey.GUILDS_UPDATE_ROLE_DLQ,
      ),
      roleDelete: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_DELETE_ROLE_RETRY,
        RabbitRoutingKey.GUILDS_DELETE_ROLE_DLQ,
      ),
    } as const;

    yield* consume<CreateGuildDto>(
      ApiQueue.GUILDS_CREATE,
      async (data) => guilds.createGuild(data),
      retry.guildCreate,
    );
    yield* consume<CreateGuildDto>(
      ApiQueue.GUILDS_UPDATE,
      async (data) => guilds.updateGuild(data),
      retry.guildUpdate,
    );
    yield* consume<CreateGuildDto>(
      ApiQueue.GUILDS_DELETE,
      async (data) => guilds.deleteGuild(data),
      retry.guildDelete,
    );
    yield* consume<CreateRoleDto>(
      ApiQueue.GUILDS_CREATE_ROLE,
      async (data) => roles.createOrUpdateRole(data),
      retry.roleCreate,
    );
    yield* consume<UpdateRoleDto>(
      ApiQueue.GUILDS_UPDATE_ROLE,
      async (data) => roles.createOrUpdateRole(data),
      retry.roleUpdate,
    );
    yield* consume<DeleteRoleDto>(
      ApiQueue.GUILDS_DELETE_ROLE,
      async (data) => roles.deleteRole(data),
      retry.roleDelete,
    );

    const dlqQueues = [
      ApiQueue.GUILDS_CREATE_DLQ,
      ApiQueue.GUILDS_UPDATE_DLQ,
      ApiQueue.GUILDS_DELETE_DLQ,
      ApiQueue.GUILDS_CREATE_ROLE_DLQ,
      ApiQueue.GUILDS_UPDATE_ROLE_DLQ,
      ApiQueue.GUILDS_DELETE_ROLE_DLQ,
    ] as const;
    for (const queue of dlqQueues) {
      yield* consume<Record<string, unknown>>(queue, (data, delivery) =>
        Effect.runSync(
          Effect.logError(
            "RabbitMQ DLQ message requires manual intervention",
          ).pipe(
            Effect.annotateLogs({
              queue,
              data,
              retryCount:
                delivery.properties.headers?.["x-lootlog-retry-count"],
            }),
          ),
        ),
      );
    }

    yield* consume<DiscordGuildChannelsSyncedEvent>(
      "backend-discord-guild-channels-synced",
      (data) => channels.handleGuildChannelsSynced(data),
    );
    yield* consume<DiscordGuildChannelUpsertedEvent>(
      "backend-discord-guild-channel-upserted",
      (data) => channels.handleGuildChannelUpserted(data),
    );
    yield* consume<DiscordGuildChannelDeletedEvent>(
      "backend-discord-guild-channel-deleted",
      (data) => channels.handleGuildChannelDeleted(data),
    );
    yield* consume<DiscordGuildChannelsSyncFailedEvent>(
      "backend-discord-guild-channels-sync-failed",
      (data) => channels.handleGuildChannelsSyncFailed(data),
    );
    yield* consume<DiscordGuildSyncStateUpdatedEvent>(
      "backend-discord-guild-sync-state-updated",
      (data) => channels.handleGuildSyncStateUpdated(data),
    );

    yield* consume<PresenceCoveragePayload>(
      ApiQueue.PRESENCE_COVERAGE_CHECK,
      async ({ guildId, mapName, discordId, hasPlayer, isAfk }) => {
        try {
          await events.handlePlayerPresenceChange(
            guildId,
            mapName,
            discordId,
            hasPlayer,
            isAfk ?? false,
          );
        } catch (error) {
          nativeLogger.log({
            level: "error",
            message: "Failed to handle player presence change",
            error: error instanceof Error ? error.message : error,
            guildId,
            mapName,
          });
        }
      },
    );

    yield* consume<TimerUpdatedPayload>(
      "backend-notifications-timer-updated",
      (data) => notificationEvents.handleTimerUpdated(data),
    );
    yield* consume<TimerDeletedPayload>(
      "backend-notifications-timer-deleted",
      (data) => notificationEvents.handleTimerDeleted(data),
    );
    yield* consume<LootCreatedNotificationEventV2>(
      "backend-notifications-loot-created",
      (data) => notificationEvents.handleLootCreated(data),
    );
    yield* consume<DiscordNotificationDeliveryResultEvent>(
      "backend-notifications-delivery-result",
      (data) => notificationEvents.handleDeliveryResult(data),
    );
    yield* consume<DiscordGuildChannelDeletedEvent>(
      "backend-notifications-discord-guild-channel-deleted",
      (data) => notificationEvents.handleDiscordGuildChannelDeleted(data),
    );
  }),
);

export const NativeBullWorkers = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const rabbit = yield* RabbitMessaging;
    const { runtime, access, scheduler, diagnostics, sync } =
      yield* NativeMemberServices;
    const { events } = yield* NativeEventsServices;
    const { jobs } = yield* NativeNotificationsServices;
    const members = {
      syncMemberFromDiscord: sync.syncMemberFromDiscord.bind(sync),
      refreshMember: access.refreshMember.bind(access),
    } as unknown as MembersService;
    const refreshJobs = new MemberRefreshJobRepository(runtime);
    const memberRefresh = new MemberRefreshProcessor(
      nativeLogger,
      members,
      scheduler,
      diagnostics,
    );
    const memberBulkRefresh = new MemberBulkRefreshProcessor(
      nativeLogger,
      members,
      refreshJobs,
      new MemberRefreshJobEventsService(
        nativeLogger,
        refreshJobs,
        makeAmqpAdapter(rabbit),
      ),
    );
    const eventHeroKill = new EventHeroKillProcessor(nativeLogger, events);
    const notifications = new NotificationsDispatchProcessor(
      jobs,
      nativeLogger,
    );
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: Redacted.value(config.redis.password),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const workers = [
          new Worker(
            MEMBER_REFRESH_QUEUE,
            (job) => memberRefresh.process(job),
            { connection, prefix: "{bull}", concurrency: 10 },
          ),
          new Worker(
            MEMBER_BULK_REFRESH_QUEUE,
            (job) => memberBulkRefresh.process(job),
            {
              connection,
              prefix: "{bull}",
              concurrency: 5,
              limiter: { max: 5, duration: 1000 },
            },
          ),
          new Worker(
            EVENT_HERO_KILL_QUEUE,
            (job) => eventHeroKill.process(job),
            { connection, prefix: "{bull}" },
          ),
          new Worker(
            NOTIFICATIONS_DISPATCH_QUEUE,
            (job) => notifications.process(job),
            { connection, prefix: "{bull}" },
          ),
        ];
        workers[2]?.on("failed", (job, error) => {
          if (job) eventHeroKill.onFailed(job, error);
        });
        return workers;
      }),
      (workers) =>
        Effect.promise(() =>
          Promise.all(workers.map((worker) => worker.close())),
        ),
    );
  }),
);

export const NativeApiDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  NativeSettingsData,
  NativeDocsData,
  NativePublicSystemData,
  NativeInternalGuildsData,
  NativeMessagingData,
  NativeReadyRoomData,
  NativeChatData,
  NativeUserLootlogConfigData,
  NativeRolesData,
  NativeGuildConfigurationData,
  NativeReservationSharingData,
  NativeReservationReadData,
  NativeMemberReadData,
  NativeMemberRefreshJobData,
  NativeMembersData,
  NativeOrganizationContextLookup,
  NativeMyReservationsData,
  NativeReservationMutationsData,
  NativeUsersGuildsData,
  NativeTimersData,
  NativeKillsLootsData,
  NativeEventsData,
  NativeNotificationsData,
).pipe(
  Layer.provide(NativeNotificationsServicesLive),
  Layer.provide(NativeEventsServicesLive),
  Layer.provide(NativeUsersGuildsServicesLive),
  Layer.provide(NativeKillsLootsServicesLive),
  Layer.provide(NativeTimerServiceLive),
  Layer.provide(NativeGuildAccessSummaryLive),
  Layer.provide(NativeMemberServicesLive),
  Layer.provide(ApiDatabaseLive),
);
