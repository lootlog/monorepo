import { SQL } from "bun";
import { PgClient } from "@effect/sql-pg";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { TestClock } from "effect/testing";
import { Statement } from "effect/unstable/sql";
import { OnlineRepository } from "../src/online/online-repository.js";

// This comparison always creates and destroys its own PostgreSQL container. It
// accepts an output directory, never an existing database connection string.
const outputDirectory =
  Bun.argv[2] ?? "/tmp/lootlog-online-checkpoint-benchmark";

const plansOnly = Bun.argv[3] === "--plans-only";

const users = 5000;

const historyDays = 119;

const skewIntervals = 20_000;

const writers = 8;

const readers = 2;

const checkpointsPerWriter = 5000;

const anchor = "2026-09-25T12:00:00Z";

const cutoff = "2026-06-05T12:00:00Z";

const intervalStart = "2026-09-25T11:50:00Z";

type Variant = "baseline" | "stable-indexes";

type ReadRange = "today" | "old-day" | "112-days";

type Snapshot = {
  lsn: string;
  heapBytes: number;
  indexBytes: number;
  updates: number;
  hotUpdates: number;
};

const readRanges: { name: ReadRange; from: string; to: string }[] = [
  { name: "today", from: "2026-09-25", to: "2026-09-25" },
  { name: "old-day", from: "2026-06-07", to: "2026-06-07" },
  { name: "112-days", from: "2026-06-06", to: "2026-09-25" },
];

