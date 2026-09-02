import { randomUUID } from "node:crypto";
import { Context, Effect, Layer, Redacted } from "effect";
import { RabbitMessaging } from "@lootlog/messaging";
import type { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Permission } from "@lootlog/schema/permissions";
import { Queue } from "bullmq";
import type { Logger } from "winston";
import { AuthService } from "#src/auth/auth.service";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { DiscordGuildMemberClient } from "#src/discord/discord-guild-member.client";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "#src/discord/discord-rest-client.factory";
import { DiscordService } from "#src/discord/discord.service";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { DiscordUserGuildsClient } from "#src/discord/discord-user-guilds.client";
import { DocsRepository } from "#src/docs/docs.repository";
import { DocsService } from "#src/docs/docs.service";
import { MapsService } from "#src/maps/maps.service";
import { GuildsRepository } from "#src/guilds/guilds.repository";
import { GuildConfigurationService } from "#src/guilds/guild-configuration.service";
import { MembersRepository } from "#src/members/members.repository";
import { MemberBulkRefreshService } from "#src/members/member-bulk-refresh.service";
import { MemberDiscordAccessService } from "#src/members/member-discord-access.service";
import { MemberDiscordRefreshService } from "#src/members/member-discord-refresh.service";
import { MemberDiscordSyncService } from "#src/members/member-discord-sync.service";
import { MemberReadService } from "#src/members/member-read.service";
import { MemberRefreshJobEventsService } from "#src/members/member-refresh-job-events.service";
import { MemberRefreshJobRepository } from "#src/members/member-refresh-job.repository";
import { MemberRefreshJobReadService } from "#src/members/member-refresh-job-read.service";
import { MemberRefreshSchedulerService } from "#src/members/member-refresh-scheduler.service";
import { MemberRemovalService } from "#src/members/member-removal.service";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/constants/member-refresh-queue.constant";
import { ChatService } from "#src/chat/chat.service";
import { MessagingService } from "#src/messaging/messaging.service";
import { NotificationRateLimiterService } from "#src/messaging/notification-rate-limiter.service";
import { ReadyRoomPublisher } from "#src/messaging/ready-room/ready-room-publisher";
import { ReadyRoomRedisRepository } from "#src/messaging/ready-room/ready-room-redis.repository";
import { ReadyRoomService } from "#src/messaging/ready-room/ready-room.service";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import { PublicGuildStatsCardService } from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { RolesRepository } from "#src/roles/roles.repository";
import { RolesService } from "#src/roles/roles.service";
import { ReservationEventsPublisher } from "#src/reservations/reservation-events.publisher";
import { ReservationSharingRepository } from "#src/reservations/reservation-sharing.repository";
import { ReservationSharingService } from "#src/reservations/reservation-sharing.service";
import { ReservationCatalogService } from "#src/reservations/reservation-catalog.service";
import { ReservationReadService } from "#src/reservations/reservation-read.service";
import { ReservationsRepository } from "#src/reservations/reservations.repository";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
import { UserLootlogConfigRepository } from "#src/user-lootlog-config/user-lootlog-config.repository";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { MemberContextRepository } from "#src/shared/permissions/member-context.repository";
import { MemberContextService } from "#src/shared/permissions/member-context.service";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { DocsData } from "../handlers/docs/docs.handlers.js";
import { InternalGuildsData } from "../handlers/internal/internal.handlers.js";
import { MessagingData } from "../handlers/messaging/messaging.handlers.js";
import {
  MembersData,
  MemberReadData,
  MemberRefreshJobData,
} from "../handlers/members/members.handlers.js";
import { ReadyRoomData } from "../handlers/party-ready-room/party-ready-room.handlers.js";
import {
  ReservationSharingData,
  ReservationReadData,
  RolesData,
} from "../handlers/reservations-roles/reservations-roles.handlers.js";
import { PublicSystemData } from "../handlers/public-system/public-system.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";
import { UserLootlogConfigData } from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import { ChatData } from "../handlers/chat/chat.handlers.js";
import { GuildConfigurationData } from "../handlers/users-guilds/users-guilds.handlers.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
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
).pipe(Layer.provide(NativeMemberServicesLive), Layer.provide(ApiDatabaseLive));
