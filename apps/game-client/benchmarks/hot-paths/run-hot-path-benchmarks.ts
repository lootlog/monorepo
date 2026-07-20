import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildMarkdownReport } from "./benchmark-markdown";
import {
  compareBenchmarkReports,
  parseBenchmarkReport,
  type BenchmarkComparisonReport,
  type BenchmarkReport,
  type BenchmarkResult,
} from "./benchmark-report";
import { runBenchmarkScenario } from "./benchmark-runner";
import { createHotPathScenarios } from "./hot-path-scenarios";

const DEFAULT_WARMUPS = 8;
const DEFAULT_SAMPLES = 25;
const DEFAULT_OUTPUT_DIRECTORY = "artifacts/hot-path-benchmarks";

const writeLine = (value: string): void => {
  process.stdout.write(`${value}\n`);
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  variableName: string,
): number => {
  if (value === undefined) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }

  return parsed;
};

const resolveOutputPath = (
  outputDirectory: string,
  configuredPath: string | undefined,
  defaultFileName: string,
): string =>
  path.resolve(
    process.cwd(),
    configuredPath ?? path.join(outputDirectory, defaultFileName),
  );

const printBenchmarkResult = (result: BenchmarkResult): void => {
  const heap =
    result.heapBytes === undefined
      ? "n/a"
      : `${(result.heapBytes / (1024 * 1024)).toFixed(2)} MiB`;
  writeLine(
    `[bench] ${result.name}: median=${result.medianMs.toFixed(3)}ms p95=${result.p95Ms.toFixed(3)}ms heap=${heap}`,
  );
};

const readBaseline = async (
  baselinePath: string | undefined,
): Promise<BenchmarkReport | undefined> => {
  if (!baselinePath) return;

  const baselineJson = await readFile(
    path.resolve(process.cwd(), baselinePath),
    {
      encoding: "utf8",
    },
  );
  return parseBenchmarkReport(baselineJson);
};

const writeReports = async (
  report: BenchmarkReport,
  comparison: BenchmarkComparisonReport | undefined,
): Promise<{ jsonPath: string; markdownPath: string }> => {
  const outputDirectory =
    process.env.BENCH_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIRECTORY;
  const jsonPath = resolveOutputPath(
    outputDirectory,
    process.env.BENCH_JSON,
    "hot-paths.json",
  );
  const markdownPath = resolveOutputPath(
    outputDirectory,
    process.env.BENCH_MARKDOWN,
    "hot-paths.md",
  );

  await Promise.all([
    mkdir(path.dirname(jsonPath), { recursive: true }),
    mkdir(path.dirname(markdownPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, buildMarkdownReport(report, comparison), "utf8"),
  ]);

  return { jsonPath, markdownPath };
};

export const runHotPathBenchmarks = async (): Promise<BenchmarkReport> => {
  const warmups = parsePositiveInteger(
    process.env.BENCH_WARMUPS,
    DEFAULT_WARMUPS,
    "BENCH_WARMUPS",
  );
  const samples = parsePositiveInteger(
    process.env.BENCH_SAMPLES,
    DEFAULT_SAMPLES,
    "BENCH_SAMPLES",
  );
  const collectHeap = process.env.BENCH_COLLECT_HEAP !== "0";
  const benchmarkResults: BenchmarkResult[] = [];

  for (const scenario of createHotPathScenarios()) {
    const result = runBenchmarkScenario(scenario, {
      collectHeap,
      samples,
      warmups,
    });
    benchmarkResults.push(result);
    printBenchmarkResult(result);
  }

  const report: BenchmarkReport = {
    benchmarks: benchmarkResults,
    configuration: { samples, warmups },
    generatedAt: new Date().toISOString(),
    runtime: {
      architecture: process.arch,
      nodeVersion: process.version,
      platform: process.platform,
    },
    schemaVersion: 1,
  };
  const baseline = await readBaseline(process.env.BENCH_BASELINE);
  const comparison = baseline
    ? compareBenchmarkReports(baseline, report)
    : undefined;
  const outputPaths = await writeReports(report, comparison);

  writeLine(`[bench] JSON: ${outputPaths.jsonPath}`);
  writeLine(`[bench] Markdown: ${outputPaths.markdownPath}`);

  if (comparison?.failed) {
    const failures = comparison.comparisons
      .filter((entry) => entry.failures.length > 0)
      .map((entry) => `${entry.name} (${entry.failures.join(", ")})`)
      .join(", ");
    throw new Error(`Hot-path benchmark regression: ${failures}`);
  }

  return report;
};
