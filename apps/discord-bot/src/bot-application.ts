import {
  promiseOperation,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import {
  consumeEvent,
  makeEventPublisher,
  RabbitMessaging,
} from "@lootlog/messaging";
import { serviceHttpServer } from "@lootlog/instrumentation/service";
import {
  consumerRoute,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Client, IntentsBitField } from "discord.js";
import { Context, Effect, FiberSet, Layer, Redacted } from "effect";
import {
  FetchHttpClient,
  HttpRouter,
  HttpServer,
  HttpServerResponse,
} from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { registerDiscordEventHandlers } from "#src/bot/bot-discord-events.handler";
import {
  makeDiscordDelivery,
  type DiscordDelivery,
} from "#src/bot/discord-delivery.service";
import {
  makeDiscordSync,
  type DiscordSync,
} from "#src/bot/discord-sync.service";
import { LootlogClient } from "#src/commands/lootlog-client";
import { registerSlashCommands } from "#src/commands/slash-command-interactions";
import type { CommandServices } from "#src/commands/slash-command";
import { BotConfig } from "#src/config/bot-config";
import { DiscordBotApi } from "#src/http-api/discord-bot-api";

// A failed send is requeued; an undecodable command is rejected and logged.
const notificationRoute = consumerRoute(
  "discord-bot-notifications-send",
  RabbitRoutingKey.NOTIFICATIONS_DISCORD_SEND,
  { failure: "requeue", prefetch: 10 },
);

export interface BotServicesValue {
  readonly client: Client;
  readonly delivery: DiscordDelivery;
  readonly sync: DiscordSync;
}

class BotServices extends Context.Service<BotServices, BotServicesValue>()(
  "@lootlog/discord-bot/BotServices",
) {
  static readonly layer = Layer.effect(
    BotServices,
    Effect.gen(function* () {
      const config = yield* BotConfig;
      const rabbit = yield* RabbitMessaging;

      const publisher = makeEventPublisher(rabbit);

      const client = yield* Effect.acquireRelease(
        promiseOperation("discord.client.login", async () => {
          const active = new Client({
            intents: [IntentsBitField.Flags.Guilds],
          });

          await active.login(Redacted.value(config.discordBotToken));

          return active;
        }),
        (active) => Effect.promise(() => active.destroy()),
      );

      const delivery = makeDiscordDelivery(publisher, client);
      const sync = makeDiscordSync(publisher, client);
      const runEvent = yield* FiberSet.makeRuntime<never, void, never>();
      registerDiscordEventHandlers(client, sync, runEvent);

      const runInteraction = yield* FiberSet.makeRuntime<
        CommandServices,
        void,
        never
      >();

      registerSlashCommands(client, runInteraction);

      return BotServices.of({ client, delivery, sync });
    }),
  );
}

const operation = <A>(operationId: string, run: Effect.Effect<A, unknown>) =>
  run.pipe(
    Effect.mapError(() => ({
      message: "Discord synchronization failed" as const,
    })),
    withAdapterSpan(operationId, "discord"),
  );

const BotHttpHandlers = HttpApiBuilder.group(
  DiscordBotApi,
  "health",
  (handlers) =>
    handlers.handle("DiscordBotHealth", () => Effect.succeed("OK" as const)),
).pipe(
  Layer.merge(
    HttpApiBuilder.group(DiscordBotApi, "internal", (handlers) =>
      handlers.handle(
        "DiscordBotRefreshGuildChannels",
        Effect.fn("DiscordBotRefreshGuildChannels")(function* ({ params }) {
          const services = yield* BotServices;

          return yield* operation(
            "DiscordBotRefreshGuildChannels",
            services.sync.refreshGuildChannels(params.guildId),
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
      Layer.provideMerge(Layer.succeed(BotServices, services)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

  return {
    dispose: boundary.dispose,
    handler: boundary.handler,
  };
};

const BotConsumer = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const services = yield* BotServices;
    yield* consumeEvent(rabbit, notificationRoute, (command) =>
      services.delivery.sendNotification(command),
    );
  }),
);

const BotHttpServer = Layer.unwrap(
  Effect.map(BotConfig, ({ port }) =>
    serviceHttpServer({
      routes: BotHttpRoutes,
      port,
      middleware: (effect) =>
        Effect.catchCause(effect, () =>
          Effect.succeed(
            HttpServerResponse.jsonUnsafe(
              { message: "Internal server error" },
              { status: 500 },
            ),
          ),
        ),
    }),
  ),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* BotConfig;

    return RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: notificationRoute.queues,
    });
  }),
).pipe(Layer.provide(BotConfig.layer));

export const BotApplication = Layer.merge(BotHttpServer, BotConsumer).pipe(
  Layer.provide(BotServices.layer),
  Layer.provide(LootlogClient.layer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(RabbitLive),
  Layer.provide(BotConfig.layer),
);
