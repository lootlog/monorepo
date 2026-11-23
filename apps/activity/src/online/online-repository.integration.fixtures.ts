import { makePostgresLayer } from "@lootlog/database";
import { migrationClient } from "@lootlog/database/migration";
import type { UserOnlineCheckpointV1 } from "@lootlog/protocol/rabbit/events";
import { PgClient } from "@effect/sql-pg";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Effect, Layer, Redacted } from "effect";
import { TestClock } from "effect/testing";
import { upsertOnlineDays } from "./online-days.js";
import { OnlineRepository } from "./online-repository.js";

export interface OnlineRepositoryHarness {
  readonly postgres: StartedPostgreSqlContainer;
  readonly database: ReturnType<typeof makePostgresLayer>;
  readonly run: <A, E>(
    effect: Effect.Effect<A, E, OnlineRepository>,
  ) => Promise<A>;
  readonly runAt: <A, E>(
    time: string,
    effect: Effect.Effect<A, E, OnlineRepository>,
  ) => Promise<A>;
  readonly stop: () => Promise<void>;
}

const sessionIdOf = (session: string) => {
  const hex = new Bun.CryptoHasher("md5").update(session).digest("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const checkpoint = (
  userId: string,
  session: string,
  startedAt: string,
  endedAt: string,
): UserOnlineCheckpointV1 => {
  const sessionId = sessionIdOf(session);

  return {
    version: 1,
    type: "checkpoint",
    userId,
    sessionId,
    segmentId: `${sessionId}:${Date.parse(startedAt)}`,
    startedAt,
    endedAt,
    observedAt: endedAt,
  };
};

export const foldAllIntervals = (sql: PgClient.PgClient) =>
  upsertOnlineDays(
    sql,
    sql`SELECT "userId", world, "startedAt" AS start, "endedAt" AS finish FROM "UserOnlineInterval"`,
  );

export const startOnlineRepositoryHarness = async (
  seedBeforeCompaction?: string,
): Promise<OnlineRepositoryHarness> => {
  const postgres = await new PostgreSqlContainer("postgres:18.7-alpine")
    .withDatabase("online_history")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .start();

  const database = makePostgresLayer({
    url: Redacted.make(postgres.getConnectionUri()),
  });

  await Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* migrationClient;

      const migration = yield* Effect.promise(() =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/20260906084000_user_online_history/migration.sql",
            import.meta.url,
          ),
        ).text(),
      );

      yield* Effect.tryPromise(() => client.query(migration));

      const worldsMigration = yield* Effect.promise(() =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/20260906115013_online_world_provenance/migration.sql",
            import.meta.url,
          ),
        ).text(),
      );

      yield* Effect.tryPromise(() => client.query(worldsMigration));

      const retentionMigration = yield* Effect.promise(() =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/20260920121702_online_retention_windows/migration.sql",
            import.meta.url,
          ),
        ).text(),
      );

      yield* Effect.tryPromise(() => client.query(retentionMigration));

      const checkpointIndexesMigration = yield* Effect.promise(() =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/20260924221924_online_checkpoint_indexes/migration.sql",
            import.meta.url,
          ),
        ).text(),
      );

      yield* Effect.tryPromise(() => client.query(checkpointIndexesMigration));

      const dayRollupMigration = yield* Effect.promise(() =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/20261111104604_online_day_rollup/migration.sql",
            import.meta.url,
          ),
        ).text(),
      );

      yield* Effect.tryPromise(() =>
        client.query(
          dayRollupMigration.replaceAll("--> statement-breakpoint", ""),
        ),
      );

      if (seedBeforeCompaction)
        yield* Effect.tryPromise(() => client.query(seedBeforeCompaction));

      const compactIntervalsMigration = yield* Effect.promise(() =>
        Bun.file(
          new URL(
            "../../drizzle/migrations/20261123171224_compact_online_intervals/migration.sql",
            import.meta.url,
          ),
        ).text(),
      );

      yield* Effect.tryPromise(() =>
        client.query(
          compactIntervalsMigration.replaceAll("--> statement-breakpoint", ""),
        ),
      );
    }).pipe(Effect.scoped, Effect.provide(database)),
  );

  const run = <A, E>(effect: Effect.Effect<A, E, OnlineRepository>) =>
    Effect.runPromise(
      effect.pipe(
        Effect.provide(OnlineRepository.layer.pipe(Layer.provide(database))),
      ),
    );

  const runAt = <A, E>(
    time: string,
    effect: Effect.Effect<A, E, OnlineRepository>,
  ) =>
    run(
      Effect.gen(function* () {
        yield* TestClock.setTime(Date.parse(time));

        return yield* effect;
      }).pipe(Effect.provide(TestClock.layer())),
    );

  return {
    postgres,
    database,
    run,
    runAt,
    stop: async () => {
      await postgres.stop();
    },
  };
};
