import { test } from "vitest";
import { runHotPathBenchmarks } from "./run-hot-path-benchmarks";

test("game-client hot paths stay within hard publication and listener budgets", async () => {
  await runHotPathBenchmarks();
}, 120_000);
