import { OpenAPIHono } from "@hono/zod-openapi";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { swaggerUI } from "@hono/swagger-ui";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";
import { ActivityQuery } from "./activities/activity-query.js";
import { createActivityRoutes } from "./activities/activity-routes.js";
import { ActivityStore } from "./activities/activity-store.js";
import { createHealthzRoutes } from "./healthz/healthz.routes.js";
import { AppError } from "./lib/errors/http-errors.js";
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
  const app = new OpenAPIHono<{
    Variables: AppVariables;
  }>({ strict: false });

  app.use(
    "*",
    httpInstrumentationMiddleware({
      serviceName: APP_CONFIG.serviceName,
      serviceVersion: APP_CONFIG.appVersion,
    }),
  );
  app.use("*", async (c, next) => {
    const startedAt = Date.now();
    await next();

    if (c.req.path === "/healthz") {
      return;
    }

    logger.info("Activity request completed", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  });
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

  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Activity Logger API",
      version: APP_CONFIG.appVersion,
      description: "Guild activity logs, suggestions, and ingestion API",
    },
  });
  app.get("/docs", swaggerUI({ url: "/doc" }));

  app.notFound((c) => c.json({ message: "Not Found" }, 404));
  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(
        {
          message: error.message,
        },
        error.status as 400 | 401 | 403 | 404 | 500,
      );
    }

    logger.error("Unhandled activity error", {
      method: c.req.method,
      path: c.req.path,
      error,
    });

    return c.json(
      {
        message: "Internal Server Error",
      },
      500,
    );
  });

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
