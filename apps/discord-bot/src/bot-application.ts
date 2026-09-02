import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import {
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
  type DiscordNotificationSendCommand,
} from "@lootlog/schema/notifications";
import { Client, IntentsBitField } from "discord.js";
import { Context, Effect, Layer } from "effect";
import { registerDiscordEventHandlers } from "#src/bot/bot-discord-events.handler";
import { BotNotificationsConsumer } from "#src/bot/bot-notifications.consumer";
import { DiscordDeliveryService } from "#src/bot/discord-delivery.service";
import { DiscordSyncService } from "#src/bot/discord-sync.service";
import type { RabbitPublisher } from "#src/bot/rabbit-publisher";
import { BotConfig } from "#src/config/bot-config";

const notificationQueue: RabbitQueueDefinition = {
  name: "discord-bot-notifications-send",
  exchange: RabbitExchange.DEFAULT,
  routingKey: RabbitRoutingKey.NOTIFICATIONS_DISCORD_SEND,
  durable: true,
};

const isNotificationCommand = (
  input: unknown,
): input is DiscordNotificationSendCommand => {
  if (typeof input !== "object" || input === null) return false;
  const value = input as Record<string, unknown>;
  const target = value.target as Record<string, unknown> | undefined;
  return (
    typeof value.notificationJobId === "string" &&
    value.provider === NotificationProvider.DISCORD &&
    (value.ownerType === NotificationOwnerType.GUILD ||
      value.ownerType === NotificationOwnerType.USER) &&
    typeof value.ownerId === "string" &&
    typeof value.title === "string" &&
    typeof value.message === "string" &&
    typeof target?.targetId === "string" &&
    typeof target.externalId === "string" &&
    (target.targetType === NotificationTargetType.CHANNEL ||
      target.targetType === NotificationTargetType.DM)
  );
};

export interface BotServicesValue {
  readonly client: Client;
  readonly delivery: DiscordDeliveryService;
  readonly sync: DiscordSyncService;
}
export class BotServices extends Context.Service<
  BotServices,
  BotServicesValue
>()("@lootlog/discord-bot/BotServices") {
  static readonly layer = Layer.effect(
    BotServices,
    Effect.gen(function* () {
      const config = yield* BotConfig;
      const rabbit = yield* RabbitMessaging;
      const publisher: RabbitPublisher = {
        publish: (_exchange, routingKey, payload) =>
          Effect.runPromise(
            rabbit.publish({
              routingKey,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            }),
          ),
      };
      const client = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            const active = new Client({
              intents: [IntentsBitField.Flags.Guilds],
            });
            await active.login(config.discordBotToken);
            return active;
          },
          catch: (cause) => cause,
        }),
        (active) => Effect.sync(() => active.destroy()),
      );
      const delivery = new DiscordDeliveryService(publisher, client);
      const sync = new DiscordSyncService(publisher, client);
      registerDiscordEventHandlers(client, sync);
      return BotServices.of({ client, delivery, sync });
    }),
  );
}

export const makeBotHandler =
  (services: BotServicesValue) =>
  async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz")
      return new Response("OK");
    const match =
      /^\/internal\/guilds\/([^/]+)\/(channels|channels\/refresh|sync-status)$/.exec(
        url.pathname,
      );
    if (!match) return Response.json({ message: "Not Found" }, { status: 404 });
    const guildId = decodeURIComponent(match[1] ?? "");
    try {
      if (request.method === "GET" && match[2] === "channels")
        return Response.json(await services.sync.getGuildChannels(guildId));
      if (request.method === "POST" && match[2] === "channels/refresh")
        return Response.json(await services.sync.refreshGuildChannels(guildId));
      if (request.method === "GET" && match[2] === "sync-status")
        return Response.json(await services.sync.getGuildSyncStatus(guildId));
      return Response.json({ message: "Not Found" }, { status: 404 });
    } catch {
      return Response.json(
        { message: "Discord synchronization failed" },
        { status: 500 },
      );
    }
  };

export const BotConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const services = yield* BotServices;
    const consumer = new BotNotificationsConsumer(services.delivery);
    yield* rabbit.consume(
      {
        queue: notificationQueue.name,
        prefetch: 1,
        failurePolicy: { strategy: "requeue" },
      },
      (delivery) =>
        Effect.tryPromise({
          try: async () => {
            const input: unknown = JSON.parse(
              new TextDecoder().decode(delivery.content),
            );
            if (!isNotificationCommand(input)) return;
            await consumer.handleNotificationSend(input);
          },
          catch: (cause) => cause,
        }),
    );
  }),
);

export const BotHttpServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* BotConfig;
    const services = yield* BotServices;
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          port: config.port,
          hostname: "0.0.0.0",
          fetch: makeBotHandler(services),
        }),
      ),
      (server) => Effect.sync(() => server.stop(true)),
    );
    yield* Effect.logInfo(`Discord bot HTTP listening on ${config.port}`);
  }),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* BotConfig;
    return RabbitMessaging.layer({
      uri: config.rabbitmqUri,
      connectionName: config.serviceName,
      queues: [notificationQueue],
    });
  }),
).pipe(Layer.provide(BotConfig.layer));

export const BotApplication = Layer.merge(BotHttpServer, BotConsumer).pipe(
  Layer.provide(BotServices.layer),
  Layer.provide(RabbitLive),
  Layer.provide(BotConfig.layer),
);
