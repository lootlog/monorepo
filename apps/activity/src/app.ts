import {
  createJsonErrorHandler,
  createOpenApiServiceApp,
  createSafeHttpInstrumentationMiddleware,
  createRequestLoggingMiddleware,
  registerOpenApiDocs,
} from "@lootlog/hono-shared";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";
import { ActivityQuery } from "./activities/activity-query.js";
import { createActivityRoutes } from "./activities/activity-routes.js";
import { ActivityStore } from "./activities/activity-store.js";
import { createHealthzRoutes } from "./healthz/healthz.routes.js";
import { userMetadataFromHeaders } from "./lib/middleware/auth.middleware.js";
import type { AppVariables } from "./lib/hono.types.js";
import { GuildPermissions } from "./permissions/guild-permissions.js";
import { CacheStore } from "./shared/cache/cache-store.js";
import { PrismaDatabase } from "./shared/prisma/prisma-database.js";
import { ActivityRabbitConsumer } from "./shared/rabbitmq/activity-rabbit-consumer.js";

export interface ActivityAppDependencies {
  activityQuery: ActivityQuery;
  activityStore: ActivityStore;
  guildPermissions: GuildPermissions;
  prismaDatabase: PrismaDatabase;
}

export interface ActivityAppContext extends ActivityAppDependencies {
  cacheStore: CacheStore;
  rabbitConsumer: ActivityRabbitConsumer;
  close(): Promise<void>;
}

export function createApp({
  activityQuery,
  activityStore,
  guildPermissions,
  prismaDatabase,
}: ActivityAppDependencies) {
  const app = createOpenApiServiceApp<{
    Variables: AppVariables;
  }>();

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
      logMessage: "Activity request completed",
      skipPaths: ["/healthz"],
    }),
  );
  app.use("*", userMetadataFromHeaders);

  app.route(
    "/healthz",
    createHealthzRoutes({
      apiServiceUrl: APP_CONFIG.apiServiceUrl,
      prismaDatabase,
    }),
  );
  app.route(
    "/guilds",
    createActivityRoutes({
      activityQuery,
      activityStore,
      guildPermissions,
    }),
  );

  registerOpenApiDocs(app, {
    info: {
      title: "Activity Logger API",
      version: APP_CONFIG.appVersion,
      description: "Guild activity logs, suggestions, and ingestion API",
    },
  });

  app.notFound((c) => c.json({ message: "Not Found" }, 404));
  app.onError(
    createJsonErrorHandler({
      logger,
      logMessage: "Unhandled activity error",
    }),
  );

  return app;
}

export async function createAppContext(): Promise<ActivityAppContext> {
  const prismaDatabase = new PrismaDatabase(
    APP_CONFIG.postgresConnectionUri,
    logger,
  );
  await prismaDatabase.connect();

  const cacheStore = new CacheStore(APP_CONFIG);
  const guildPermissions = new GuildPermissions(cacheStore, logger);
  const activityQuery = new ActivityQuery(prismaDatabase);
  const activityStore = new ActivityStore(prismaDatabase, logger);
  const rabbitConsumer = new ActivityRabbitConsumer(
    APP_CONFIG.rabbitmqUri,
    activityStore,
    logger,
  );
  await rabbitConsumer.start();

  return {
    prismaDatabase,
    cacheStore,
    guildPermissions,
    activityQuery,
    activityStore,
    rabbitConsumer,
    async close() {
      await Promise.allSettled([
        rabbitConsumer.close(),
        cacheStore.close(),
        prismaDatabase.close(),
      ]);
    },
  };
}
