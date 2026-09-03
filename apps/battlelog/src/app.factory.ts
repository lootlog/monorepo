import { PgClient } from "@effect/sql-pg";
import { Queue, Worker } from "bullmq";
import { Context, Effect, Layer, Redacted } from "effect";
import {
  makeBattlelogOperations,
  type BattlelogOperations,
} from "#src/battles/battlelog-operations";
import { makeBattles, type Battles } from "#src/battles/battles.service";
import { DELETE_USER_BATTLES_QUEUE } from "#src/battles/constants/delete-user-battles-queue.constant";
import {
  makeDeleteUserBattlesProcessor,
  type DeleteUserBattlesJobData,
} from "#src/battles/delete-user-battles.processor";
import { makeAbyssSeasonCalculator } from "#src/battles/services/abyss-season-calculator.service";
import { makeBattleAnalyticsCache } from "#src/battles/services/battle-analytics-cache.service";
import { battleAnalyticsDomain } from "#src/battles/services/battle-analytics-domain.service";
import { battleAnalyticsPaging } from "#src/battles/services/battle-analytics-paging.service";
import { makeBattleAnalyticsQuery } from "#src/battles/services/battle-analytics-query.service";
import { makeBattleAnalytics } from "#src/battles/services/battle-analytics.service";
import { makeBattleListFilter } from "#src/battles/services/battle-list-filter.service";
import { makeBattleMetadata } from "#src/battles/services/battle-metadata.service";
import { makeBattleSummaryCalculator } from "#src/battles/services/battle-summary-calculator.service";
import { makeCombatProfileCalculator } from "#src/battles/services/combat-profile-calculator.service";
import { makeHeadToHeadCalculator } from "#src/battles/services/head-to-head-calculator.service";
import { makeBattlePagination } from "#src/battles/services/pagination.service";
import { makePlayerVsPlayerCalculator } from "#src/battles/services/player-vs-player-calculator.service";
import { BattlelogConfig, type BattlelogConfiguration } from "#src/config/env";
import { makeDrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import { makeBattleObjectStorage } from "#src/shared/modules/r2/r2.service";
import { makeRedisStore } from "#src/shared/modules/redis/redis.service";

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
      const redis = yield* acquireRedis(config);

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
  );
}

const acquireRedis = (config: BattlelogConfiguration) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const redis = makeRedisStore(redisConnectionOptions(config));
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
  Effect.acquireRelease(
    Effect.sync(() => {
      const processor = makeDeleteUserBattlesProcessor(battlesService);
      return new Worker<DeleteUserBattlesJobData>(
        DELETE_USER_BATTLES_QUEUE,
        (job) => Effect.runPromise(processor.process(job)),
        { connection: redisConnectionOptions(config), prefix: "{bull}" },
      );
    }),
    (worker) => Effect.tryPromise(() => worker.close()),
  );
