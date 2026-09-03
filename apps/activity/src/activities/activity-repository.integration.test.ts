import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PgClient } from "@effect/sql-pg";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Effect, Layer, Redacted } from "effect";
import pg from "pg";
import { ActivityDatabase } from "#src/database/database";
import { ActivitySource, ActivityType } from "#src/database/schema";
import { ActivityRepository } from "./activity-repository.js";

const baselinePath = fileURLToPath(
  new URL(
    "../../drizzle/migrations/0000_activity_legacy_baseline.sql",
    import.meta.url,
  ),
);

describe("ActivityRepository", () => {
  let postgres: StartedPostgreSqlContainer;
  let pool: pg.Pool;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer(
      "timescale/timescaledb:latest-pg17",
    )
      .withDatabase("activity_repository")
      .withUsername("lootlog")
      .withPassword("lootlog")
      .withStartupTimeout(60_000)
      .start();
    pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });
    await pool.query(await fs.readFile(baselinePath, "utf8"));
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await postgres.stop();
  });

  it("persists a redelivered activity exactly once", async () => {
    const databaseLayer = ActivityDatabase.layer.pipe(
      Layer.provide(
        PgClient.layer({ url: Redacted.make(postgres.getConnectionUri()) }),
      ),
    );
    const repositoryLayer = ActivityRepository.layer.pipe(
      Layer.provide(databaseLayer),
    );
    const activity = {
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.CONNECT_EVENT,
      source: ActivitySource.WEB_APP,
      details: { sessionId: "session-1" },
      idempotencyKey: "redelivered-activity-1",
    } as const;

    const [first, second] = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* ActivityRepository;
        return yield* Effect.all(
          [repository.create(activity), repository.create(activity)],
          { concurrency: "unbounded" },
        );
      }).pipe(Effect.provide(repositoryLayer)),
    );

    expect(second).toEqual(first);
    expect(
      await pool.query(
        `SELECT COUNT(*)::int AS count FROM "Activity" WHERE "idempotencyKey" = $1`,
        [activity.idempotencyKey],
      ),
    ).toMatchObject({ rows: [{ count: 1 }] });
  });
});
