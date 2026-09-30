import { makeUserFeed } from "#src/feed/user-feed";
import { makeGuildKillActivityPublisher } from "#src/kills/guild-kill-activity";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { makeGuildKillQueries } from "#src/kills/guild-kill-queries";
import { makeKillCreation } from "#src/kills/kill-creation";
import type { KillQueryCache } from "#src/kills/kill-query-support";
import { makeKillStatsPersistence } from "#src/kills/kill-stats-persistence";
import { makeMemberKillQuery } from "#src/kills/member-kill-query";
import { makeUserKillQueries } from "#src/kills/user-kill-queries";
import { ExecutionError, RedlockService } from "#src/redis/redlock";
import { makeLootAllocationPersistence } from "#src/loots/allocation/loot-allocation-persistence";
import { makeLootAllocationOperations } from "#src/loots/allocation/loot-allocation.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import { makeLootPublicationDispatcher } from "#src/loots/submission/loot-publication-outbox";
import { makeLootPublicationWorker } from "#src/loots/submission/loot-publication-worker";
import { makeLootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import {
  makeLootsOperations,
  type LootsOperations,
} from "#src/loots/loots.operations";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { applicationLogger } from "#src/shared/application-logger";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import { RabbitMessaging } from "@lootlog/messaging";
import { Context, Effect, Layer } from "effect";
import { recordsDataLayer } from "#src/http-api/handlers/records/records.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

interface RecordsServicesValue {
  readonly layer: ReturnType<typeof recordsDataLayer>;
  readonly loots: LootsOperations;
  readonly runLootPublications: Effect.Effect<never>;
}

export class RecordsServices extends Context.Service<
  RecordsServices,
  RecordsServicesValue
>()("@lootlog/api/http-api/RecordsServices") {}

export const recordsServicesLive = Layer.effect(
  RecordsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const lootStats = new LootStatsService(database, redis);
    const redlock = new RedlockService(redis).createInstance();

    const dispatchLootPublications = makeLootPublicationDispatcher(
      database,
      rabbit,
      (organizationIds) =>
        Effect.all(
          organizationIds.map((guildId) =>
            Effect.tryPromise({
              try: () =>
                redis.invalidateScopes(
                  `loots:list:${guildId}`,
                  `loot-stats:${guildId}`,
                ),
              catch: (error) => error,
            }),
          ),
          { concurrency: "unbounded", discard: true },
        ),
    );

    const lootPublications = yield* makeLootPublicationWorker(
      dispatchLootPublications(),
    );

    const acceptance = makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        withLock: (resource, ttlMilliseconds, options, effect) =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => redlock.acquire([resource], ttlMilliseconds, options),
              catch: (cause) => {
                if (cause instanceof ExecutionError) {
                  applicationLogger.log({
                    level: "error",
                    message: "Lock acquisition failed for createLoot",
                    resource,
                  });

                  return new DependencyUnavailableError(
                    "Failed to acquire loot lock",
                  );
                }

                return cause;
              },
            }),
            () => effect,
            (heldLock) =>
              Effect.tryPromise(() => heldLock.release()).pipe(Effect.ignore),
          ),
      },
      lootPublications.signal,
    );

    const loots = makeLootsOperations({
      persistence: makeLootPersistence(database),
      query: makeLootQueryOperations(makeLootQueryPersistence(database)),
      stats: lootStats,
      redis,
      logger: applicationLogger,
    });

    const killStatsPersistence = makeKillStatsPersistence(database);

    const killQueryCache: KillQueryCache = {
      getOrSet: (key, schema, factory, ttlSeconds, scopes) =>
        redis.getOrSetJsonEffect({
          key,
          scopes,
          codec: makeJsonCodec(schema),
          factory,
          ttlSeconds,
          onError: (error) =>
            applicationLogger.warn("Kill statistics cache unavailable", error),
        }),
    };

    return {
      runLootPublications: lootPublications.run,
      loots,
      layer: recordsDataLayer({
        userFeed: makeUserFeed(database),
        createKill: makeKillCreation(
          database,
          {
            invalidateScopes: (...scopes) =>
              Effect.tryPromise({
                try: () => redis.invalidateScopes(...scopes),
                catch: (error) => error,
              }),
            deleteIfValue: (key, value) =>
              Effect.tryPromise({
                try: () => redis.deleteIfValue(key, value),
                catch: (error) => error,
              }),
            setNx: (key, value, ttlSeconds) =>
              Effect.tryPromise({
                try: () => redis.setNX(key, value, ttlSeconds),
                catch: (error) => error,
              }),
          },
          applicationLogger,
          makeGuildKillActivityPublisher(database, rabbit),
        ),
        guildKillQueries: makeGuildKillQueries(
          killStatsPersistence,
          killQueryCache,
          applicationLogger,
        ),
        memberKillQuery: makeMemberKillQuery(
          killStatsPersistence,
          killQueryCache,
          applicationLogger,
        ),
        userKillQueries: makeUserKillQueries(
          database,
          killQueryCache,
          applicationLogger,
        ),
        loots,
        lootStats,
        lootSubmissionAcceptance: acceptance,
        lootAllocation: makeLootAllocationOperations({
          persistence: makeLootAllocationPersistence(database),
          cache: {
            invalidateScopes: (...scopes) =>
              Effect.tryPromise({
                try: () => redis.invalidateScopes(...scopes),
                catch: (error) => error,
              }),
          },
          publisher: {
            publish: (exchange, routingKey, event) =>
              rabbit
                .publish({
                  exchange: exchange,
                  routingKey: routingKey,
                  content: new TextEncoder().encode(JSON.stringify(event)),
                })
                .pipe(Effect.asVoid),
          },
          logger: applicationLogger,
        }),
      }),
    };
  }),
);

export const recordsData = Layer.unwrap(
  Effect.map(RecordsServices, ({ layer }) => layer),
);
