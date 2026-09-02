import { Queue, Worker } from "bullmq";
import { Context, Effect, Layer } from "effect";
import {
  BattlesController,
  PublicBattlesController,
} from "#src/battles/battles.controller";
import { BattlesService } from "#src/battles/battles.service";
import { DELETE_USER_BATTLES_QUEUE } from "#src/battles/constants/delete-user-battles-queue.constant";
import {
  DeleteUserBattlesProcessor,
  type DeleteUserBattlesJobData,
} from "#src/battles/delete-user-battles.processor";
import { InternalController } from "#src/battles/internal.controller";
import { AbyssSeasonCalculatorService } from "#src/battles/services/abyss-season-calculator.service";
import { BattleAnalyticsCacheService } from "#src/battles/services/battle-analytics-cache.service";
import { BattleAnalyticsDomainService } from "#src/battles/services/battle-analytics-domain.service";
import { BattleAnalyticsPagingService } from "#src/battles/services/battle-analytics-paging.service";
import { BattleAnalyticsQueryService } from "#src/battles/services/battle-analytics-query.service";
import { BattleAnalyticsService } from "#src/battles/services/battle-analytics.service";
import { BattleListFilterService } from "#src/battles/services/battle-list-filter.service";
import { BattleMetadataService } from "#src/battles/services/battle-metadata.service";
import { BattleSummaryCalculatorService } from "#src/battles/services/battle-summary-calculator.service";
import { CombatProfileCalculatorService } from "#src/battles/services/combat-profile-calculator.service";
import { HeadToHeadCalculatorService } from "#src/battles/services/head-to-head-calculator.service";
import { PaginationService } from "#src/battles/services/pagination.service";
import { PlayerVsPlayerCalculatorService } from "#src/battles/services/player-vs-player-calculator.service";
import { BattlelogConfig, type BattlelogConfiguration } from "#src/config/env";
import { createRequestHandler } from "#src/http/router";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
import { R2Service } from "#src/shared/modules/r2/r2.service";
import { RedisService } from "#src/shared/modules/redis/redis.service";

export interface BattlelogApplicationService {
  readonly port: number;
  readonly fetch: (request: Request) => Promise<Response>;
}

export class BattlelogApplication extends Context.Service<
  BattlelogApplication,
  BattlelogApplicationService
>()("@lootlog/battlelog/Application") {
  static readonly layerWithoutConfig = Layer.effect(
    BattlelogApplication,
    Effect.gen(function* () {
      const config = yield* BattlelogConfig;
      const drizzle = yield* acquireDrizzle(config);
      const redis = yield* acquireRedis(config);

      const cacheService = new BattleAnalyticsCacheService(redis);
      const domainService = new BattleAnalyticsDomainService();
      const pagingService = new BattleAnalyticsPagingService();
      const queryService = new BattleAnalyticsQueryService(
        drizzle,
        cacheService,
      );
      const summaryCalculator = new BattleSummaryCalculatorService(
        domainService,
      );
      const combatProfileCalculator = new CombatProfileCalculatorService(
        domainService,
      );
      const headToHeadCalculator = new HeadToHeadCalculatorService(
        domainService,
      );
      const playerVsPlayerCalculator = new PlayerVsPlayerCalculatorService(
        domainService,
      );
      const abyssSeasonCalculator = new AbyssSeasonCalculatorService(
        domainService,
      );
      const analyticsService = new BattleAnalyticsService(
        drizzle,
        cacheService,
        queryService,
        domainService,
        pagingService,
        summaryCalculator,
        combatProfileCalculator,
        headToHeadCalculator,
        playerVsPlayerCalculator,
        abyssSeasonCalculator,
      );
      const metadataService = new BattleMetadataService(drizzle, redis);
      const battlesService = new BattlesService(
        drizzle,
        new R2Service(redis, config.r2),
        redis,
        new PaginationService(drizzle),
        analyticsService,
        new BattleListFilterService(drizzle),
        metadataService,
      );
      const queue = yield* acquireDeleteQueue(config);
      yield* acquireDeleteWorker(config, battlesService);

      const fetch = createRequestHandler({
        battles: new BattlesController(battlesService, analyticsService),
        publicBattles: new PublicBattlesController(battlesService),
        internal: new InternalController(queue),
      });

      yield* Effect.logInfo("Battlelog application initialized").pipe(
        Effect.annotateLogs({
          deploymentIdentity: config.serviceName,
          serviceNamespace: config.serviceNamespace,
        }),
      );

      return BattlelogApplication.of({ fetch, port: config.port });
    }),
  );

  static readonly layer = this.layerWithoutConfig.pipe(
    Layer.provide(BattlelogConfig.layer),
  );
}

const acquireDrizzle = (config: BattlelogConfiguration) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const drizzle = new DrizzleService(config.postgresqlConnectionUri);
        await drizzle.connect();
        return drizzle;
      },
      catch: (cause) => new Error("Failed to initialize PostgreSQL", { cause }),
    }),
    (drizzle) => Effect.promise(() => drizzle.close()),
  );

const acquireRedis = (config: BattlelogConfiguration) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const redis = new RedisService(config.redis);
        await redis.connect();
        return redis;
      },
      catch: (cause) => new Error("Failed to initialize Redis", { cause }),
    }),
    (redis) => Effect.sync(() => redis.close()),
  );

const acquireDeleteQueue = (config: BattlelogConfiguration) =>
  Effect.acquireRelease(
    Effect.sync(
      () =>
        new Queue<DeleteUserBattlesJobData>(DELETE_USER_BATTLES_QUEUE, {
          connection: config.redis,
          prefix: "{bull}",
        }),
    ),
    (queue) => Effect.promise(() => queue.close()),
  );

const acquireDeleteWorker = (
  config: BattlelogConfiguration,
  battlesService: BattlesService,
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const processor = new DeleteUserBattlesProcessor(battlesService);
      return new Worker<DeleteUserBattlesJobData>(
        DELETE_USER_BATTLES_QUEUE,
        (job) => processor.process(job),
        { connection: config.redis, prefix: "{bull}" },
      );
    }),
    (worker) => Effect.promise(() => worker.close()),
  );

export const BattlelogServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const application = yield* BattlelogApplication;
    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          hostname: "0.0.0.0",
          port: application.port,
          fetch: application.fetch,
        }),
      ),
      (server) => Effect.promise(() => server.stop(true)),
    );

    yield* Effect.logInfo("Battlelog HTTP server listening").pipe(
      Effect.annotateLogs({ hostname: server.hostname, port: server.port }),
    );
  }),
).pipe(Layer.provide(BattlelogApplication.layer));
