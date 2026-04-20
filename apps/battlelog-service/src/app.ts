import {
  createJsonErrorHandler,
  createOpenApiServiceApp,
  createSafeHttpInstrumentationMiddleware,
  createRequestLoggingMiddleware,
  registerOpenApiDocs,
} from "@lootlog/hono-shared";
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
  const app = createOpenApiServiceApp<{
    Variables: AppVariables;
  }>();

  app.use(
    "*",
    createSafeHttpInstrumentationMiddleware({
      serviceName: APP_CONFIG.serviceName,
      serviceVersion: "1.0.0",
    }),
  );
  app.use(
    "*",
    createRequestLoggingMiddleware({
      logger,
      skipPaths: ["/healthz"],
    }),
  );
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

  registerOpenApiDocs(app, {
    info: {
      title: "Battle Log API",
      version: "1.0.0",
      description: "Battle log storage, dashboards, and player analytics API",
    },
  });

  app.notFound((c) => c.json({ message: "Not Found" }, 404));
  app.onError(
    createJsonErrorHandler({
      logger,
      logMessage: "Unhandled battlelog error",
    }),
  );

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
  const battleAnalytics = new BattleAnalytics(drizzleDatabase, redisCache);
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
