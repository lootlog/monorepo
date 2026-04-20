import {
  createJsonErrorHandler,
  createRequestLoggingMiddleware,
  createSafeHttpInstrumentationMiddleware,
  createServiceApp,
} from "@lootlog/hono-shared";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";
import { createHealthzRoutes } from "./healthz/healthz.routes.js";
import { GatewayService } from "./gateway/gateway.service.js";
import { GatewayQueueHandler } from "./gateway/gateway-queue.handler.js";
import { RetryService } from "./gateway/retry.service.js";
import { ActivityService } from "./gateway/services/activity.service.js";
import { ConnectionService } from "./gateway/services/connection.service.js";
import { PresenceService } from "./gateway/services/presence.service.js";
import { SubscriptionService } from "./gateway/services/subscription.service.js";
import { AmqpPublisherRef } from "./gateway/rabbitmq/amqp-publisher.js";
import { SocketServerRef } from "./gateway/socket-server-ref.js";
import { GuildsService } from "./guilds/guilds.service.js";
import { RedisStore } from "./lib/redis/redis-store.js";

export interface GatewayAppContext {
  activityService: ActivityService;
  amqpPublisherRef: AmqpPublisherRef;
  connectionService: ConnectionService;
  gatewayQueueHandler: GatewayQueueHandler;
  gatewayService: GatewayService;
  guildsService: GuildsService;
  presenceService: PresenceService;
  redisStore: RedisStore;
  retryService: RetryService;
  socketServerRef: SocketServerRef;
  subscriptionService: SubscriptionService;
  close(): Promise<void>;
}

export function createApp() {
  const app = createServiceApp();

  app.use(
    "*",
    createSafeHttpInstrumentationMiddleware({
      serviceName: APP_CONFIG.serviceName,
      serviceVersion: APP_CONFIG.appVersion,
    }),
  );
  app.use(
    "*",
    createRequestLoggingMiddleware({
      logger,
      logMessage: "Gateway request completed",
      skipPaths: ["/healthz"],
    }),
  );

  app.route("/healthz", createHealthzRoutes());

  app.notFound((context) => context.json({ message: "Not Found" }, 404));
  app.onError(
    createJsonErrorHandler({
      logger,
      logMessage: "Unhandled gateway error",
    }),
  );

  return app;
}

export async function createAppContext(): Promise<GatewayAppContext> {
  const socketServerRef = new SocketServerRef();
  const amqpPublisherRef = new AmqpPublisherRef();
  const redisStore = new RedisStore(APP_CONFIG, logger);
  const guildsService = new GuildsService(
    APP_CONFIG.apiUrl,
    redisStore,
    logger,
  );
  const connectionService = new ConnectionService(logger);
  const presenceService = new PresenceService(amqpPublisherRef, logger);
  const activityService = new ActivityService(amqpPublisherRef, logger);
  const subscriptionService = new SubscriptionService(
    guildsService,
    presenceService,
    activityService,
    logger,
  );
  const retryService = new RetryService(amqpPublisherRef, logger);
  const gatewayService = new GatewayService(
    socketServerRef,
    redisStore,
    guildsService,
    presenceService,
    logger,
  );
  const gatewayQueueHandler = new GatewayQueueHandler(
    gatewayService,
    retryService,
    logger,
  );

  return {
    activityService,
    amqpPublisherRef,
    connectionService,
    gatewayQueueHandler,
    gatewayService,
    guildsService,
    presenceService,
    redisStore,
    retryService,
    socketServerRef,
    subscriptionService,
    async close() {
      await Promise.allSettled([redisStore.close()]);
    },
  };
}
