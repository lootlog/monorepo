import { describe, expect, it } from "vitest";
import { buildMarkdownReport } from "../../../benchmarks/hot-paths/benchmark-markdown";
import type { BenchmarkReport } from "../../../benchmarks/hot-paths/benchmark-report";

describe("buildMarkdownReport", () => {
  it("renders timing, heap, and hard assertion results", () => {
    const report: BenchmarkReport = {
      schemaVersion: 1,
      generatedAt: "2026-07-20T00:00:00.000Z",
      runtime: {
        architecture: "arm64",
        nodeVersion: "v24.16.0",
        platform: "darwin",
      },
      configuration: { samples: 25, warmups: 8 },
      benchmarks: [
        {
          assertions: [
            {
              actual: 1,
              expected: 1,
              name: "publications",
              operator: "===",
              passed: true,
            },
          ],
          group: "store",
          heapBytes: 1_048_576,
          kind: "micro",
          maxMs: 1.5,
          medianMs: 1.23456,
          minMs: 1,
          name: "store.batch",
          p95Ms: 1.4,
          samples: 25,
          warmups: 8,
        },
      ],
    };

    const markdown = buildMarkdownReport(report);

    expect(markdown).toContain("| store.batch | micro | 1.235 | 1.400 |");
    expect(markdown).toContain("1.00 MiB");
    expect(markdown).toContain("publications: 1 === 1");
  });
});
