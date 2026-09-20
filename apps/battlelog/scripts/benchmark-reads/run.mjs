import pg from "pg";

const { Pool } = pg;

const dir = process.env.BENCH_OUTPUT_DIR ?? "/tmp/loo146-benchmark";

if (!process.env.BENCH_DATABASE_URL)
  throw new Error(
    "Set BENCH_DATABASE_URL to the disposable loo146_bench database",
  );

const connectionString = process.env.BENCH_DATABASE_URL;

if (new URL(connectionString).pathname !== "/loo146_bench")
  throw new Error("Benchmark requires isolated database loo146_bench");

const pool = new Pool({ connectionString, max: 10 });

const queries = await Bun.file(
  new URL("./queries.json", import.meta.url),
).json();

const percentile = (xs, p) =>
  xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * p) - 1] ?? 0;

const summarize = (xs) => ({
  n: xs.length,
  p50: percentile(xs, 0.5),
  p95: percentile(xs, 0.95),
  p99: percentile(xs, 0.99),
});

const cpu = () => {
  if (!process.env.BENCH_CONTAINER) return null;

  const result = Bun.spawnSync([
    "docker",
    "exec",
    process.env.BENCH_CONTAINER,
    "cat",
    "/sys/fs/cgroup/cpu.stat",
  ]);

  if (result.exitCode !== 0)
    throw new Error("Cannot read benchmark container CPU statistics");

  return Number(result.stdout.toString().match(/usage_usec (\d+)/)?.[1]) / 1000;
};

try {
  const plans = {};
  const planner = await pool.connect();

  try {
    await planner.query("SET statement_timeout='10s'");

    for (const [name, query] of Object.entries(queries)) {
      const explained = await planner.query("EXPLAIN (FORMAT JSON) " + query);
      const analyzed = [];

      for (let repeat = 0; repeat < 3; repeat++) {
        const result = await planner.query(
          "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + query,
        );

        analyzed.push(result.rows[0]["QUERY PLAN"][0]);
      }

      plans[name] = { explained: explained.rows[0]["QUERY PLAN"][0], analyzed };
    }
  } finally {
    planner.release();
  }

  await Bun.write(dir + "/plans.json", JSON.stringify(plans, null, 2));
  const runs = [];

  for (let round = 0; round < 3; round++)
    for (const mode of ["baseline", "candidate"]) {
      const records = [];
      let active = 0;
      const queue = [];

      async function admit() {
        if (mode === "baseline") return 0;
        const start = performance.now();

        if (active < 2) {
          active++;

          return 0;
        }

        await new Promise((resolve, reject) => {
          const e = { resolve };
          e.timer = setTimeout(() => {
            queue.splice(queue.indexOf(e), 1);
            reject(new Error("admission timeout"));
          }, 3000);
          queue.push(e);
        });

        return performance.now() - start;
      }

      function release() {
        if (mode === "baseline") return;
        const e = queue.shift();

        if (e) {
          clearTimeout(e.timer);
          e.resolve();
        } else active--;
      }

      async function run(kind, q, tag) {
        const start = performance.now();

        let admissionWait = 0,
          poolWait = 0,
          client,
          admitted = false,
          failure;

        try {
          if (kind === "search" || kind === "metadata") {
            admissionWait = await admit();
            admitted = true;
          }

          const p = performance.now();
          client = await pool.connect();
          poolWait = performance.now() - p;
          await client.query("BEGIN");

          // SQL proxy: Effect interruption and rollback deadlines need application tests.
          const budget =
            mode === "candidate" && kind !== "insert"
              ? Math.max(
                  1,
                  Math.min(
                    2000,
                    Math.floor(3000 - (performance.now() - start)),
                  ),
                )
              : 10000;

          await client.query(`SET LOCAL statement_timeout='${budget}ms'`);
          await client.query(q);
          await client.query("COMMIT");
        } catch (error) {
          failure = error.message;

          if (client) await client.query("ROLLBACK");
        } finally {
          client?.release();

          if (admitted) release();
          records.push({
            kind,
            tag,
            ms: performance.now() - start,
            admissionWait,
            poolWait,
            error: failure,
          });
        }
      }

      const prefix = `write-${crypto.randomUUID()}`;

      const start = performance.now(),
        cpuStart = cpu();

      const search = Array.from({ length: 20 }, (_, i) =>
        (async () => {
          for (let j = 0; j < 4; j++) {
            const owner = i % 2 ? "heavy" : "small",
              term = ["Co", "Common", "Absent", "Rare-10001"][j];

            await run(
              "search",
              queries[
                `${owner}-${term}-${mode === "baseline" ? "original" : "candidate"}`
              ],
              owner + "-" + term,
            );
          }
        })(),
      );

      const metadata = (async () => {
        for (let j = 0; j < 10; j++)
          await run(
            "metadata",
            queries[
              `heavy-characters-${mode === "baseline" ? "original" : "lateral"}`
            ],
            "heavy",
          );
      })();

      const insert = (async () => {
        for (let j = 0; j < 40; j++) {
          const id = `${prefix}-${j}`;
          await run(
            "insert",
            `INSERT INTO battles VALUES('${id}','writer','1','world0',now()); INSERT INTO battle_warriors VALUES('${id}','${id}','1','Writer',100,'w','icon',1)`,
            "insert",
          );
          await Bun.sleep(10);
        }
      })();

      await Promise.all([...search, metadata, insert]);

      const elapsed = performance.now() - start,
        cpuEnd = cpu(),
        cpuMs = cpuStart === null ? null : cpuEnd - cpuStart;

      const summary = {
        mode,
        round,
        elapsed,
        cpuMs,
        cpuCores: cpuMs === null ? null : cpuMs / elapsed,
      };

      for (const kind of ["search", "metadata", "insert"]) {
        const rows = records.filter((r) => r.kind === kind);
        summary[kind] = {
          latency: summarize(rows.map((r) => r.ms)),
          poolWait: summarize(rows.map((r) => r.poolWait)),
          admissionWait: summarize(rows.map((r) => r.admissionWait)),
          errors: rows.flatMap((r) => (r.error ? [r.error] : [])),
        };
      }

      runs.push({ summary, records });
      await Bun.write(Bun.stdout, `${JSON.stringify(summary)}\n`);
      await pool.query(
        `DELETE FROM battle_warriors WHERE "battleId" LIKE '${prefix}-%'; DELETE FROM battles WHERE id LIKE '${prefix}-%'`,
      );
    }

  await Bun.write(
    dir + "/workload-results.json",
    JSON.stringify(runs, null, 2),
  );
} finally {
  await pool.end();
}
