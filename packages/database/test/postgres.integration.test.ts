import { afterAll, beforeAll, expect, test } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  bigint,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { Effect, ManagedRuntime, Redacted } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { makePostgresLayer, PostgresPool } from "../src/postgres.js";

const records = pgTable("database_contract", {
  id: integer().primaryKey(),
  createdAt: timestamp({ withTimezone: true }).notNull(),
  payload: jsonb().notNull(),
  amount: numeric().notNull(),
  large: bigint({ mode: "bigint" }).notNull(),
});

let postgres: StartedPostgreSqlContainer;
beforeAll(async () => {
  postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
}, 60_000);
afterAll(async () => {
  await postgres?.stop();
});

test("preserves required TLS without falling back to an unencrypted connection", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      url: Redacted.make(postgres.getConnectionUri()),
      ssl: true,
    }),
  );
  try {
    await expect(runtime.runPromise(PostgresPool)).rejects.toMatchObject({
      _tag: "SqlError",
      reason: {
        cause: { message: "The server does not support SSL connections" },
      },
    });
  } finally {
    await runtime.dispose();
  }
});

test("shares one pool, preserves Drizzle codecs and transactions, and closes the pool", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      url: Redacted.make(postgres.getConnectionUri()),
      applicationName: "lootlog-database-test",
      maxConnections: 1,
    }),
  );
  const pool = await runtime.runPromise(PostgresPool);
  try {
    const db = await runtime.runPromise(makeWithDefaults());
    const promiseDb = drizzle({ client: pool });
    const client = await runtime.runPromise(PgClient.PgClient);
    expect(await runtime.runPromise(SqlClient.SqlClient)).toBe(client);
    const rawIdentity = await pool.query(
      "SELECT pg_backend_pid() AS pid, current_setting('application_name') AS application",
    );
    expect(
      await runtime.runPromise(
        client`SELECT pg_backend_pid() AS pid, current_setting('application_name') AS application`,
      ),
    ).toEqual(rawIdentity.rows);
    expect(rawIdentity.rows[0].application).toBe("lootlog-database-test");
    await pool.query(`CREATE TABLE database_contract (
      id integer PRIMARY KEY, "createdAt" timestamptz NOT NULL,
      payload jsonb NOT NULL, amount numeric NOT NULL, large bigint NOT NULL
    )`);
    const record = {
      id: 1,
      createdAt: new Date("2026-09-04T10:11:12.345Z"),
      payload: { nested: ["zażółć", null, true, 42] },
      amount: "1234567890.123456789",
      large: 9007199254740993n,
    };
    await promiseDb.transaction((tx) => tx.insert(records).values(record));
    expect(await runtime.runPromise(db.select().from(records))).toEqual([
      record,
    ]);
    await runtime.runPromise(
      db.transaction((tx) => tx.insert(records).values({ ...record, id: 2 })),
    );
    expect(
      await promiseDb.select().from(records).where(eq(records.id, 2)),
    ).toEqual([{ ...record, id: 2 }]);
    await expect(
      runtime.runPromise(
        db.transaction((tx) =>
          Effect.gen(function* () {
            yield* tx.insert(records).values({ ...record, id: 3 });
            return yield* Effect.fail(new Error("rollback-effect"));
          }),
        ),
      ),
    ).rejects.toThrow("rollback-effect");
    await expect(
      promiseDb.transaction(async (tx) => {
        await tx.insert(records).values({ ...record, id: 4 });
        throw new Error("rollback-promise");
      }),
    ).rejects.toThrow("rollback-promise");
    expect(
      await runtime.runPromise(
        db.select({ id: records.id }).from(records).orderBy(records.id),
      ),
    ).toEqual([{ id: 1 }, { id: 2 }]);
    expect(pool.totalCount).toBe(1);
  } finally {
    await runtime.dispose();
  }
  expect(pool.ended).toBe(true);
  expect(pool.totalCount).toBe(0);
}, 30_000);
