import { acquireBullQueue, acquireBullWorker } from "@lootlog/database/bullmq";
import { reconnectingBunRedisLayer } from "@lootlog/database/bun-redis";
import { Context, Effect, FiberSet, Layer, Redacted, Schedule } from "effect";
import { Redis } from "effect/persistence";
import {
  makeBattlelogOperations,
  type BattlelogOperations,
} from "#src/battles/battlelog-operations";
import { makeBattles } from "#src/battles/battles.service";
import { DELETE_USER_BATTLES_QUEUE } from "#src/battles/deletion/delete-user-battles-queue";
import {
  makeDeleteUserBattlesProcessor,
  type DeleteUserBattlesJobData,
} from "#src/battles/deletion/delete-user-battles.processor";
import { makeBattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import { makeBattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import { makeBattleAnalyticsRead } from "#src/battles/analytics/battle-analytics-read.service";
import { makeBattleCombatProfileRead } from "#src/battles/analytics/battle-combat-profile-read.service";
import { makeBattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { makeBattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import { makeBattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import { makeBattlePagination } from "#src/battles/analytics/pagination.service";
import { BattlelogConfig } from "#src/config/env";
import { makeBattleReadBudget } from "#src/database/battle-read-budget";
import { drizzleDatabaseEffect, PgClientLive } from "#src/database/database";
import { makeBattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import { makeRedisStore } from "#src/infrastructure/redis-store";
import { makeWeaponKills } from "#src/battles/weapon-kills/weapon-kills";

export interface BattlelogApplicationService {
  readonly cleanupSecret?: Redacted.Redacted<string> | undefined;
  readonly port: number;
  readonly operations: BattlelogOperations;
}

export class BattlelogApplication extends Context.Service<
  BattlelogApplication,
  BattlelogApplicationService
>()("@lootlog/battlelog/Application") {
  static readonly layer = Layer.effect(
    BattlelogApplication,
    Effect.gen(function* () {
      const config = yield* BattlelogConfig;
      const drizzle = yield* drizzleDatabaseEffect;
      const redisClient = yield* Redis.Redis;
      yield* redisClient
        .send("PING")
        .pipe(
          Effect.mapError(
            (cause) => new Error("Failed to initialize Redis", { cause }),
          ),
        );
      const redis = makeRedisStore(redisClient);

      const cacheService = makeBattleAnalyticsCache(redis);
      const queryService = makeBattleAnalyticsQuery(drizzle);

      const read = makeBattleReadBudget(drizzle);

      const analyticsService = makeBattleAnalytics(
        makeBattleAnalyticsRead(drizzle, queryService),
        makeBattleCombatProfileRead(drizzle, queryService),
        cacheService,
        queryService,
        (effect) => read(effect, { consistentSnapshot: true }),
      );

      const metadataService = makeBattleMetadata(drizzle, redis, read);

      const battlesService = makeBattles(
        drizzle,
        makeBattleObjectStorage(redis, config.r2),
        redis,
        makeBattlePagination(drizzle, read),
        analyticsService,
        makeBattleListFilter(drizzle),
        metadataService,
      );

      yield* battlesService.drainObjectDeletions.pipe(
        Effect.catch((error) =>
          Effect.logError("Battle object cleanup retry failed", error),
        ),
        Effect.repeat(Schedule.spaced("5 seconds")),
        Effect.forkScoped,
      );

      const queue = yield* acquireBullQueue<DeleteUserBattlesJobData>(
        DELETE_USER_BATTLES_QUEUE,
        config.redisUrl,
      );

      const runWorker = yield* FiberSet.makeRuntimePromise();
      const processor = makeDeleteUserBattlesProcessor(battlesService);

      yield* acquireBullWorker<DeleteUserBattlesJobData, void>(
        DELETE_USER_BATTLES_QUEUE,
        config.redisUrl,
        (job) => runWorker(processor.process(job)),
      );

      const operations = makeBattlelogOperations(
        battlesService,
        analyticsService,
        metadataService,
        { add: (name, data) => queue.add(name, data).then(() => undefined) },
        makeWeaponKills(drizzle, read),
      );

      yield* Effect.logInfo("Battlelog application initialized").pipe(
        Effect.annotateLogs({
          deploymentIdentity: config.serviceName,
          serviceNamespace: config.serviceNamespace,
        }),
      );

      return BattlelogApplication.of({
        operations,
        port: config.port,
        cleanupSecret: config.cleanupSecret,
      });
    }),
  ).pipe(
    Layer.provide(PgClientLive),
    Layer.provide(
      Layer.unwrap(
        Effect.map(BattlelogConfig, (config) =>
          reconnectingBunRedisLayer({ url: Redacted.value(config.redisUrl) }),
        ),
      ),
    ),
    Layer.provide(BattlelogConfig.layer),
  );
}
