import { BunRedis, BunRuntime } from "@effect/platform-bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { groupBy } from "es-toolkit";
import { Console, Effect, Layer } from "effect";
import { apiRedisConfiguration } from "#src/config/api.config";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import { ApiRedis, redisUrl } from "#src/runtime/infrastructure/api-redis";
import { readLegacyRepairManifest } from "./legacy-repair-manifest.js";
import { planLegacyRepair } from "./legacy-repair-plan.js";
import { LegacyRepair, LegacyRepairError } from "./legacy-repair.js";

/**
 * Legacy association repair (LOO-38, LOO-250).
 *
 *   plan     --out <dir> --run-id <id>
 *   apply    --manifest <manifest.jsonl> --run-id <id> [--batch-size n] [--max-rows n]
 *   rollback --run-id <id> [--batch-size n] [--max-rows n]
 *   status   --run-id <id>
 *
 * `plan` only reads and writes the manifest, its row files and a summary of
 * counts into `--out`, which must stay private. Each apply or rollback
 * invocation changes at most `--max-rows` loot links or loots and prints a
 * JSON result with counts only. Repeat apply or rollback until it reports
 * `complete: true`; both resume after an interruption and are idempotent.
 */

const positiveInteger = (
  name: string,
  value: string | undefined,
  fallback: number,
) =>
  Effect.gen(function* () {
    if (value === undefined) return fallback;
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return yield* new LegacyRepairError({
        message: `--${name} must be a positive integer`,
      });
    }

    return parsed;
  });

const program = Effect.gen(function* () {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      manifest: { type: "string" },
      out: { type: "string" },
      "run-id": { type: "string" },
      "batch-size": { type: "string" },
      "max-rows": { type: "string" },
    },
  });

  const [command] = positionals;
  const runId = values["run-id"];

  if (
    !runId ||
    !["plan", "apply", "rollback", "status"].includes(command ?? "")
  ) {
    return yield* new LegacyRepairError({
      message:
        "usage: plan --out <dir> --run-id <id> | apply --manifest <path> --run-id <id> | rollback --run-id <id> | status --run-id <id>",
    });
  }

  if (command === "plan") {
    const out =
      values.out ??
      (yield* new LegacyRepairError({ message: "--out is required" }));

    return yield* Console.log(
      JSON.stringify(yield* writePlan(out, runId), null, 2),
    );
  }

  const options = {
    batchSize: yield* positiveInteger("batch-size", values["batch-size"], 1000),
    maxRows: yield* positiveInteger("max-rows", values["max-rows"], 50_000),
  };

  const repair = yield* LegacyRepair;

  if (command === "status") {
    return yield* Console.log(
      JSON.stringify(yield* repair.status(runId), null, 2),
    );
  }

  const progress =
    command === "apply"
      ? yield* repair.apply(
          yield* readLegacyRepairManifest(
            values.manifest ??
              (yield* new LegacyRepairError({
                message: "--manifest is required",
              })),
            runId,
          ),
          options,
        )
      : yield* repair.rollback(runId, options);

  // The repair invalidates the caches of affected Organizations after each
  // committed batch; the result reports only their number.
  const result = {
    ...progress,
    next: progress.complete ? null : `run ${command} again to continue`,
  };

  yield* Console.log(JSON.stringify(result, null, 2));
});

const jsonLines = (values: readonly unknown[]) =>
  values.map((value) => `${JSON.stringify(value)}\n`).join("");

// Writes the manifest, one row file per domain and action, and the counts
// per decision; returns the counts.
const writePlan = Effect.fnUntraced(function* (out: string, runId: string) {
  const plan = yield* planLegacyRepair(yield* ApiDatabase, runId);

  const write = (file: string, text: string) =>
    Effect.tryPromise({
      try: async () => {
        await mkdir(join(out, "rows"), { recursive: true });
        await Bun.write(join(out, file), text);
      },
      catch: (cause) =>
        new LegacyRepairError({ message: `cannot write ${file}: ${cause}` }),
    });

  yield* write("manifest.jsonl", jsonLines(plan.lines));

  for (const [file, rows] of Object.entries(
    groupBy(plan.rows, (row) => row.file),
  )) {
    yield* write(
      `rows/${file}.jsonl`,
      jsonLines(
        (rows ?? []).map(({ entryId, table, ids }) => ({
          entryId,
          table,
          ids,
        })),
      ),
    );
  }

  const links = new Map(plan.rows.map((row) => [row.entryId, row.ids.length]));
  const totals = new Map<string, { entries: number; links: number }>();

  for (const line of plan.lines) {
    const key = [line.domain, line.action, line.unresolvedReason]
      .filter(Boolean)
      .join(" ");

    const total = totals.get(key) ?? { entries: 0, links: 0 };

    total.entries += 1;
    total.links += links.get(line.entryId) ?? 0;
    totals.set(key, total);
  }

  const summary = {
    runId,
    entries: plan.lines.length,
    totals: Object.fromEntries(totals),
  };

  yield* write("summary.json", `${JSON.stringify(summary, null, 2)}\n`);

  return summary;
});

const RedisLive = Layer.unwrap(
  apiRedisConfiguration.pipe(
    Effect.map((redis) =>
      ApiRedis.layerWithoutRedis.pipe(
        Layer.provide(BunRedis.layer({ url: redisUrl(redis) })),
      ),
    ),
  ),
);

if (import.meta.main) {
  BunRuntime.runMain(
    program.pipe(
      Effect.provide(
        Layer.mergeAll(
          LegacyRepair.layer.pipe(
            Layer.provideMerge(Layer.mergeAll(ApiDatabaseLive, RedisLive)),
          ),
        ),
      ),
    ),
  );
}
