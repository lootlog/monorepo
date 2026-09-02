import { randomUUID } from "node:crypto";
import { Effect, Layer } from "effect";
import { RabbitMessaging } from "@lootlog/messaging";
import type { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Permission } from "@lootlog/schema/permissions";
import type { Logger } from "winston";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { DocsRepository } from "#src/docs/docs.repository";
import { DocsService } from "#src/docs/docs.service";
import { MapsService } from "#src/maps/maps.service";
import { GuildsRepository } from "#src/guilds/guilds.repository";
import { MembersRepository } from "#src/members/members.repository";
import { ChatService } from "#src/chat/chat.service";
import { MessagingService } from "#src/messaging/messaging.service";
import { NotificationRateLimiterService } from "#src/messaging/notification-rate-limiter.service";
import { ReadyRoomPublisher } from "#src/messaging/ready-room/ready-room-publisher";
import { ReadyRoomRedisRepository } from "#src/messaging/ready-room/ready-room-redis.repository";
import { ReadyRoomService } from "#src/messaging/ready-room/ready-room.service";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import { PublicGuildStatsCardService } from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { DocsData } from "../handlers/docs/docs.handlers.js";
import { InternalGuildsData } from "../handlers/internal/internal.handlers.js";
import { MessagingData } from "../handlers/messaging/messaging.handlers.js";
import { ReadyRoomData } from "../handlers/party-ready-room/party-ready-room.handlers.js";
import { PublicSystemData } from "../handlers/public-system/public-system.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";
import { ChatData } from "../handlers/chat/chat.handlers.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

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
).pipe(Layer.provide(ApiDatabaseLive));
