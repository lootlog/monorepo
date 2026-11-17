import { getOrSetStaleJson } from "#src/redis/stale-json-cache";
import { getLootListCacheScope } from "#src/shared/cache";
import { makeUserFeed } from "#src/users/user-feed";
import { makeUserLootStats } from "#src/loots/query/user-loot-stats";
import { makeGuildKillActivityPublisher } from "#src/kills/guild-kill-activity";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { makeGuildKillQueries } from "#src/kills/guild-kill-queries";
import { makeKillCreation } from "#src/kills/kill-creation";
import type { KillQueryCache } from "#src/kills/kill-query-support";
import { makeKillStatsPersistence } from "#src/kills/kill-stats.repository";
import { makeMemberKillQuery } from "#src/kills/member-kill-query";
import { makeUserKillQueries } from "#src/kills/user-kill-queries";
import { RedlockService } from "#src/redis/redlock";
import { makeLootAllocationPersistence } from "#src/loots/allocation/loot-allocation.repository";
import { makeLootAllocationOperations } from "#src/loots/allocation/loot-allocation.operations";
import { makeLootPersistence } from "#src/loots/loot.repository";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import {
  makeLootPublicationDispatcher,
  makeLootSnapshotReader,
} from "#src/loots/submission/loot-publication-outbox";
import { makeOutboxWorker } from "#src/shared/outbox-worker";
import { makeLootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import {
  makeLootsOperations,
  type LootsOperations,
} from "#src/loots/loots.operations";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { applicationLogger } from "#src/shared/application-logger";
import { DependencyUnavailableError } from "#src/shared/http/http-errors";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";
import { recordsDataLayer } from "#src/http-api/access/records.data-layer";
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
    const locks = new RedlockService(redis).createInstance();

    const lootQuery = makeLootQueryOperations(
      makeLootQueryPersistence(database),
    );

    const dispatchLootPublications = makeLootPublicationDispatcher(
      database,
      rabbit,
      (organizationIds) =>
        Effect.forEach(
          organizationIds,
          (guildId) =>
            redis.effect.invalidateScopes(getLootListCacheScope(guildId)),
          { concurrency: "unbounded", discard: true },
        ),
      makeLootSnapshotReader(lootQuery),
    );

    const lootPublications = yield* makeOutboxWorker(
      "Loot publication",
      dispatchLootPublications(),
    );

    const acceptance = makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        withLock: (resource, ttlMilliseconds, options, effect) =>
          locks.withLock(
            resource,
            ttlMilliseconds,
            effect,
            () => {
              applicationLogger.log({
                level: "error",
                message: "Lock acquisition failed for createLoot",
                resource,
              });

              return new DependencyUnavailableError(
                "Failed to acquire loot lock",
              );
            },
            options,
          ),
      },
      lootPublications.signal,
    );

    const loots = makeLootsOperations({
      persistence: makeLootPersistence(database),
      query: lootQuery,
      redis,
      logger: applicationLogger,
    });

    const killStatsPersistence = makeKillStatsPersistence(database);

    const killQueryCache: KillQueryCache = {
      getOrSet: (key, schema, factory, ttlSeconds, scopes) =>
        redis.effect.getOrSetJson({
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
        userLootStats: makeUserLootStats(database),
        createKill: makeKillCreation(
          database,
          {
            invalidateScopes: redis.effect.invalidateScopes,
            deleteIfValue: redis.effect.deleteIfValue,
            setNx: redis.effect.setNX,
            setNxGet: redis.effect.setNxGet,
          },
          applicationLogger,
          makeGuildKillActivityPublisher(database, rabbit),
          (recipientUserId) =>
            rabbit
              .publish(
                eventMessage(RabbitRoutingKey.USERS_KILL_STATS_CHANGED, {
                  recipientUserId,
                }),
              )
              .pipe(
                Effect.asVoid,
                Effect.catch(() =>
                  Effect.logWarning(
                    "Personal kill statistics refresh hint failed",
                  ),
                ),
              ),
        ),
        guildKillQueries: makeGuildKillQueries(killStatsPersistence, {
          getOrSetStale: (key, schema, load, freshSeconds) =>
            getOrSetStaleJson(redis, {
              key,
              schema,
              freshSeconds,
              retainSeconds: 24 * 3_600,
              factory: load,
              onError: (error) =>
                applicationLogger.warn(
                  "Kill statistics cache unavailable",
                  error,
                ),
            }),
        }),
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
          cache: redis.effect,
          publisher: {
            publish: (event) =>
              rabbit.publish(
                eventMessage(RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE, event),
              ),
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
