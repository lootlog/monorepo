import { performance } from "node:perf_hooks";
import type {
  BenchmarkAssertionResult,
  BenchmarkKind,
  BenchmarkResult,
} from "./benchmark-report";

export type BenchmarkObservation = {
  assertions?: BenchmarkAssertionResult[];
  retainedValue?: unknown;
};

export type PreparedBenchmark = {
  cleanup?: () => void;
  observe?: () => BenchmarkObservation;
  run: () => BenchmarkObservation | void;
};

export type BenchmarkScenario = {
  group: string;
  hardP95LimitMs?: number;
  kind: BenchmarkKind;
  name: string;
  prepare: () => PreparedBenchmark;
};

export type BenchmarkRunnerOptions = {
  collectHeap: boolean;
  samples: number;
  warmups: number;
};

export type BenchmarkDistribution = {
  max: number;
  median: number;
  min: number;
  p95: number;
};

export const calculateDistribution = (
  values: readonly number[],
): BenchmarkDistribution => {
  if (values.length === 0) {
    throw new Error(
      "Cannot calculate a benchmark distribution without samples",
    );
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const median =
    sortedValues.length % 2 === 0
      ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
      : sortedValues[middleIndex];
  const p95Index = Math.ceil(sortedValues.length * 0.95) - 1;
  const maximum = sortedValues.at(-1);
  const minimum = sortedValues[0];
  if (maximum === undefined || minimum === undefined) {
    throw new Error(
      "Cannot calculate a benchmark distribution without samples",
    );
  }

  return {
    max: maximum,
    median,
    min: minimum,
    p95: sortedValues[p95Index],
  };
};

const runPreparedBenchmark = (
  preparedBenchmark: PreparedBenchmark,
): { durationMs: number; observation: BenchmarkObservation } => {
  const startedAt = performance.now();
  const inlineObservation = preparedBenchmark.run() ?? {};
  const durationMs = performance.now() - startedAt;
  const observation = preparedBenchmark.observe?.() ?? inlineObservation;

  return { durationMs, observation };
};

const assertObservation = (
  scenarioName: string,
  observation: BenchmarkObservation,
): BenchmarkAssertionResult[] => {
  const assertions = observation.assertions ?? [];
  const failedAssertion = assertions.find((assertion) => !assertion.passed);
  if (failedAssertion) {
    throw new Error(
      `${scenarioName}: ${failedAssertion.name} expected ${failedAssertion.operator} ${failedAssertion.expected}, received ${failedAssertion.actual}`,
    );
  }

  return assertions;
};

const forceGarbageCollection = (): void => {
  globalThis.gc?.();
  globalThis.gc?.();
};

const measureRetainedHeap = (
  scenario: BenchmarkScenario,
): number | undefined => {
  if (!globalThis.gc) return undefined;

  const preparedBenchmark = scenario.prepare();
  try {
    forceGarbageCollection();
    const heapBefore = process.memoryUsage().heapUsed;
    const inlineObservation = preparedBenchmark.run() ?? {};
    const observation = preparedBenchmark.observe?.() ?? inlineObservation;
    assertObservation(scenario.name, observation);
    const retainedValue = observation.retainedValue;
    forceGarbageCollection();
    const heapAfter = process.memoryUsage().heapUsed;
    void retainedValue;

    return Math.max(0, heapAfter - heapBefore);
  } finally {
    preparedBenchmark.cleanup?.();
    forceGarbageCollection();
  }
};

export const runBenchmarkScenario = (
  scenario: BenchmarkScenario,
  options: BenchmarkRunnerOptions,
): BenchmarkResult => {
  for (let warmupIndex = 0; warmupIndex < options.warmups; warmupIndex += 1) {
    const preparedBenchmark = scenario.prepare();
    try {
      const { observation } = runPreparedBenchmark(preparedBenchmark);
      assertObservation(scenario.name, observation);
    } finally {
      preparedBenchmark.cleanup?.();
    }
  }

  const durations: number[] = [];
  let assertions: BenchmarkAssertionResult[] = [];
  for (let sampleIndex = 0; sampleIndex < options.samples; sampleIndex += 1) {
    const preparedBenchmark = scenario.prepare();
    try {
      const { durationMs, observation } =
        runPreparedBenchmark(preparedBenchmark);
      assertions = assertObservation(scenario.name, observation);
      durations.push(durationMs);
    } finally {
      preparedBenchmark.cleanup?.();
    }
  }

  const distribution = calculateDistribution(durations);
  if (scenario.hardP95LimitMs !== undefined) {
    const p95Assertion: BenchmarkAssertionResult = {
      actual: distribution.p95,
      expected: scenario.hardP95LimitMs,
      name: "p95 duration",
      operator: "<=",
      passed: distribution.p95 <= scenario.hardP95LimitMs,
    };
    assertObservation(scenario.name, { assertions: [p95Assertion] });
    assertions = [...assertions, p95Assertion];
  }

  return {
    assertions,
    group: scenario.group,
    heapBytes: options.collectHeap ? measureRetainedHeap(scenario) : undefined,
    kind: scenario.kind,
    maxMs: distribution.max,
    medianMs: distribution.median,
    minMs: distribution.min,
    name: scenario.name,
    p95Ms: distribution.p95,
    samples: options.samples,
    warmups: options.warmups,
  };
};
