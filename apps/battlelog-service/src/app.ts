import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { httpInstrumentationMiddleware } from "@hono/otel";
import type { Queue, Worker } from "bullmq";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";
import { createBattleRoutes } from "./battles/battle-routes.js";
import {
  createDeleteUserBattlesQueue,
  createDeleteUserBattlesWorker,
  type DeleteUserBattlesJobData,
} from "./battles/delete-user-battles.job.js";
import { createInternalRoutes } from "./battles/internal.routes.js";
import { BattleAnalytics } from "./battles/battle-analytics.js";
import { BattlePagination } from "./battles/battle-pagination.js";
import { BattleStore } from "./battles/battle-store.js";
import { healthzRoutes } from "./healthz/healthz.routes.js";
import { AppError } from "./lib/errors/http-errors.js";
import { userMetadataFromHeaders } from "./lib/middleware/auth.middleware.js";
import type { AppVariables } from "./lib/hono.types.js";
import { DrizzleDatabase } from "./shared/drizzle/drizzle-database.js";
import { BattleArchive } from "./shared/r2/battle-archive.js";
import { RedisCache } from "./shared/redis/redis-cache.js";

export interface BattlelogAppDependencies {
  battleStore: BattleStore;
  battleAnalytics: BattleAnalytics;
  drizzleDatabase: DrizzleDatabase;
  deleteUserBattlesQueue: Queue<DeleteUserBattlesJobData>;
}

export interface BattlelogAppContext extends BattlelogAppDependencies {
  drizzleDatabase: DrizzleDatabase;
  redisCache: RedisCache;
  battleArchive: BattleArchive;
  deleteUserBattlesWorker: Worker;
  close(): Promise<void>;
}

export function createApp({
  battleStore,
  battleAnalytics,
  drizzleDatabase,
  deleteUserBattlesQueue,
}: BattlelogAppDependencies) {
  const app = new OpenAPIHono<{
    Variables: AppVariables;
  }>({ strict: false });

  app.use(
    "*",
    httpInstrumentationMiddleware({
      serviceName: APP_CONFIG.serviceName,
      serviceVersion: "1.0.0",
    }),
  );
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    logger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`);
  });
  app.use("*", userMetadataFromHeaders);

  app.route("/healthz", healthzRoutes);
  app.route(
    "/battles",
    createBattleRoutes({
      battleStore,
      battleAnalytics,
      drizzleDatabase,
    }),
  );
  app.route("/internal", createInternalRoutes({ deleteUserBattlesQueue }));

  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Battle Log API",
      version: "1.0.0",
      description: "Battle log storage, dashboards, and player analytics API",
    },
  });
  app.get("/docs", swaggerUI({ url: "/doc" }));

  app.notFound((c) => c.json({ message: "Not Found" }, 404));
  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(
        { message: error.message },
        error.status as 400 | 401 | 403 | 404 | 500,
      );
    }

    logger.error("Unhandled battlelog error", {
      path: c.req.path,
      method: c.req.method,
      error,
    });
    return c.json({ message: "Internal Server Error" }, 500);
  });

  return app;
}

export async function createAppContext(): Promise<BattlelogAppContext> {
  const drizzleDatabase = new DrizzleDatabase(
    APP_CONFIG.postgresConnectionUri,
    logger,
  );
  await drizzleDatabase.connect();

  const redisCache = new RedisCache(APP_CONFIG.redis);
  redisCache.connect();

  const battleArchive = new BattleArchive(APP_CONFIG.r2, redisCache, logger);
  const battleAnalytics = new BattleAnalytics(
    drizzleDatabase,
    redisCache,
  );
  const battlePagination = new BattlePagination(drizzleDatabase);
  const battleStore = new BattleStore(
    drizzleDatabase,
    battleArchive,
    battlePagination,
    battleAnalytics,
  );

  const deleteUserBattlesQueue = createDeleteUserBattlesQueue(APP_CONFIG.redis);
  const deleteUserBattlesWorker = createDeleteUserBattlesWorker(
    APP_CONFIG.redis,
    battleStore,
  );

  return {
    drizzleDatabase,
    redisCache,
    battleArchive,
    battleStore,
    battleAnalytics,
    deleteUserBattlesQueue,
    deleteUserBattlesWorker,
    async close() {
      await Promise.allSettled([
        deleteUserBattlesWorker.close(),
        deleteUserBattlesQueue.close(),
        redisCache.close(),
        drizzleDatabase.close(),
      ]);
    },
  };
}
