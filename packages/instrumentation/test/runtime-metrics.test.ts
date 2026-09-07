import { expect, test } from "bun:test";
import { Effect, Exit, Metric, Scope } from "effect";
import {
  processCpuUtilization,
  processEventLoopDelay,
  processHeapUsage,
  processMemoryUsage,
  serviceUp,
  startRuntimeMetrics,
} from "../src/runtime-metrics.js";

test("idle processes emit runtime measurements and stop sampling when their scope closes", async () => {
  const scope = Effect.runSync(Scope.make());
  try {
    await Effect.runPromise(startRuntimeMetrics.pipe(Scope.provide(scope)));
    expect(Effect.runSync(Metric.value(serviceUp)).value).toBe(1);
    expect(
      Effect.runSync(Metric.value(processMemoryUsage)).value,
    ).toBeGreaterThan(0);
    expect(
      Effect.runSync(Metric.value(processHeapUsage)).value,
    ).toBeGreaterThan(0);
    const before = Effect.runSync(Metric.value(processEventLoopDelay)).count;
    await Bun.sleep(10_200);
    const delay = Effect.runSync(Metric.value(processEventLoopDelay));
    expect(delay.count).toBeGreaterThan(before);
    expect(delay.min).toBeGreaterThanOrEqual(0);
    const cpu = Effect.runSync(Metric.value(processCpuUtilization)).value;
    expect(Number.isFinite(cpu)).toBe(true);
    expect(cpu).toBeGreaterThan(0);
  } finally {
    await Effect.runPromise(Scope.close(scope, Exit.void));
  }
  const stopped = Effect.runSync(Metric.value(processEventLoopDelay)).count;
  await Bun.sleep(1_100);
  expect(Effect.runSync(Metric.value(processEventLoopDelay)).count).toBe(
    stopped,
  );
}, 15_000);
