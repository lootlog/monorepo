import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { httpInstrumentationMiddleware } from "@hono/otel";
import type { Queue, Worker } from "bullmq";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";
import { createBattlesController } from "./battles/battles.controller.js";
import {
  createDeleteUserBattlesQueue,
  createDeleteUserBattlesWorker,
  type DeleteUserBattlesJobData,
} from "./battles/delete-user-battles.processor.js";
import { createInternalController } from "./battles/internal.controller.js";
import { BattleAnalyticsService } from "./battles/services/battle-analytics.service.js";
import { PaginationService } from "./battles/services/pagination.service.js";
import { BattlesService } from "./battles/battles.service.js";
import { healthzController } from "./healthz/healthz.controller.js";
import { AppError } from "./lib/errors/http-errors.js";
import { userMetadataFromHeaders } from "./lib/middleware/auth.middleware.js";
import type { AppVariables } from "./lib/hono.types.js";
import { DrizzleService } from "./shared/modules/drizzle/drizzle.service.js";
import { R2Service } from "./shared/modules/r2/r2.service.js";
import { RedisService } from "./shared/modules/redis/redis.service.js";

export interface BattlelogAppDependencies {
  battlesService: BattlesService;
  battleAnalyticsService: BattleAnalyticsService;
  drizzleService: DrizzleService;
  deleteUserBattlesQueue: Queue<DeleteUserBattlesJobData>;
}

export interface BattlelogAppContext extends BattlelogAppDependencies {
  drizzleService: DrizzleService;
  redisService: RedisService;
  r2Service: R2Service;
  deleteUserBattlesWorker: Worker;
  close(): Promise<void>;
}

export function createApp({
  battlesService,
  battleAnalyticsService,
  drizzleService,
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

  app.route("/healthz", healthzController);
  app.route(
    "/battles",
    createBattlesController({
      battlesService,
      battleAnalyticsService,
      drizzleService,
    }),
  );
  app.route("/internal", createInternalController({ deleteUserBattlesQueue }));

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
  const drizzleService = new DrizzleService(
    APP_CONFIG.postgresConnectionUri,
    logger,
  );
  await drizzleService.connect();

  const redisService = new RedisService(APP_CONFIG.redis);
  redisService.connect();

  const r2Service = new R2Service(APP_CONFIG.r2, redisService, logger);
  const battleAnalyticsService = new BattleAnalyticsService(
    drizzleService,
    redisService,
  );
  const paginationService = new PaginationService(drizzleService);
  const battlesService = new BattlesService(
    drizzleService,
    r2Service,
    paginationService,
    battleAnalyticsService,
  );

  const deleteUserBattlesQueue = createDeleteUserBattlesQueue(APP_CONFIG.redis);
  const deleteUserBattlesWorker = createDeleteUserBattlesWorker(
    APP_CONFIG.redis,
    battlesService,
  );

  return {
    drizzleService,
    redisService,
    r2Service,
    battlesService,
    battleAnalyticsService,
    deleteUserBattlesQueue,
    deleteUserBattlesWorker,
    async close() {
      await Promise.allSettled([
        deleteUserBattlesWorker.close(),
        deleteUserBattlesQueue.close(),
        redisService.close(),
        drizzleService.close(),
      ]);
    },
  };
}
