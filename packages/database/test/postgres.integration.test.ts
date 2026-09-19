import { afterAll, beforeAll, expect, test } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import {
  bigint,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { Effect, ManagedRuntime, Predicate, Redacted } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { makePostgresLayer } from "../src/postgres.js";

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
    const error: unknown = await runtime.runPromise(PgClient.PgClient).then(
      () => undefined,
      (cause: unknown) => cause,
    );

    expect(Predicate.isTagged("SqlError")(error)).toBe(true);
    expect(error).toMatchObject({
      message: "PgConnection: Server refused TLS",
    });
  } finally {
    await runtime.dispose();
  }
});

test("preserves native Drizzle codecs and rolls back failed transactions", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      url: Redacted.make(postgres.getConnectionUri()),
      applicationName: "lootlog-database-test",
      maxConnections: 1,
    }),
  );

  try {
    const db = await runtime.runPromise(makeWithDefaults());
    const client = await runtime.runPromise(PgClient.PgClient);
    expect(await runtime.runPromise(SqlClient.SqlClient)).toBe(client);

    const identity = await runtime.runPromise(
      client`SELECT current_setting('application_name') AS application`,
    );

    expect(identity[0]?.application).toBe("lootlog-database-test");
    await runtime.runPromise(client`CREATE TABLE database_contract (
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

    await runtime.runPromise(
      db.transaction((tx) => tx.insert(records).values(record)),
    );
    expect(await runtime.runPromise(db.select().from(records))).toEqual([
      record,
    ]);
    await runtime.runPromise(
      db.transaction((tx) => tx.insert(records).values({ ...record, id: 2 })),
    );
    expect(
      await runtime.runPromise(
        db.select().from(records).where(eq(records.id, 2)),
      ),
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
    expect(
      await runtime.runPromise(
        db.select({ id: records.id }).from(records).orderBy(records.id),
      ),
    ).toEqual([{ id: 1 }, { id: 2 }]);
  } finally {
    await runtime.dispose();
  }
}, 30_000);
