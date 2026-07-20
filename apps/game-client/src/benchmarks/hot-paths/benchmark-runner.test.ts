import { describe, expect, it } from "vitest";
import {
  calculateDistribution,
  runBenchmarkScenario,
} from "../../../benchmarks/hot-paths/benchmark-runner";

describe("calculateDistribution", () => {
  it("calculates a median and nearest-rank p95 from unsorted samples", () => {
    expect(calculateDistribution([4, 1, 3, 2])).toEqual({
      max: 4,
      median: 2.5,
      min: 1,
      p95: 4,
    });
  });
});

describe("runBenchmarkScenario", () => {
  it("uses the configured number of warmups and measured samples", () => {
    let cleanupCount = 0;
    let prepareCount = 0;
    let runCount = 0;

    const result = runBenchmarkScenario(
      {
        group: "runner",
        kind: "micro",
        name: "runner.sample-count",
        prepare: () => {
          prepareCount += 1;
          return {
            cleanup: () => {
              cleanupCount += 1;
            },
            run: () => {
              runCount += 1;
            },
          };
        },
      },
      { collectHeap: false, samples: 5, warmups: 2 },
    );

    expect(result.samples).toBe(5);
    expect(result.warmups).toBe(2);
    expect({ cleanupCount, prepareCount, runCount }).toEqual({
      cleanupCount: 7,
      prepareCount: 7,
      runCount: 7,
    });
  });

  it("cleans up a prepared scenario when a hard assertion fails", () => {
    let cleanupCount = 0;

    expect(() =>
      runBenchmarkScenario(
        {
          group: "runner",
          kind: "micro",
          name: "runner.assertion-failure",
          prepare: () => ({
            cleanup: () => {
              cleanupCount += 1;
            },
            run: () => ({
              assertions: [
                {
                  actual: 2,
                  expected: 1,
                  name: "publications",
                  operator: "===",
                  passed: false,
                },
              ],
            }),
          }),
        },
        { collectHeap: false, samples: 1, warmups: 0 },
      ),
    ).toThrow("publications expected === 1, received 2");
    expect(cleanupCount).toBe(1);
  });

  it("evaluates observations after the measured operation", () => {
    let operationCompleted = false;

    const result = runBenchmarkScenario(
      {
        group: "runner",
        kind: "micro",
        name: "runner.deferred-observation",
        prepare: () => ({
          observe: () => ({
            assertions: [
              {
                actual: Number(operationCompleted),
                expected: 1,
                name: "operation completed",
                operator: "===",
                passed: operationCompleted,
              },
            ],
          }),
          run: () => {
            operationCompleted = true;
          },
        }),
      },
      { collectHeap: false, samples: 1, warmups: 0 },
    );

    expect(result.assertions).toEqual([
      expect.objectContaining({
        name: "operation completed",
        passed: true,
      }),
    ]);
  });

  it("records a passing hard p95 budget in the benchmark assertions", () => {
    const result = runBenchmarkScenario(
      {
        group: "runner",
        hardP95LimitMs: 1_000,
        kind: "micro",
        name: "runner.hard-p95-pass",
        prepare: () => ({ run: () => undefined }),
      },
      { collectHeap: false, samples: 3, warmups: 0 },
    );

    expect(result.assertions).toContainEqual({
      actual: result.p95Ms,
      expected: 1_000,
      name: "p95 duration",
      operator: "<=",
      passed: true,
    });
  });

  it("fails the benchmark when a hard p95 budget is exceeded", () => {
    expect(() =>
      runBenchmarkScenario(
        {
          group: "runner",
          hardP95LimitMs: 0,
          kind: "micro",
          name: "runner.hard-p95-failure",
          prepare: () => ({ run: () => undefined }),
        },
        { collectHeap: false, samples: 1, warmups: 0 },
      ),
    ).toThrow("p95 duration expected <= 0");
  });
});
