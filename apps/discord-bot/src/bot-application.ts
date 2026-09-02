import { RabbitMessaging } from "@lootlog/messaging";
import { BunHttpServer } from "@effect/platform-bun";
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
import { Context, Effect, Layer, Schema } from "effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "effect/unstable/http";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";
import { registerDiscordEventHandlers } from "#src/bot/bot-discord-events.handler";
import {
  makeDiscordDelivery,
  type DiscordDelivery,
} from "#src/bot/discord-delivery.service";
import {
  makeDiscordSync,
  type DiscordSync,
} from "#src/bot/discord-sync.service";
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
  readonly delivery: DiscordDelivery;
  readonly sync: DiscordSync;
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
          rabbit.publish({
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
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
      const delivery = makeDiscordDelivery(publisher, client);
      const sync = makeDiscordSync(publisher, client);
      registerDiscordEventHandlers(client, sync);
      return BotServices.of({ client, delivery, sync });
    }),
  );
}

const GuildParams = Schema.Struct({ guildId: Schema.String });

class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("DiscordBotHealth", "/healthz", {
    success: HttpApiSchema.Empty(200),
  }),
) {}

class InternalGroup extends HttpApiGroup.make("internal")
  .add(
    HttpApiEndpoint.get(
      "DiscordBotGetGuildChannels",
      "/internal/guilds/:guildId/channels",
      { params: GuildParams, success: Schema.Unknown },
    ),
  )
  .add(
    HttpApiEndpoint.post(
      "DiscordBotRefreshGuildChannels",
      "/internal/guilds/:guildId/channels/refresh",
      { params: GuildParams, success: Schema.Unknown },
    ),
  )
  .add(
    HttpApiEndpoint.get(
      "DiscordBotGetGuildSyncStatus",
      "/internal/guilds/:guildId/sync-status",
      { params: GuildParams, success: Schema.Unknown },
    ),
  ) {}

export class DiscordBotApi extends HttpApi.make("DiscordBotApi")
  .add(HealthGroup)
  .add(InternalGroup) {}

const operation = <A>(operationId: string, run: Effect.Effect<A, unknown>) =>
  run.pipe(
    Effect.map((value) => HttpServerResponse.jsonUnsafe(value)),
    Effect.catch(() =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe(
          { message: "Discord synchronization failed" },
          { status: 500 },
        ),
      ),
    ),
    Effect.withSpan(operationId, {
      attributes: { adapter: "discord", retryCount: 0 },
    }),
  );

const BotHttpHandlers = HttpApiBuilder.group(
  DiscordBotApi,
  "health",
  (handlers) =>
    handlers.handleRaw("DiscordBotHealth", () =>
      Effect.succeed(HttpServerResponse.text("OK")),
    ),
).pipe(
  Layer.merge(
    HttpApiBuilder.group(DiscordBotApi, "internal", (handlers) =>
      handlers
        .handleRaw(
          "DiscordBotGetGuildChannels",
          Effect.fn("DiscordBotGetGuildChannels")(function* ({ params }) {
            const services = yield* BotServices;
            return yield* operation(
              "DiscordBotGetGuildChannels",
              services.sync.getGuildChannels(params.guildId),
            );
          }),
        )
        .handleRaw(
          "DiscordBotRefreshGuildChannels",
          Effect.fn("DiscordBotRefreshGuildChannels")(function* ({ params }) {
            const services = yield* BotServices;
            return yield* operation(
              "DiscordBotRefreshGuildChannels",
              services.sync.refreshGuildChannels(params.guildId),
            );
          }),
        )
        .handleRaw(
          "DiscordBotGetGuildSyncStatus",
          Effect.fn("DiscordBotGetGuildSyncStatus")(function* ({ params }) {
            const services = yield* BotServices;
            return yield* operation(
              "DiscordBotGetGuildSyncStatus",
              services.sync.getGuildSyncStatus(params.guildId),
            );
          }),
        ),
    ),
  ),
);

const BotHttpRoutes = HttpApiBuilder.layer(DiscordBotApi).pipe(
  Layer.provide(BotHttpHandlers),
);

export const makeBotHttpBoundary = (services: BotServicesValue) => {
  const boundary = HttpRouter.toWebHandler(
    BotHttpRoutes.pipe(
      HttpRouter.provideRequest(Layer.succeed(BotServices, services)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );
  return {
    dispose: boundary.dispose,
    handler: boundary.handler as (request: Request) => Promise<Response>,
  };
};

export const BotConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const services = yield* BotServices;
    yield* rabbit.consume(
      {
        queue: notificationQueue.name,
        prefetch: 1,
        failurePolicy: { strategy: "requeue" },
      },
      (delivery) =>
        Effect.gen(function* () {
          const input: unknown = JSON.parse(
            new TextDecoder().decode(delivery.content),
          );
          if (!isNotificationCommand(input)) return;
          yield* services.delivery.sendNotification(input);
        }),
    );
  }),
);

export const BotHttpServer = Layer.unwrap(
  Effect.map(BotConfig, ({ port }) =>
    HttpRouter.serve(BotHttpRoutes, {
      middleware: (effect) =>
        Effect.catchCause(effect, () =>
          Effect.succeed(
            HttpServerResponse.jsonUnsafe(
              { message: "Internal server error" },
              { status: 500 },
            ),
          ),
        ),
    }).pipe(Layer.provide(BunHttpServer.layer({ hostname: "0.0.0.0", port }))),
  ),
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
