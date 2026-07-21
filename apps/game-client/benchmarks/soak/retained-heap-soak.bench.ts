import { test } from "vitest";
import { runRetainedHeapSoak } from "./run-retained-heap-soak";

test("accelerated soak stays within retained heap and structural budgets", async () => {
  await runRetainedHeapSoak();
}, 120_000);
