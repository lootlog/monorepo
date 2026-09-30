import { BunRedis, BunRuntime } from "@effect/platform-bun";
import { parseArgs } from "node:util";
import { Console, Effect, Layer } from "effect";
import { apiRedisConfiguration } from "#src/config/api.config";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { ApiRedis, redisUrl } from "#src/runtime/infrastructure/api-redis";
import { readLegacyRepairManifest } from "./legacy-repair-manifest.js";
import { LegacyRepair, LegacyRepairError } from "./legacy-repair.js";

/**
 * LOO-38 legacy association repair.
 *
 *   apply    --manifest <manifest.jsonl> --run-id <id> [--batch-size n] [--max-rows n]
 *   rollback --run-id <id> [--batch-size n] [--max-rows n]
 *   status   --run-id <id>
 *
 * Each invocation moves at most `--max-rows` loot links and prints a JSON
 * result with counts only. Repeat apply or rollback until it reports
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
      "run-id": { type: "string" },
      "batch-size": { type: "string" },
      "max-rows": { type: "string" },
    },
  });

  const [command] = positionals;
  const runId = values["run-id"];

  if (!runId || !["apply", "rollback", "status"].includes(command ?? "")) {
    return yield* new LegacyRepairError({
      message:
        "usage: apply --manifest <path> --run-id <id> | rollback --run-id <id> | status --run-id <id>",
    });
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
