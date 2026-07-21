import { describe, expect, it } from "vitest";
import {
  compareBenchmarkReports,
  parseBenchmarkReport,
  type BenchmarkReport,
} from "../../../benchmarks/hot-paths/benchmark-report";

const createReport = (
  overrides: Partial<BenchmarkReport["benchmarks"][number]> = {},
): BenchmarkReport => ({
  schemaVersion: 1,
  generatedAt: "2026-07-20T00:00:00.000Z",
  runtime: {
    architecture: "arm64",
    nodeVersion: "v24.16.0",
    platform: "darwin",
  },
  configuration: {
    samples: 25,
    warmups: 8,
  },
  benchmarks: [
    {
      assertions: [],
      group: "store",
      heapBytes: 1_000_000,
      kind: "micro",
      maxMs: 1.1,
      medianMs: 1,
      minMs: 0.9,
      name: "store.batch",
      p95Ms: 1.1,
      samples: 25,
      warmups: 8,
      ...overrides,
    },
  ],
});

describe("compareBenchmarkReports", () => {
  it("fails a micro benchmark only when median regression exceeds both gates", () => {
    const belowAbsoluteGate = compareBenchmarkReports(
      createReport(),
      createReport({ medianMs: 1.2 }),
    );
    const aboveBothGates = compareBenchmarkReports(
      createReport(),
      createReport({ medianMs: 1.3 }),
    );

    expect(belowAbsoluteGate.failed).toBe(false);
    expect(aboveBothGates.failed).toBe(true);
    expect(aboveBothGates.comparisons[0].failures).toContain("median");
  });

  it("uses the wider absolute median gate for E2E scenarios", () => {
    const baseline = createReport({ kind: "e2e", medianMs: 10 });

    expect(
      compareBenchmarkReports(
        baseline,
        createReport({ kind: "e2e", medianMs: 11.9 }),
      ).failed,
    ).toBe(false);
    expect(
      compareBenchmarkReports(
        baseline,
        createReport({ kind: "e2e", medianMs: 12.1 }),
      ).comparisons[0].failures,
    ).toContain("median");
  });

  it("fails p95 above fifteen percent without an absolute timing gate", () => {
    const comparison = compareBenchmarkReports(
      createReport({ p95Ms: 1 }),
      createReport({ p95Ms: 1.16 }),
    );

    expect(comparison.comparisons[0].failures).toContain("p95");
  });

  it("fails retained heap only when both heap gates are exceeded", () => {
    const baseline = createReport({ heapBytes: 5 * 1024 * 1024 });
    const belowAbsoluteGate = compareBenchmarkReports(
      baseline,
      createReport({ heapBytes: 6 * 1024 * 1024 }),
    );
    const aboveBothGates = compareBenchmarkReports(
      baseline,
      createReport({ heapBytes: 7 * 1024 * 1024 }),
    );

    expect(belowAbsoluteGate.failed).toBe(false);
    expect(aboveBothGates.comparisons[0].failures).toContain("heap");
  });

  it("fails when a baseline scenario is missing from the candidate", () => {
    const comparison = compareBenchmarkReports(createReport(), {
      ...createReport(),
      benchmarks: [],
    });

    expect(comparison.comparisons[0].failures).toEqual(["missing"]);
    expect(comparison.failed).toBe(true);
  });
});

describe("parseBenchmarkReport", () => {
  it("rejects an input with an unsupported schema", () => {
    const report = createReport();

    expect(() =>
      parseBenchmarkReport(JSON.stringify({ ...report, schemaVersion: 2 })),
    ).toThrow("Unsupported benchmark report schema");
  });

  it("round-trips a valid report", () => {
    const report = createReport();

    expect(parseBenchmarkReport(JSON.stringify(report))).toEqual(report);
  });
});
