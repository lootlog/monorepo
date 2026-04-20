import {
  initHonoObservability,
  shutdownHonoObservability,
} from "@lootlog/instrumentation";
import "dotenv/config";

initHonoObservability({
  serviceName: process.env.SERVICE_NAME ?? "discord-bot",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  serviceEnvironment: process.env.ENV,
  serviceNamespace: process.env.SERVICE_NAMESPACE,
  traceSampleRate: 0.1,
  forceEnable: false,
  enableDebugLogging: false,
});

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { DiscordDeliveryService } from "./bot/discord-delivery.service.js";
import { NotificationsConsumer } from "./bot/notifications-consumer.js";
import { registerDiscordEventHandlers } from "./bot/register-discord-event-handlers.js";
import { DiscordSyncService } from "./bot/discord-sync.service.js";
import { APP_CONFIG } from "./config/app.config.js";
import {
  createDiscordClient,
  getDiscordBotToken,
} from "./config/discord.config.js";
import { DEFAULT_EXCHANGE_NAME } from "./config/rabbitmq.config.js";
import { logger } from "./config/winston.config.js";
import { RabbitMQClient } from "./lib/rabbitmq.js";
import { RoutingKey } from "./bot/enums/routing-key.enum.js";

const rabbitMqClient = await RabbitMQClient.connect(APP_CONFIG.rabbitmq.uri);
const discordClient = createDiscordClient();

const discordDeliveryService = new DiscordDeliveryService(
  rabbitMqClient,
  discordClient,
);
const discordSyncService = new DiscordSyncService(
  rabbitMqClient,
  discordClient,
);
const notificationsConsumer = new NotificationsConsumer(discordDeliveryService);

registerDiscordEventHandlers(discordClient, discordSyncService);
await rabbitMqClient.consumeNotifications({
  exchange: DEFAULT_EXCHANGE_NAME,
  queue: "discord-bot-notifications-send",
  routingKey: RoutingKey.NOTIFICATIONS_DISCORD_SEND,
  onMessage: async (command) => {
    await notificationsConsumer.handleNotificationSend(command);
  },
});
await discordClient.login(getDiscordBotToken());

const app = createApp({ discordSyncService });

const server = serve({
  fetch: app.fetch,
  port: APP_CONFIG.port,
});

logger.info(`Server is running on http://localhost:${APP_CONFIG.port}`);

async function shutdownGracefully(signal: string) {
  logger.info(`Received ${signal}, shutting down discord-bot`);

  server.close();
  await discordClient.destroy();
  await rabbitMqClient.close();
  await shutdownHonoObservability();
  process.exit(0);
}

process.on("SIGINT", async () => {
  await shutdownGracefully("SIGINT");
});

process.on("SIGTERM", async () => {
  await shutdownGracefully("SIGTERM");
});
