import { afterAll, beforeAll, expect, test } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { Cause, Effect, ManagedRuntime, Redacted } from "effect";
import pg from "pg";
import {
  GenericContainer,
  Network,
  type StartedNetwork,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import {
  unusedBattles,
  unusedBattleAnalytics,
  unusedDeleteQueue,
} from "../../test/battle-fixtures.js";
import { makeBattlelogOperations } from "../battles/battlelog-operations.js";
import { makeBattlelogTestBoundary } from "../http/battlelog-http.js";
import { makeBattleReadBudget } from "./battle-read-budget.js";
import { drizzleDatabaseEffect } from "./database.js";

let postgres: StartedPostgreSqlContainer;

let pgbouncer: StartedTestContainer;

let network: StartedNetwork;

beforeAll(async () => {
  network = await new Network().start();
  postgres = await new PostgreSqlContainer("postgres:17-alpine")
    .withNetwork(network)
    .withNetworkAliases("postgres")
    .start();
  pgbouncer = await new GenericContainer(
    "edoburu/pgbouncer@sha256:4c1ca296ef525f108f5d3552cc337c0c09587cf8dae7f0067fd93349e47dc1cd",
  )
    .withNetwork(network)
    .withEnvironment({
      DB_HOST: "postgres",
      DB_USER: postgres.getUsername(),
      DB_PASSWORD: postgres.getPassword(),
      DB_NAME: postgres.getDatabase(),
      AUTH_TYPE: "scram-sha-256",
      POOL_MODE: "transaction",
      DEFAULT_POOL_SIZE: "1",
      MAX_DB_CONNECTIONS: "1",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage("process up:"))
    .start();
}, 60_000);

afterAll(async () => {
  await pgbouncer?.stop();
  await postgres?.stop();
  await network?.stop();
}, 60_000);

for (const connection of ["postgres", "pgbouncer"] as const) {
  test(`cancels timed out and HTTP-aborted reads through ${connection} and returns the only connection with session defaults restored`, async () => {
    const url = new URL(postgres.getConnectionUri());

    if (connection === "pgbouncer") {
      url.hostname = pgbouncer.getHost();
      url.port = String(pgbouncer.getMappedPort(5432));
    }

    const runtime = ManagedRuntime.make(
      makePostgresLayer({
        url: Redacted.make(url.toString()),
        maxConnections: 1,
      }),
    );

    const inspector = new pg.Pool({
      connectionString: postgres.getConnectionUri(),
    });

    try {
      const database = await runtime.runPromise(drizzleDatabaseEffect);
      const client = await runtime.runPromise(PgClient.PgClient);

      const budget = makeBattleReadBudget(database, {
        concurrency: 1,
        statementTimeoutMs: 100,
        timeoutMs: 1_000,
      });

      await expect(
        runtime.runPromise(budget(client`SELECT pg_sleep(30)`)),
      ).rejects.toMatchObject({
        reason: { cause: { code: "57014" } },
      });

      const assertAvailable = async () => {
        const rows = await runtime.runPromise(
          client<{
            timeout: string;
          }>`SELECT current_setting('statement_timeout') AS timeout`.pipe(
            Effect.timeout(1_000),
          ),
        );

        expect(rows).toEqual([{ timeout: "0" }]);
      };

      await assertAvailable();

      const deadlineBudget = makeBattleReadBudget(database, {
        concurrency: 1,
        statementTimeoutMs: 30_000,
        timeoutMs: 100,
      });

      await expect(
        runtime.runPromise(
          deadlineBudget(database.execute(sql`SELECT pg_sleep(30)`)),
        ),
      ).rejects.toBeInstanceOf(Cause.TimeoutError);
      await assertAvailable();

      const controller = new AbortController();

      const longBudget = makeBattleReadBudget(database, {
        concurrency: 1,
        statementTimeoutMs: 30_000,
        timeoutMs: 30_000,
      });

      const boundary = makeBattlelogTestBoundary(
        makeBattlelogOperations(
          {
            ...unusedBattles,
            getUserCharacters: () =>
              longBudget(
                database.execute(
                  sql`SELECT pg_sleep(30) /* aborted_battle_read */`,
                ),
              ).pipe(Effect.as({ characters: [] })),
          },
          unusedBattleAnalytics,
          unusedDeleteQueue,
        ),
      );

      try {
        const reading = boundary.handler(
          new Request("http://battlelog.test/battles/@me/characters", {
            headers: {
              "x-auth-user-id": "user",
              "x-auth-discord-id": "discord",
            },
            signal: controller.signal,
          }),
        );

        const activeDeadline = Date.now() + 1_000;

        try {
          while (true) {
            const active = await inspector.query(
              "SELECT 1 FROM pg_stat_activity WHERE state = 'active' AND query LIKE 'SELECT pg_sleep(30) /* aborted_battle_read */%'",
            );

            if (active.rowCount) break;

            if (Date.now() >= activeDeadline)
              throw new Error("Read never reached PostgreSQL");
            await Bun.sleep(10);
          }
        } finally {
          controller.abort();
        }

        expect((await reading).status).toBe(499);

        const orphaned = await inspector.query(
          "SELECT 1 FROM pg_stat_activity WHERE state = 'active' AND query LIKE 'SELECT pg_sleep(30) /* aborted_battle_read */%'",
        );

        expect(orphaned.rowCount).toBe(0);
        await assertAvailable();
      } finally {
        controller.abort();
        await boundary.dispose();
      }
    } finally {
      await runtime.dispose();
      await inspector.end();
    }
  }, 15_000);
}

test("keeps paged analytics on one snapshot while concurrent writes commit", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      url: Redacted.make(postgres.getConnectionUri()),
      maxConnections: 1,
    }),
  );

  const writer = new pg.Pool({ connectionString: postgres.getConnectionUri() });

  try {
    await writer.query(
      "CREATE TABLE analytics_snapshot_probe (value integer NOT NULL)",
    );
    await writer.query("INSERT INTO analytics_snapshot_probe VALUES (1)");
    const database = await runtime.runPromise(drizzleDatabaseEffect);
    const client = await runtime.runPromise(PgClient.PgClient);
    const read = makeBattleReadBudget(database);

    const values = await runtime.runPromise(
      read(
        Effect.gen(function* () {
          const before = yield* client<{
            value: number;
          }>`SELECT value FROM analytics_snapshot_probe`;

          yield* Effect.promise(() =>
            writer.query("UPDATE analytics_snapshot_probe SET value = 2"),
          );

          const after = yield* client<{
            value: number;
          }>`SELECT value FROM analytics_snapshot_probe`;

          return { before, after };
        }),
        { consistentSnapshot: true },
      ),
    );

    expect(values).toEqual({ before: [{ value: 1 }], after: [{ value: 1 }] });
    expect(
      await runtime.runPromise(
        client<{ value: number }>`SELECT value FROM analytics_snapshot_probe`,
      ),
    ).toEqual([{ value: 2 }]);
    expect(
      await runtime.runPromise(
        client<{
          isolation: string;
        }>`SELECT current_setting('transaction_isolation') AS isolation`,
      ),
    ).toEqual([{ isolation: "read committed" }]);
  } finally {
    await runtime.dispose();
    await writer.end();
  }
});
