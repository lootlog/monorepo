import type {
  BenchmarkComparisonReport,
  BenchmarkReport,
} from "./benchmark-report";

const formatMilliseconds = (value: number): string => value.toFixed(3);

const formatHeap = (heapBytes: number | undefined): string => {
  if (heapBytes === undefined) return "n/a";
  return `${(heapBytes / (1024 * 1024)).toFixed(2)} MiB`;
};

const formatRatio = (ratio: number | undefined): string => {
  if (ratio === undefined) return "n/a";
  if (!Number.isFinite(ratio)) return "+∞";
  return `${ratio >= 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`;
};

const escapeCell = (value: string): string => value.replaceAll("|", "\\|");

const formatAssertions = (
  assertions: BenchmarkReport["benchmarks"][number]["assertions"],
): string => {
  if (assertions.length === 0) return "—";

  return assertions
    .map(
      (assertion) =>
        `${assertion.name}: ${assertion.actual} ${assertion.operator} ${assertion.expected}`,
    )
    .join("<br>");
};

export const buildMarkdownReport = (
  report: BenchmarkReport,
  comparison?: BenchmarkComparisonReport,
): string => {
  const lines = [
    "# Game client hot-path benchmarks",
    "",
    `Generated: ${report.generatedAt}`,
    `Runtime: Node ${report.runtime.nodeVersion}, ${report.runtime.platform}/${report.runtime.architecture}`,
    `Protocol: ${report.configuration.warmups} warmups, ${report.configuration.samples} measured samples`,
    "",
    "| Scenario | Kind | median (ms) | p95 (ms) | min (ms) | max (ms) | retained heap | hard assertions |",
    "|---|---:|---:|---:|---:|---:|---:|---|",
  ];

  for (const benchmark of report.benchmarks) {
    lines.push(
      `| ${escapeCell(benchmark.name)} | ${benchmark.kind} | ${formatMilliseconds(benchmark.medianMs)} | ${formatMilliseconds(benchmark.p95Ms)} | ${formatMilliseconds(benchmark.minMs)} | ${formatMilliseconds(benchmark.maxMs)} | ${formatHeap(benchmark.heapBytes)} | ${formatAssertions(benchmark.assertions)} |`,
    );
  }

  if (comparison) {
    lines.push(
      "",
      "## Baseline comparison",
      "",
      "| Scenario | median Δ | p95 Δ | heap Δ | Result |",
      "|---|---:|---:|---:|---|",
    );

    for (const benchmarkComparison of comparison.comparisons) {
      const result =
        benchmarkComparison.failures.length === 0
          ? "PASS"
          : `FAIL (${benchmarkComparison.failures.join(", ")})`;
      lines.push(
        `| ${escapeCell(benchmarkComparison.name)} | ${formatRatio(benchmarkComparison.medianDeltaRatio)} | ${formatRatio(benchmarkComparison.p95DeltaRatio)} | ${formatRatio(benchmarkComparison.heapDeltaRatio)} | ${result} |`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
};
