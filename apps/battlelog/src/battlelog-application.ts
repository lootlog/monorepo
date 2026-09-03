import { BunRedis } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { Queue, Worker } from "bullmq";
import { Context, Effect, FiberSet, Layer, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import {
  makeBattlelogOperations,
  type BattlelogOperations,
} from "#src/battles/battlelog-operations";
import { makeBattles, type Battles } from "#src/battles/battles.service";
import { DELETE_USER_BATTLES_QUEUE } from "#src/battles/deletion/delete-user-battles-queue";
import {
  makeDeleteUserBattlesProcessor,
  type DeleteUserBattlesJobData,
} from "#src/battles/deletion/delete-user-battles.processor";
import { makeAbyssSeasonCalculator } from "#src/battles/analytics/abyss-season-calculator.service";
import { makeBattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import { battleAnalyticsDomain } from "#src/battles/analytics/battle-analytics-domain.service";
import { battleAnalyticsPaging } from "#src/battles/analytics/battle-analytics-paging.service";
import { makeBattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import { makeBattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { makeBattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import { makeBattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import { makeBattleSummaryCalculator } from "#src/battles/analytics/battle-summary-calculator.service";
import { makeCombatProfileCalculator } from "#src/battles/analytics/combat-profile-calculator.service";
import { makeHeadToHeadCalculator } from "#src/battles/analytics/head-to-head-calculator.service";
import { makeBattlePagination } from "#src/battles/analytics/pagination.service";
import { makePlayerVsPlayerCalculator } from "#src/battles/analytics/player-vs-player-calculator.service";
import { BattlelogConfig, type BattlelogConfiguration } from "#src/config/env";
import { makeDrizzleDatabase } from "#src/database/database";
import { makeBattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import { makeRedisStore } from "#src/infrastructure/redis-store";

const redisConnectionOptions = (config: BattlelogConfiguration) => ({
  ...config.redis,
  password: Redacted.value(config.redis.password),
});

export interface BattlelogApplicationService {
  readonly port: number;
  readonly operations: BattlelogOperations;
}

export class BattlelogApplication extends Context.Service<
  BattlelogApplication,
  BattlelogApplicationService
>()("@lootlog/battlelog/Application") {
  static readonly layerWithoutConfig = Layer.effect(
    BattlelogApplication,
    Effect.gen(function* () {
      const config = yield* BattlelogConfig;
      const drizzle = yield* makeDrizzleDatabase;
      const redisClient = yield* Redis.Redis;
      yield* redisClient
        .send("PING")
        .pipe(
          Effect.mapError(
            (cause) => new Error("Failed to initialize Redis", { cause }),
          ),
        );
      const redis = makeRedisStore(redisClient, Effect.runPromise);

      const cacheService = makeBattleAnalyticsCache(redis);
      const domain = battleAnalyticsDomain;
      const paging = battleAnalyticsPaging;
      const queryService = makeBattleAnalyticsQuery(drizzle, cacheService);
      const summaryCalculator = makeBattleSummaryCalculator(domain);
      const combatProfileCalculator = makeCombatProfileCalculator(domain);
      const headToHeadCalculator = makeHeadToHeadCalculator(domain);
      const playerVsPlayerCalculator = makePlayerVsPlayerCalculator(domain);
      const abyssSeasonCalculator = makeAbyssSeasonCalculator(domain);
      const analyticsService = makeBattleAnalytics(
        drizzle,
        cacheService,
        queryService,
        domain,
        paging,
        summaryCalculator,
        combatProfileCalculator,
        headToHeadCalculator,
        playerVsPlayerCalculator,
        abyssSeasonCalculator,
      );
      const metadataService = makeBattleMetadata(drizzle, redis);
      const battlesService = makeBattles(
        drizzle,
        makeBattleObjectStorage(redis, config.r2),
        redis,
        makeBattlePagination(drizzle),
        analyticsService,
        makeBattleListFilter(drizzle),
        metadataService,
      );
      const queue = yield* acquireDeleteQueue(config);
      yield* acquireDeleteWorker(config, battlesService);

      const operations = makeBattlelogOperations(
        battlesService,
        analyticsService,
        queue,
      );

      yield* Effect.logInfo("Battlelog application initialized").pipe(
        Effect.annotateLogs({
          deploymentIdentity: config.serviceName,
          serviceNamespace: config.serviceNamespace,
        }),
      );

      return BattlelogApplication.of({ operations, port: config.port });
    }),
  );

  static readonly layer = this.layerWithoutConfig.pipe(
    Layer.provide(
      Layer.unwrap(
        Effect.map(BattlelogConfig, (config) =>
          PgClient.layer({
            url: config.postgresqlConnectionUri,
            applicationName: config.serviceName,
          }),
        ),
      ),
    ),
    Layer.provide(BattlelogConfig.layer),
    Layer.provide(
      Layer.unwrap(
        Effect.map(BattlelogConfig, (config) =>
          BunRedis.layer({ url: redisUrl(config) }),
        ),
      ).pipe(Layer.provide(BattlelogConfig.layer)),
    ),
  );
}

const redisUrl = (config: BattlelogConfiguration): string =>
  `redis://${encodeURIComponent(config.redis.username ?? "")}:${encodeURIComponent(Redacted.value(config.redis.password))}@${config.redis.host}:${config.redis.port}`;

const acquireDeleteQueue = (config: BattlelogConfiguration) =>
  Effect.acquireRelease(
    Effect.sync(
      () =>
        new Queue<DeleteUserBattlesJobData>(DELETE_USER_BATTLES_QUEUE, {
          connection: redisConnectionOptions(config),
          prefix: "{bull}",
        }),
    ),
    (queue) => Effect.tryPromise(() => queue.close()),
  );

const acquireDeleteWorker = (
  config: BattlelogConfiguration,
  battlesService: Battles,
) =>
  Effect.gen(function* () {
    const runWorker = yield* FiberSet.makeRuntimePromise();
    return yield* Effect.acquireRelease(
      Effect.sync(() => {
        const processor = makeDeleteUserBattlesProcessor(battlesService);
        return new Worker<DeleteUserBattlesJobData>(
          DELETE_USER_BATTLES_QUEUE,
          (job) => runWorker(processor.process(job)),
          { connection: redisConnectionOptions(config), prefix: "{bull}" },
        );
      }),
      (worker) => Effect.tryPromise(() => worker.close()),
    );
  });
