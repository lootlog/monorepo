import { makeBattleAnalyticsRead } from "#src/battles/analytics/battle-analytics-read.service";
import { makeBattleCombatProfileRead } from "#src/battles/analytics/battle-combat-profile-read.service";
import { afterAll, beforeAll, beforeEach } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { Redis } from "effect/persistence";
import pg from "pg";
import { drizzleDatabaseEffect } from "#src/database/database";
import { makeBattleReadBudget } from "#src/database/battle-read-budget";
import { migrateBattlelogDatabase } from "#src/database/migrate";
import { makeRedisStore } from "#src/infrastructure/redis-store";
import { makeBattles } from "#src/battles/battles.service";
import { makeBattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import { makeBattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import { makeBattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { makeBattlePagination } from "#src/battles/analytics/pagination.service";
import { makeBattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import { makeBattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import {
  createBattleSemanticFingerprint,
  normalizeBattleSubmission,
} from "./battle-submission.js";
import type { CreateBattleInput } from "./create-battle.js";

export const data: CreateBattleInput = {
  accountId: "account-1",
  characterId: "220",
  world: "luvia",
  events: [
    {
      ev: 1_785_091_976.6,
      f: {
        endBattle: 1,
        init: "1",
        m: [
          "220=100;7533=90;+dmg=10;-dmg=10",
          "0;0;winner=first",
          "0;0;loser=second",
        ],
        w: {
          "220": {
            icon: "first.gif",
            lvl: 300,
            name: "first",
            originalId: 220,
            prof: "p",
            team: 1,
          },
          "7533": {
            icon: "second.gif",
            lvl: 300,
            name: "second",
            originalId: 7533,
            prof: "w",
            team: 2,
          },
        },
      },
    },
  ],
};

export const userId = "lock-owner";

export const lockKey = `battle-submission:${createBattleSemanticFingerprint({ data: normalizeBattleSubmission(data), userId })}:lock`;

let postgres: StartedPostgreSqlContainer;

let redisContainer: StartedTestContainer;

const createServices = () =>
  integration.runtime.runPromise(
    Effect.gen(function* () {
      const database = yield* drizzleDatabaseEffect;
      const redisApi = yield* Redis.Redis;

      const redis = makeRedisStore(redisApi);

      const cache = makeBattleAnalyticsCache(redis);
      const read = makeBattleReadBudget(database);

      const queryModule = makeBattleAnalyticsQuery(database);

      const analytics = makeBattleAnalytics(
        makeBattleAnalyticsRead(database, queryModule),
        makeBattleCombatProfileRead(database, queryModule),
        cache,
        queryModule,
        (operation) => read(operation, { consistentSnapshot: true }),
      );

      const battles = makeBattles(
        database,
        redis,
        makeBattlePagination(database, read),
        analytics,
        makeBattleListFilter(database),
        makeBattleMetadata(database, redis, read),
        {
          cacheTtlSeconds: 10,
          lockTtlSeconds: 1,
          lockRefreshIntervalMs: 100,
          waitIntervalMs: 20,
          waitTimeoutMs: 5_000,
        },
      );

      return {
        battles,
        redis,
        redisApi,
        cache,
        analytics,
        metadata: makeBattleMetadata(database, redis, read),
      };
    }),
  );

type BattleRedisIntegration = {
  pool: pg.Pool;
  runtime: ManagedRuntime.ManagedRuntime<
    PgClient.PgClient | Redis.Redis,
    unknown
  >;
  services: Awaited<ReturnType<typeof createServices>>;
};

// SAFETY: useBattleRedisIntegration's beforeAll fills every field before a test reads it.
export const integration = {} as BattleRedisIntegration;

export const useBattleRedisIntegration = () => {
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer(
      "timescale/timescaledb:2.32.0-pg18",
    ).start();
    redisContainer = await new GenericContainer("redis:7.4-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
    integration.pool = new pg.Pool({
      connectionString: postgres.getConnectionUri(),
    });
    integration.runtime = ManagedRuntime.make(
      Layer.merge(
        makePostgresLayer({ url: Redacted.make(postgres.getConnectionUri()) }),
        BunRedis.layer({
          url: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`,
        }),
      ),
    );
    await integration.runtime.runPromise(migrateBattlelogDatabase);
    integration.services = await createServices();
  }, 60_000);

  afterAll(async () => {
    await integration.runtime?.dispose();
    await integration.pool?.end();
    await Promise.all([redisContainer?.stop(), postgres?.stop()]);
  }, 60_000);

  beforeEach(async () => {
    await integration.pool.query(
      "TRUNCATE battles, battle_warriors, battle_warrior_filters, battle_timelines, battle_submissions, battle_legacy_ids, user_characters",
    );
    await integration.runtime.runPromise(
      integration.services.redisApi.send("FLUSHDB"),
    );
  });
};

export const waitForLock = async () => {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    const token = await integration.runtime.runPromise(
      integration.services.redis.get(lockKey),
    );

    if (token !== null) return token;
    await Bun.sleep(10);
  }

  throw new Error("Battle creation did not acquire its Redis lock");
};
