import { Effect, Metric } from "effect";

export const processCpuUtilization = Metric.gauge("process.cpu.utilization", {
  description: "Process CPU seconds per elapsed second (one core equals 1)",
  attributes: { unit: "1" },
});

export const processMemoryUsage = Metric.gauge("process.memory.usage", {
  description: "Process resident memory in bytes",
  attributes: { unit: "By" },
});

export const processHeapUsage = Metric.gauge("process.runtime.heap.usage", {
  description: "Runtime used heap memory in bytes",
  attributes: { unit: "By" },
});

export const processEventLoopDelay = Metric.histogram(
  "process.runtime.eventloop.delay",
  {
    description: "Delay beyond the scheduled one-second timer in seconds",
    attributes: { unit: "s" },
    boundaries: [
      0.001,
      0.005,
      0.01,
      0.025,
      0.05,
      0.1,
      0.25,
      0.5,
      1,
      5,
      Infinity,
    ],
  },
);

export const serviceUp = Metric.gauge("lootlog.service.up", {
  description: "Running service process",
  attributes: { unit: "" },
});

const recordMemoryAndPresence = Effect.gen(function* () {
  const memory = process.memoryUsage();
  yield* Metric.update(processMemoryUsage, memory.rss);
  yield* Metric.update(processHeapUsage, memory.heapUsed);
  yield* Metric.update(serviceUp, 1);
});

/** Start once per process in the observability layer's scope. */
export const startRuntimeMetrics = Effect.gen(function* () {
  yield* recordMemoryAndPresence;
  let previousCpu = process.cpuUsage();
  let previousCpuTime = performance.now();
  yield* Effect.gen(function* () {
    while (true) {
      const timerStarted = performance.now();
      yield* Effect.sleep("1 second");
      const now = performance.now();
      yield* Metric.update(
        processEventLoopDelay,
        Math.max(0, now - timerStarted - 1_000) / 1_000,
      );
      const elapsed = now - previousCpuTime;

      if (elapsed >= 10_000) {
        const cpu = process.cpuUsage();
        yield* Metric.update(
          processCpuUtilization,
          (cpu.user - previousCpu.user + cpu.system - previousCpu.system) /
            (elapsed * 1_000),
        );
        previousCpu = cpu;
        previousCpuTime = now;
        yield* recordMemoryAndPresence;
      }
    }
  }).pipe(Effect.forkScoped);
});