async function docker(...args: string[]) {
  const child = Bun.spawn(["docker", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (status !== 0) throw new Error(`Docker failed: ${stderr.trim()}`);

  return stdout.trim();
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((left, right) => left - right);

  return sorted[Math.floor(sorted.length * fraction)] ?? 0;
}

async function explain(
  database: SQL,
  name: string,
  query: string,
  values: unknown[],
) {
  const rows = await database.unsafe<{ "QUERY PLAN": unknown }[]>(
    `EXPLAIN (ANALYZE, BUFFERS, WAL, FORMAT JSON) ${query}`,
    values,
  );

  await Bun.write(
    `${outputDirectory}/${name}.plan.json`,
    JSON.stringify(rows[0]?.["QUERY PLAN"], null, 2),
  );
}

async function flushStatistics(database: SQL) {
  // Repository runtimes close their writer pools before each snapshot. Flush the
  // separate administrative pool too, rather than sleeping on one pooled backend.
  const connections = await Promise.all(
    Array.from({ length: 16 }, () => database.reserve()),
  );

  try {
    await Promise.all(
      connections.map(async (connection) => {
        await connection.unsafe("SELECT pg_stat_force_next_flush()");
        await connection.unsafe("SELECT 1");
      }),
    );
  } finally {
    for (const connection of connections) connection.release();
  }

  await database.unsafe("SELECT pg_stat_clear_snapshot()");
}

async function snapshot(database: SQL) {
  await flushStatistics(database);

  const rows = await database.unsafe<Snapshot[]>(`SELECT
    pg_current_wal_insert_lsn()::text AS lsn,
    pg_relation_size('"UserOnlineInterval"')::float8 AS "heapBytes",
    pg_indexes_size('"UserOnlineInterval"')::float8 AS "indexBytes",
    n_tup_upd::float8 AS updates, n_tup_hot_upd::float8 AS "hotUpdates"
    FROM pg_stat_user_tables WHERE relname = 'UserOnlineInterval'`);

  const row = rows[0];

  if (!row) throw new Error("Missing interval statistics");

  return row;
}

async function seed(database: SQL) {
  await database.unsafe(`CREATE TABLE seed (
    "userId" text NOT NULL, "sessionId" text NOT NULL, "segmentId" text NOT NULL,
    world text, "startedAt" timestamptz NOT NULL, "endedAt" timestamptz NOT NULL,
    "observedAt" timestamptz NOT NULL)`);
  await database.unsafe(
    `INSERT INTO seed SELECT 'user-' || u,
    'session-' || d || '-' || s, 'segment-' || d || '-' || s, 'luvia',
    $1::timestamptz - d * interval '1 day' + s * interval '4 hours',
    $1::timestamptz - d * interval '1 day' + s * interval '4 hours' + interval '1 hour',
    $1::timestamptz - d * interval '1 day' + s * interval '4 hours' + interval '1 hour'
    FROM generate_series(1, $2) d CROSS JOIN generate_series(0, 1) s CROSS JOIN generate_series(1, $3) u`,
    [anchor, historyDays, users],
  );
  await database.unsafe(
    `INSERT INTO seed SELECT 'user-' || u, 'active', 'active', 'luvia',
    $1::timestamptz, $2::timestamptz, $2::timestamptz FROM generate_series(1, $3) u`,
    [intervalStart, anchor, users],
  );
  await database.unsafe(
    `INSERT INTO seed SELECT 'user-heavy', 'session-' || n, 'segment-' || n, 'luvia',
    $1::timestamptz - (1 + ((n - 1) / 179)) * interval '1 day' + ((n - 1) % 179) * interval '5 minutes',
    $1::timestamptz - (1 + ((n - 1) / 179)) * interval '1 day' + ((n - 1) % 179) * interval '5 minutes' + interval '4 minutes',
    $1::timestamptz - (1 + ((n - 1) / 179)) * interval '1 day' + ((n - 1) % 179) * interval '5 minutes' + interval '4 minutes'
    FROM generate_series(1, $2) n`,
    [anchor, skewIntervals],
  );
  await database.unsafe("VACUUM ANALYZE seed");
  await database.unsafe(`CREATE TABLE "UserOnlineCollector" (
    id integer PRIMARY KEY, "trackingStartedAt" timestamptz, "observedAt" timestamptz,
    status text, "degradedUntil" timestamptz)`);
  await database.unsafe(
    `INSERT INTO "UserOnlineCollector" VALUES (1, $1::timestamptz, $2::timestamptz, 'healthy', NULL)`,
    [cutoff, anchor],
  );
}

async function prepare(database: SQL, variant: Variant) {
  await database.unsafe(
    'DROP TABLE IF EXISTS "UserOnlineInterval", "UserOnlineTracking"',
  );
  await database.unsafe(`CREATE TABLE "UserOnlineInterval" (LIKE seed INCLUDING ALL,
    PRIMARY KEY ("userId", "sessionId", "segmentId"),
    CHECK ("endedAt" >= "startedAt" AND "observedAt" >= "endedAt")) WITH (autovacuum_enabled = false)`);
  await database.unsafe('INSERT INTO "UserOnlineInterval" SELECT * FROM seed');
  await database.unsafe(
    'CREATE INDEX "UserOnlineInterval_startedAt_idx" ON "UserOnlineInterval" ("startedAt")',
  );

  if (variant === "baseline") {
    await database.unsafe(
      'CREATE INDEX "UserOnlineInterval_userId_endedAt_idx" ON "UserOnlineInterval" ("userId", "endedAt")',
    );
    await database.unsafe(
      'CREATE INDEX "UserOnlineInterval_endedAt_idx" ON "UserOnlineInterval" ("endedAt")',
    );
  }

  await database.unsafe(
    'CREATE TABLE "UserOnlineTracking" ("userId" text PRIMARY KEY, "lastObservedAt" timestamptz NOT NULL) WITH (autovacuum_enabled = false)',
  );
  await database.unsafe(
    `INSERT INTO "UserOnlineTracking" SELECT 'user-' || u, $1::timestamptz FROM generate_series(1, $2) u`,
    [anchor, users],
  );
  await database.unsafe('VACUUM ANALYZE "UserOnlineInterval"');
  await database.unsafe('VACUUM ANALYZE "UserOnlineTracking"');
}

function makeRuntime(connectionUrl: string) {
  return ManagedRuntime.make(
    Layer.mergeAll(
      OnlineRepository.layer.pipe(
        Layer.provide(
          PgClient.layer({
            url: Redacted.make(connectionUrl),
            maxConnections: 16,
          }),
        ),
      ),
      TestClock.layer(),
    ),
  );
}

async function workload(
  connectionUrl: string,
  trial: number,
  perWriter: number,
) {
  const runtime = makeRuntime(connectionUrl);
  await runtime.runPromise(TestClock.setTime(Date.parse(anchor) + 7200_000));
  const repository = await runtime.runPromise(OnlineRepository);
  const writeTimes: number[] = [];

  const readTimes: Record<ReadRange, number[]> = {
    today: [],
    "old-day": [],
    "112-days": [],
  };

  let writing = true;
  let readCounter = 0;
  const started = performance.now();

  const writeTasks = Array.from({ length: writers }, (_, worker) =>
    (async () => {
      for (let index = 0; index < perWriter; index++) {
        const sequence = index * writers + worker;
        const user = `user-${1 + (sequence % users)}`;

        const ended = new Date(
          Date.parse(anchor) +
            (trial * 20 + 1 + Math.floor(sequence / users)) * 60_000,
        ).toISOString();

        const start = performance.now();
        await runtime.runPromise(
          repository.ingest({
            version: 1,
            type: "checkpoint",
            userId: user,
            sessionId: "active",
            segmentId: "active",
            world: "luvia",
            startedAt: intervalStart,
            endedAt: ended,
            observedAt: ended,
          }),
        );
        writeTimes.push(performance.now() - start);
      }
    })(),
  );

  const readTasks = Array.from({ length: readers }, () =>
    (async () => {
      while (writing) {
        const index = readCounter++;
        const range = readRanges[index % readRanges.length];

        if (!range) throw new Error("Missing read range");
        const user = `user-${1 + ((index * 97) % users)}`;
        const start = performance.now();
        await runtime.runPromise(
          repository.find(user, { from: range.from, to: range.to }),
        );
        readTimes[range.name].push(performance.now() - start);
      }
    })(),
  );

  try {
    await Promise.all(writeTasks);
  } finally {
    writing = false;
    await Promise.all(readTasks);
    await runtime.dispose();
  }

  return {
    durationMs: performance.now() - started,
    checkpoints: writeTimes.length,
    writeP50Ms: percentile(writeTimes, 0.5),
    writeP95Ms: percentile(writeTimes, 0.95),
    writeP99Ms: percentile(writeTimes, 0.99),
    reads: readRanges.map(({ name }) => ({
      range: name,
      count: readTimes[name].length,
      p95Ms: percentile(readTimes[name], 0.95),
    })),
  };
}

async function measureSkew(connectionUrl: string) {
  const runtime = makeRuntime(connectionUrl);

  try {
    await runtime.runPromise(TestClock.setTime(Date.parse(anchor) + 7200_000));
    const repository = await runtime.runPromise(OnlineRepository);
    const samples = [];

    for (const range of readRanges) {
      const durations = [];

      for (let sample = 0; sample < 33; sample++) {
        const started = performance.now();
        await runtime.runPromise(
          repository.find("user-heavy", { from: range.from, to: range.to }),
        );

        if (sample >= 3) durations.push(performance.now() - started);
      }

      samples.push({
        range: range.name,
        count: durations.length,
        p50Ms: percentile(durations, 0.5),
        p95Ms: percentile(durations, 0.95),
      });
    }

    return samples;
  } finally {
    await runtime.dispose();
  }
}

async function measurePlans(database: SQL, variant: Variant) {
  const expired =
    variant === "baseline"
      ? `SELECT ctid FROM "UserOnlineInterval" WHERE "endedAt" <= $1::timestamptz ORDER BY "endedAt" LIMIT 1000 FOR UPDATE`
      : `SELECT ctid FROM "UserOnlineInterval" WHERE "startedAt" <= $1::timestamptz AND "endedAt" <= $1::timestamptz ORDER BY "startedAt" LIMIT 1000 FOR UPDATE`;

  await explain(database, `${variant}-retention-nonempty`, expired, [cutoff]);
  // Match the final state after all bounded retention batches have completed.
  // Cleanup itself is outside the concurrent checkpoint measurements.
  await database.unsafe(
    'DELETE FROM "UserOnlineInterval" WHERE "endedAt" <= $1::timestamptz',
    [cutoff],
  );
  await database.unsafe(
    'UPDATE "UserOnlineInterval" SET "startedAt" = $1::timestamptz WHERE "startedAt" < $1::timestamptz AND "endedAt" > $1::timestamptz',
    [cutoff],
  );
  await database.unsafe('VACUUM ANALYZE "UserOnlineInterval"');
  await explain(database, `${variant}-retention-empty`, expired, [cutoff]);
}

async function captureReadPlans(
  database: SQL,
  connectionUrl: string,
  variant: Variant,
) {
  const runtime = makeRuntime(connectionUrl);

  try {
    await runtime.runPromise(TestClock.setTime(Date.parse(anchor) + 7200_000));
    const repository = await runtime.runPromise(OnlineRepository);

    for (const user of ["user-2500", "user-heavy"]) {
      for (const range of readRanges) {
        const statements: ReturnType<
          Statement.Statement<unknown>["compile"]
        >[] = [];

        await runtime.runPromise(
          repository.find(user, { from: range.from, to: range.to }).pipe(
            Effect.provideService(Statement.CurrentTransformer, (statement) =>
              Effect.sync(() => {
                statements.push(statement.compile());

                return statement;
              }),
            ),
          ),
        );

        for (const [index, [query, values]] of statements.entries()) {
          await explain(
            database,
            `${variant}-${user}-${range.name}-${index}`,
            query,
            [...values],
          );
        }
      }
    }
  } finally {
    await runtime.dispose();
  }
}

async function main() {
  const container = await docker(
    "run",
    "--rm",
    "-d",
    "-e",
    "POSTGRES_PASSWORD=benchmark",
    "-e",
    "POSTGRES_DB=benchmark",
    "-p",
    "127.0.0.1::5432",
    "--cpus=2",
    "--memory=1g",
    "postgres:17-alpine",
    "-c",
    "shared_buffers=128MB",
    "-c",
    "max_connections=50",
    "-c",
    "checkpoint_timeout=30min",
    "-c",
    "max_wal_size=2GB",
  );

  let database: SQL | undefined;

  try {
    const port = (await docker("port", container, "5432/tcp"))
      .split(":")
      .at(-1);

    if (!port || !/^\d+$/.test(port))
      throw new Error("Could not determine disposable database port");

    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        await docker("exec", container, "pg_isready", "-U", "postgres");
        break;
      } catch {
        if (attempt === 99)
          throw new Error("Disposable PostgreSQL did not start");
        await Bun.sleep(100);
      }
    }

    const connectionUrl = `postgres://postgres:benchmark@127.0.0.1:${port}/benchmark`;
    database = new SQL(connectionUrl, { max: 16 });

    const version =
      await database.unsafe<{ version: string }[]>("SELECT version()");

    const metadata = {
      version: version[0]?.version,
      users,
      historyDays,
      seededRows: users * (2 * historyDays + 1) + skewIntervals,
      skewIntervals,
      writers,
      readers,
      checkpointsPerTrial: writers * checkpointsPerWriter,
      cpuLimit: 2,
      memoryLimit: "1 GiB",
      sharedBuffers: "128 MiB",
      autovacuum: "disabled for both variants; explicit VACUUM before warmup",
      checkpoint: "forced before each measured trial",
      scope:
        "synthetic database, real OnlineRepository.ingest/find; excludes RabbitMQ and HTTP",
    };

    console.warn(JSON.stringify(metadata));
    await seed(database);
    const results = [];
    const skewResults = [];
    const variants: Variant[] = ["baseline", "stable-indexes"];

    for (const variant of variants) {
      console.warn(`Preparing ${variant}`);
      await prepare(database, variant);

      for (const trial of plansOnly ? [] : [0, 1, 2, 3]) {
        console.warn(
          `${variant}: ${trial === 0 ? "warmup" : `trial ${trial}`}`,
        );

        if (trial === 0) {
          await workload(connectionUrl, trial, 2500);
          continue;
        }

        await database.unsafe("CHECKPOINT");
        const before = await snapshot(database);

        const timings = await workload(
          connectionUrl,
          trial,
          checkpointsPerWriter,
        );

        const after = await snapshot(database);

        const wal = await database.unsafe<{ bytes: number }[]>(
          "SELECT pg_wal_lsn_diff($1::pg_lsn, $2::pg_lsn)::float8 AS bytes",
          [after.lsn, before.lsn],
        );

        const walBytes = wal[0]?.bytes;

        if (walBytes === undefined) throw new Error("Missing WAL measurement");
        const updates = after.updates - before.updates;

        if (updates !== timings.checkpoints)
          throw new Error(
            `Incomplete statistics: expected ${timings.checkpoints}, received ${updates}`,
          );

        const result = {
          variant,
          trial,
          ...timings,
          walBytes,
          walBytesPerCheckpoint: walBytes / timings.checkpoints,
          intervalHotPercent:
            ((after.hotUpdates - before.hotUpdates) / updates) * 100,
          intervalHeapBytes: after.heapBytes,
          intervalHeapGrowth: after.heapBytes - before.heapBytes,
          intervalIndexBytes: after.indexBytes,
          intervalIndexGrowth: after.indexBytes - before.indexBytes,
        };

        results.push(result);
        console.warn(JSON.stringify(result));
        await Bun.write(
          `${outputDirectory}/results.json`,
          JSON.stringify({ metadata, results, skewResults }, null, 2),
        );
      }

      if (!plansOnly) {
        skewResults.push({ variant, reads: await measureSkew(connectionUrl) });
      }

      await Bun.write(
        `${outputDirectory}/results.json`,
        JSON.stringify({ metadata, results, skewResults }, null, 2),
      );

      if (!plansOnly) console.warn(JSON.stringify(skewResults.at(-1)));
      await captureReadPlans(database, connectionUrl, variant);
      await measurePlans(database, variant);
    }
  } finally {
    await database?.close();
    await docker("rm", "-f", container);
  }
}

await main();
