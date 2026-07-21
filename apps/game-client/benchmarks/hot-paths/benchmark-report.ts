export type BenchmarkKind = "e2e" | "micro";

export type BenchmarkAssertionResult = {
  actual: number;
  expected: number;
  name: string;
  operator: "===" | "<=";
  passed: boolean;
};

export type BenchmarkResult = {
  assertions: BenchmarkAssertionResult[];
  group: string;
  heapBytes?: number;
  kind: BenchmarkKind;
  maxMs: number;
  medianMs: number;
  minMs: number;
  name: string;
  p95Ms: number;
  samples: number;
  warmups: number;
};

export type BenchmarkReport = {
  benchmarks: BenchmarkResult[];
  configuration: {
    samples: number;
    warmups: number;
  };
  generatedAt: string;
  runtime: {
    architecture: string;
    nodeVersion: string;
    platform: string;
  };
  schemaVersion: 1;
};

export type BenchmarkComparison = {
  baseline: BenchmarkResult;
  candidate: BenchmarkResult | null;
  failures: Array<"heap" | "median" | "missing" | "p95">;
  heapDeltaBytes?: number;
  heapDeltaRatio?: number;
  medianDeltaMs?: number;
  medianDeltaRatio?: number;
  name: string;
  p95DeltaMs?: number;
  p95DeltaRatio?: number;
};

export type BenchmarkComparisonReport = {
  comparisons: BenchmarkComparison[];
  failed: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isBenchmarkResult = (value: unknown): value is BenchmarkResult => {
  if (!isRecord(value)) return false;

  return (
    Array.isArray(value.assertions) &&
    typeof value.group === "string" &&
    (value.heapBytes === undefined || isFiniteNumber(value.heapBytes)) &&
    (value.kind === "e2e" || value.kind === "micro") &&
    isFiniteNumber(value.maxMs) &&
    isFiniteNumber(value.medianMs) &&
    isFiniteNumber(value.minMs) &&
    typeof value.name === "string" &&
    isFiniteNumber(value.p95Ms) &&
    isFiniteNumber(value.samples) &&
    isFiniteNumber(value.warmups)
  );
};

export const parseBenchmarkReport = (json: string): BenchmarkReport => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error("Invalid benchmark report JSON", { cause: error });
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid benchmark report");
  }

  if (parsed.schemaVersion !== 1) {
    throw new Error("Unsupported benchmark report schema");
  }

  if (
    !Array.isArray(parsed.benchmarks) ||
    !parsed.benchmarks.every(isBenchmarkResult) ||
    !isRecord(parsed.configuration) ||
    !isFiniteNumber(parsed.configuration.samples) ||
    !isFiniteNumber(parsed.configuration.warmups) ||
    typeof parsed.generatedAt !== "string" ||
    !isRecord(parsed.runtime) ||
    typeof parsed.runtime.architecture !== "string" ||
    typeof parsed.runtime.nodeVersion !== "string" ||
    typeof parsed.runtime.platform !== "string"
  ) {
    throw new Error("Invalid benchmark report");
  }

  return parsed as BenchmarkReport;
};

const MICRO_MEDIAN_ABSOLUTE_GATE_MS = 0.25;
const E2E_MEDIAN_ABSOLUTE_GATE_MS = 2;
const MEDIAN_RELATIVE_GATE = 0.1;
const P95_RELATIVE_GATE = 0.15;
const HEAP_ABSOLUTE_GATE_BYTES = 1024 * 1024;
const HEAP_RELATIVE_GATE = 0.1;

const calculateRatio = (baseline: number, candidate: number): number => {
  if (baseline === 0) {
    return candidate === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return (candidate - baseline) / baseline;
};

export const compareBenchmarkReports = (
  baselineReport: BenchmarkReport,
  candidateReport: BenchmarkReport,
): BenchmarkComparisonReport => {
  const candidateByName = new Map(
    candidateReport.benchmarks.map((benchmark) => [benchmark.name, benchmark]),
  );
  const comparisons = baselineReport.benchmarks.map((baseline) => {
    const candidate = candidateByName.get(baseline.name) ?? null;
    if (!candidate) {
      return {
        baseline,
        candidate,
        failures: ["missing" as const],
        name: baseline.name,
      };
    }

    const failures: BenchmarkComparison["failures"] = [];
    const medianDeltaMs = candidate.medianMs - baseline.medianMs;
    const medianDeltaRatio = calculateRatio(
      baseline.medianMs,
      candidate.medianMs,
    );
    const medianAbsoluteGate =
      baseline.kind === "micro"
        ? MICRO_MEDIAN_ABSOLUTE_GATE_MS
        : E2E_MEDIAN_ABSOLUTE_GATE_MS;

    if (
      medianDeltaRatio > MEDIAN_RELATIVE_GATE &&
      medianDeltaMs > medianAbsoluteGate
    ) {
      failures.push("median");
    }

    const p95DeltaMs = candidate.p95Ms - baseline.p95Ms;
    const p95DeltaRatio = calculateRatio(baseline.p95Ms, candidate.p95Ms);
    if (p95DeltaRatio > P95_RELATIVE_GATE) {
      failures.push("p95");
    }

    let heapDeltaBytes: number | undefined;
    let heapDeltaRatio: number | undefined;
    if (baseline.heapBytes !== undefined && candidate.heapBytes !== undefined) {
      heapDeltaBytes = candidate.heapBytes - baseline.heapBytes;
      heapDeltaRatio = calculateRatio(baseline.heapBytes, candidate.heapBytes);

      if (
        heapDeltaRatio > HEAP_RELATIVE_GATE &&
        heapDeltaBytes > HEAP_ABSOLUTE_GATE_BYTES
      ) {
        failures.push("heap");
      }
    }

    return {
      baseline,
      candidate,
      failures,
      heapDeltaBytes,
      heapDeltaRatio,
      medianDeltaMs,
      medianDeltaRatio,
      name: baseline.name,
      p95DeltaMs,
      p95DeltaRatio,
    };
  });

  return {
    comparisons,
    failed: comparisons.some((comparison) => comparison.failures.length > 0),
  };
};
