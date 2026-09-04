import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { makeGuildKillQueries } from "#src/kills/guild-kill-queries";
import { makeKillCreation } from "#src/kills/kill-creation";
import { makeKillStatsPersistence } from "#src/kills/kill-stats-persistence";
import { makeMemberKillQuery } from "#src/kills/member-kill-query";
import { makeUserKillQueries } from "#src/kills/user-kill-queries";
import { ExecutionError, RedlockService } from "#src/redis/redlock";
import { makeLootAllocationPersistence } from "#src/loots/allocation/loot-allocation-persistence";
import { makeLootAllocationOperations } from "#src/loots/allocation/loot-allocation.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import { makeLootPublicationDispatcher } from "#src/loots/submission/loot-publication-outbox";
import { makeLootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import {
  makeLootsOperations,
  type LootsOperations,
} from "#src/loots/loots.operations";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { makeLootStatsQuery } from "#src/loots/query/loot-stats-query";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { applicationLogger } from "#src/shared/application-logger";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import { PgClient } from "@effect/sql-pg";
import { RabbitMessaging } from "@lootlog/messaging";
import { Context, Effect, Layer } from "effect";
import { recordsDataLayer } from "#src/http-api/handlers/records/records.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

interface RecordsServicesValue {
  readonly layer: ReturnType<typeof recordsDataLayer>;
  readonly loots: LootsOperations;
  readonly dispatchLootPublications: ReturnType<
    typeof makeLootPublicationDispatcher
  >;
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
    const postgres = yield* PgClient.PgClient;
    const lootStats = new LootStatsService(makeLootStatsQuery(postgres), redis);
    const redlock = new RedlockService(redis).createInstance();
    const dispatchLootPublications = makeLootPublicationDispatcher(
      database,
      rabbit,
      (organizationIds) =>
        Effect.all(
          organizationIds.flatMap((guildId) =>
            [`loots:list:${guildId}:*`, `loot-stats:${guildId}:*`].map(
              (pattern) =>
                Effect.tryPromise({
                  try: () => redis.deleteByPattern(pattern),
                  catch: (error) => error,
                }),
            ),
          ),
          { concurrency: "unbounded", discard: true },
        ),
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
              Effect.tryPromise(() =>
                (
                  heldLock as Awaited<ReturnType<typeof redlock.acquire>>
                ).release(),
              ).pipe(Effect.ignore),
          ),
      },
    );
    const loots = makeLootsOperations({
      persistence: makeLootPersistence(database),
      query: makeLootQueryOperations(makeLootQueryPersistence(database)),
      stats: lootStats,
      redis,
      logger: applicationLogger,
    });
    const killStatsPersistence = makeKillStatsPersistence(database);
    const killQueryCache = {
      get: (key, schema) =>
        Effect.tryPromise({
          try: () => redis.getJson(key, makeJsonCodec(schema)),
          catch: (error) => error,
        }),
      set: <A>(key: string, value: A, ttlSeconds: number) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttlSeconds),
          catch: (error) => error,
        }),
    };
    return {
      dispatchLootPublications,
      loots,
      layer: recordsDataLayer({
        createKill: makeKillCreation(
          database,
          {
            deleteByPattern: (pattern) =>
              Effect.tryPromise({
                try: () => redis.deleteByPattern(pattern),
                catch: (error) => error,
              }),
            setNx: (key, value, ttlSeconds) =>
              Effect.tryPromise({
                try: () => redis.setNX(key, value, ttlSeconds),
                catch: (error) => error,
              }),
          },
          applicationLogger,
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
            deleteByPattern: (pattern) =>
              Effect.tryPromise({
                try: () => redis.deleteByPattern(pattern),
                catch: (error) => error,
              }),
          },
          publisher: {
            publish: (exchange, routingKey, event) =>
              rabbit
                .publish({
                  exchange: exchange as "default",
                  routingKey: routingKey as Parameters<
                    typeof rabbit.publish
                  >[0]["routingKey"],
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
