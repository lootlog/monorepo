import type { JsonCodec } from "@lootlog/database/redis-cache-fill";
import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { fileURLToPath } from "node:url";
import { relations } from "#src/database/relations";
import {
  unusedBattleAnalytics,
  unusedBattleMetadata,
  unusedDeleteQueue,
  unusedWeaponKills,
} from "../../../test/battle-fixtures.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  mock,
} from "bun:test";
import { sql } from "drizzle-orm";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Redis } from "effect/persistence";
import { ConnectionError, SqlError } from "effect/sql/SqlError";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import {
  battleLegacyIds,
  battles,
  battleSubmissions,
  battleTimelines,
  battleWarriorFilters,
  battleWarriors,
} from "#src/database/schema";
import { decodeBattleEvents } from "#src/battles/battle-timeline";
import { makeBattlelogOperations } from "#src/battles/battlelog-operations";
import { makeBattles, type Battles } from "#src/battles/battles.service";
import { makeBattlelogTestBoundary } from "../../../test/battlelog-test-boundary.js";

export type TestApplication = ReturnType<typeof makeBattlelogTestBoundary> & {
  battles: Battles;
};

export const requestJson = async <S extends Schema.ConstraintDecoder<unknown>>(
  handler: TestApplication["handler"],
  method: "GET" | "POST",
  path: string,
  schema: S,
  expectedStatus: number,
  body?: Schema.Json,
  userId = "user-1",
) => {
  const response = await handler(
    new Request(`http://battlelog.test${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...authHeaders,
        "x-auth-user-id": userId,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    }),
  );

  expect(response.status).toBe(expectedStatus);

  const text = await response.text();

  return {
    body: Schema.decodeUnknownSync(schema)(
      text === "" ? undefined : JSON.parse(text),
    ),
  };
};

export const postBattle = (
  handler: TestApplication["handler"],
  body: Schema.Json,
  userId = "user-1",
) =>
  requestJson(
    handler,
    "POST",
    "/battles",
    Schema.Struct({ battleId: Schema.String }),
    201,
    body,
    userId,
  );

export const getBattle = (handler: TestApplication["handler"], path: string) =>
  requestJson(handler, "GET", path, BattleResponseSchemas.battle, 200);

export const warriors = {
  "220": {
    icon: "cashtelan.gif",
    lvl: 300,
    name: "cashtelan",
    originalId: 220,
    prof: "p",
    team: 1,
  },
  "7533": {
    icon: "keukta.gif",
    lvl: 300,
    name: "keukta",
    originalId: 7533,
    prof: "w",
    team: 2,
  },
};

export const moves = [
  ...Array.from(
    { length: 12 },
    (_, index) => `220=100;7533=90;+dmg=${index + 1};-dmg=${index + 1}`,
  ),
  "0;0;winner=cashtelan",
  "0;0;loser=keukta",
];

export const battleEvent = {
  ev: 1_785_091_976.6,
  f: { endBattle: 1, init: "1", m: moves, w: warriors },
};

export const incrementalBattleEvents: Schema.Json[] = [
  {
    ev: 1_785_091_976.6,
    f: { init: "1", m: moves.slice(0, 6), w: warriors },
  },
  {
    ev: 1_785_091_976.9,
    f: { endBattle: 1, m: moves.slice(6) },
  },
];

export const battleContext = {
  accountId: "account-1",
  characterId: "220",
  world: "luvia",
};

export const authHeaders = {
  "x-auth-discord-id": "discord-1",
  "x-auth-user-id": "user-1",
};

const makeDatabaseRuntime = () => ManagedRuntime.make(PgliteClient.layer({}));

export let databaseRuntime: ReturnType<typeof makeDatabaseRuntime>;

const databaseEffect = makeWithDefaults({ relations });

export let sharedDatabase: Effect.Success<typeof databaseEffect>;

export const ageStoredBattles = async () => {
  await databaseRuntime.runPromise(
    sharedDatabase.execute(sql`
      WITH moved AS (
        SELECT id AS "oldId", ('00000000' || substr(replace(id::text, '-', ''), 9))::uuid AS "newId"
        FROM battles
      ), warriors AS (
        UPDATE battle_warriors SET "battleId" = moved."newId"
        FROM moved WHERE battle_warriors."battleId" = moved."oldId"
      ), timelines AS (
        UPDATE battle_timelines SET "battleId" = moved."newId"
        FROM moved WHERE battle_timelines."battleId" = moved."oldId"
      ), submissions AS (
        UPDATE battle_submissions SET "battleId" = moved."newId"
        FROM moved WHERE battle_submissions."battleId" = moved."oldId"
      )
      UPDATE battles SET id = moved."newId", "createdAt" = battle_id_created_at(moved."newId")
      FROM moved WHERE battles.id = moved."oldId"
    `),
  );
};

const clearBattleTables = async () => {
  for (const table of [
    battles,
    battleWarriors,
    battleWarriorFilters,
    battleTimelines,
    battleSubmissions,
    battleLegacyIds,
  ]) {
    await databaseRuntime.runPromise(sharedDatabase.delete(table));
  }
};

export const storedTimelines = async () =>
  new Map(
    (
      await databaseRuntime.runPromise(
        sharedDatabase.select().from(battleTimelines),
      )
    ).map((timeline) => [
      timeline.battleId,
      decodeBattleEvents(timeline.events),
    ]),
  );

export const storedBattleIds = async () =>
  (
    await databaseRuntime.runPromise(
      sharedDatabase.select({ id: battles.id }).from(battles),
    )
  ).map((battle) => battle.id);

const createDatabaseBoundary = ({
  beforeTransaction,
}: { beforeTransaction?: (() => Promise<void>) | undefined } = {}) => {
  const database = sharedDatabase;
  let transactionCount = 0;

  type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

  const transaction = <A, E, R>(
    factory: (transaction: Transaction) => Effect.Effect<A, E, R>,
  ) =>
    Effect.gen(function* () {
      transactionCount += 1;

      if (beforeTransaction)
        yield* Effect.tryPromise({
          try: beforeTransaction,
          catch: (cause) =>
            new SqlError({ reason: new ConnectionError({ cause }) }),
        });

      return yield* database.transaction(factory);
    });

  return {
    service: {
      db: {
        query: database.query,
        select: database.select.bind(database),
        delete: database.delete.bind(database),
        update: database.update.bind(database),
        transaction,
      },
    },
    getStoredBattles: () =>
      databaseRuntime.runPromise(
        database.query.battles.findMany({ with: { warriors: true } }),
      ),
    getTransactionCount: () => transactionCount,
  };
};

export const createRedisBoundary = ({
  now = Date.now,
  onRenew = () => {},
  onContention = () => {},
}: {
  now?: () => number;
  onRenew?: () => void;
  onContention?: () => void;
} = {}) => {
  const values = new Map<string, { expiresAt: number | null; value: string }>();
  const locks = new Map<string, { expiresAt: number | null; token: string }>();

  const boundary = {
    del: mock(async (key: string) => (values.delete(key) ? 1 : 0)),
    eval: mock(
      async (_script: string, keys: string[], args: Array<string | number>) => {
        const [key] = keys;
        const [token, ttlSeconds] = args;
        const lock = key ? locks.get(key) : undefined;

        if (
          key &&
          lock &&
          lock.token === token &&
          (lock.expiresAt === null || lock.expiresAt > now())
        ) {
          if (ttlSeconds !== undefined) {
            lock.expiresAt = now() + Number(ttlSeconds) * 1_000;
            onRenew();

            return 1;
          }

          locks.delete(key);

          return 1;
        }

        return 0;
      },
    ),
    readCachedJson: mock(async (key: string) => {
      const cached = values.get(key);

      if (!cached) return null;

      if (cached.expiresAt !== null && cached.expiresAt <= now()) {
        values.delete(key);

        return null;
      }

      return cached.value;
    }),
    acquireLock: mock(
      async (key: string, token: string, ttlSeconds?: number) => {
        const existingLock = locks.get(key);

        if (
          existingLock &&
          (existingLock.expiresAt === null || existingLock.expiresAt > now())
        ) {
          onContention();

          return false;
        }

        locks.set(key, {
          expiresAt: ttlSeconds ? now() + ttlSeconds * 1_000 : null,
          token,
        });

        return true;
      },
    ),
  };

  const fromPromise = <A>(run: () => Promise<A>) =>
    Effect.tryPromise({
      try: run,
      catch: (cause) => new Redis.RedisError({ cause }),
    });

  return {
    ...boundary,
    getJson: <T>(key: string, codec: Pick<JsonCodec<T>, "parse">) =>
      fromPromise(async () => {
        const serialized = await boundary.readCachedJson(key);

        return serialized === null ? null : codec.parse(serialized);
      }),
    setJson: <T>(key: string, value: T, ttlSeconds?: number) =>
      Effect.sync(() => {
        values.set(key, {
          expiresAt: ttlSeconds ? now() + ttlSeconds * 1_000 : null,
          value: JSON.stringify(value),
        });
      }),
    setNX: (key: string, token: string, ttlSeconds: number) =>
      fromPromise(() => boundary.acquireLock(key, token, ttlSeconds)),
    evalScript: <TResult>(
      script: string,
      keys: readonly string[],
      args: ReadonlyArray<string | number> = [],
    ) =>
      fromPromise(
        // SAFETY: deduplication's lock scripts all return a number.
        () => boundary.eval(script, [...keys], [...args]) as Promise<TResult>,
      ),
  };
};

export const createTestApplication = ({
  beforeTransaction,
  redis = createRedisBoundary(),
  waitTimeoutMs = 10_000,
  lockTtlSeconds = 30,
}: {
  beforeTransaction?: () => Promise<void>;
  redis?: ReturnType<typeof createRedisBoundary>;
  waitTimeoutMs?: number;
  lockTtlSeconds?: number;
} = {}) => {
  const database = createDatabaseBoundary({ beforeTransaction });
  const drizzle = database.service.db;
  const redisService = redis;

  const analyticsService = {
    ...unusedBattleAnalytics,
    invalidateAnalyticsCache: mock(() => Effect.void),
  };

  const battlesModule = makeBattles(
    drizzle,
    redisService,
    { paginateBattles: () => Effect.die("Unexpected pagination") },
    analyticsService,
    { buildFilterConditions: () => Effect.die("Unexpected list filter") },
    {
      upsertUserCharacter: mock(() => Effect.void),
      getUserCharacters: () => Effect.die("Unexpected character list"),
      searchWarriors: () => Effect.die("Unexpected warrior search"),
    },
    {
      cacheTtlSeconds: 10,
      lockRefreshIntervalMs: 10,
      lockTtlSeconds,
      waitIntervalMs: 1,
      waitTimeoutMs,
    },
  );

  const battlesService = battlesModule;

  const boundary = makeBattlelogTestBoundary(
    makeBattlelogOperations(
      battlesModule,
      analyticsService,
      unusedBattleMetadata,
      unusedDeleteQueue,
      unusedWeaponKills,
    ),
  );

  const app: TestApplication = {
    ...boundary,
    battles: battlesService,
  };

  return { app, database, analyticsService };
};

export const useBattleCreationDatabase = (
  application: () => TestApplication | undefined,
) => {
  beforeAll(async () => {
    databaseRuntime = makeDatabaseRuntime();
    sharedDatabase = await databaseRuntime.runPromise(databaseEffect);
    await databaseRuntime.runPromise(
      migrate(sharedDatabase, {
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle", import.meta.url),
        ),
      }),
    );
  }, 60_000);

  beforeEach(clearBattleTables);

  afterAll(async () => {
    await databaseRuntime.dispose();
  });

  afterEach(async () => {
    try {
      await application()?.dispose();
    } finally {
      mock.restore();
    }
  });
};
