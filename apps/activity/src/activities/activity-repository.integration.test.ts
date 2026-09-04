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

  it("paginates by creation time across mixed identifier formats", async () => {
    await pool.query(
      `INSERT INTO "Activity" ("id", "userId", "guildId", "discordId", "type", "createdAt", "source", "idempotencyKey") VALUES
        ('zzzzzzzzzzzzzzzzzzzzzzzzz', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:03:00Z', 'WEB_APP', 'pagination-newest'),
        ('yyyyyyyyyyyyyyyyyyyyyyyyy', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:02:00Z', 'WEB_APP', 'pagination-same-time'),
        ('10000000-0000-4000-8000-000000000000', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:02:00Z', 'WEB_APP', 'pagination-middle'),
        ('xxxxxxxxxxxxxxxxxxxxxxxxx', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:01:00Z', 'WEB_APP', 'pagination-oldest')`,
    );
    const repositoryLayer = ActivityRepository.layer.pipe(
      Layer.provide(
        ActivityDatabase.layer.pipe(
          Layer.provide(
            PgClient.layer({
              url: Redacted.make(postgres.getConnectionUri()),
            }),
          ),
        ),
      ),
    );

    const [firstPage, secondPage] = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* ActivityRepository;
        const first = yield* repository.findMany({
          guildId: "guild-pagination",
          limit: 2,
        });
        const second = yield* repository.findMany({
          guildId: "guild-pagination",
          cursor: first.nextCursor,
          limit: 2,
        });
        return [first, second] as const;
      }).pipe(Effect.provide(repositoryLayer)),
    );

    expect(firstPage.data).toEqual([
      expect.objectContaining({ id: "zzzzzzzzzzzzzzzzzzzzzzzzz" }),
      expect.objectContaining({ id: "yyyyyyyyyyyyyyyyyyyyyyyyy" }),
    ]);
    expect(secondPage.data).toEqual([
      expect.objectContaining({ id: "10000000-0000-4000-8000-000000000000" }),
      expect.objectContaining({ id: "xxxxxxxxxxxxxxxxxxxxxxxxx" }),
    ]);
  });
});
