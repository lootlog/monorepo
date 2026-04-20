import { serve } from "@hono/node-server";
import {
  closeNodeServer,
  registerGracefulShutdown,
} from "@lootlog/hono-shared";
import {
  initHonoObservability,
  shutdownHonoObservability,
} from "@lootlog/instrumentation";
import type { Server as HttpServer } from "node:http";
import { createApp, createAppContext } from "./app.js";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";
import { GatewayRabbitmqRuntime } from "./gateway/rabbitmq/gateway-rabbitmq-runtime.js";
import { GatewaySocketRuntime } from "./gateway/gateway-socket-runtime.js";

initHonoObservability({
  serviceName: APP_CONFIG.serviceName,
  otlpEndpoint: APP_CONFIG.observability.otlpEndpoint,
  otlpHeaders: APP_CONFIG.observability.otlpHeaders,
  serviceEnvironment: APP_CONFIG.env,
  serviceNamespace: APP_CONFIG.observability.serviceNamespace,
  traceSampleRate: 0.1,
  forceEnable: false,
  enableDebugLogging: false,
});

const appContext = await createAppContext();
const app = createApp();

const rabbitRuntime = new GatewayRabbitmqRuntime({
  rabbitmqUri: APP_CONFIG.rabbitmqUri,
  publisherRef: appContext.amqpPublisherRef,
  queueHandler: appContext.gatewayQueueHandler,
  logger,
});
await rabbitRuntime.start();

const server = serve({
  fetch: app.fetch,
  port: APP_CONFIG.port,
});

const socketRuntime = new GatewaySocketRuntime({
  connectionService: appContext.connectionService,
  httpServer: server as unknown as HttpServer,
  logger,
  presenceService: appContext.presenceService,
  socketServerRef: appContext.socketServerRef,
  subscriptionService: appContext.subscriptionService,
});
await socketRuntime.start();

logger.info("Gateway service is running", {
  url: `http://localhost:${APP_CONFIG.port}`,
});

registerGracefulShutdown({
  logger,
  message: "Shutting down gateway service",
  onShutdown: async () => {
    await closeNodeServer(server);
    await Promise.allSettled([
      socketRuntime.close(),
      rabbitRuntime.close(),
      appContext.close(),
      shutdownHonoObservability(),
    ]);
  },
});
