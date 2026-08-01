import { describe, expect, it, vi } from "vitest";
import { PerformanceCollector } from "./performance-collector";
import { createPerformanceMonitoringRuntime } from "./performance-monitor";

describe("performance monitoring runtime", () => {
  it("publishes the window API and owns observer lifecycle", () => {
    const collector = new PerformanceCollector({
      scheduler: {
        clearTimeout: vi.fn(),
        setTimeout: vi.fn(() => 1),
      },
    });
    const stopObservers = vi.fn();
    const startObservers = vi.fn(() => stopObservers);
    const runtimeWindow = {} as Window;
    const runtime = createPerformanceMonitoringRuntime({
      collector,
      runtimeWindow,
      startObservers,
    });

    expect(runtimeWindow.lootlogPerformance).toBe(runtime.api);
    expect(runtime.api.apiVersion).toBe(1);
    expect(runtime.api.status).toBe("running");
    expect(startObservers).toHaveBeenCalledOnce();

    runtime.api.mark("before-boss");
    expect(runtime.api.getReport().timeline).toContainEqual(
      expect.objectContaining({
        data: { label: "before-boss" },
        name: "session.mark",
      }),
    );

    expect(runtime.api.stop()).toBe(true);
    expect(stopObservers).toHaveBeenCalledOnce();
    expect(runtime.api.status).toBe("stopped");

    runtime.dispose();
    expect(runtimeWindow.lootlogPerformance).toBeUndefined();
  });

  it("restarts observers only after reset", () => {
    const collector = new PerformanceCollector({
      scheduler: {
        clearTimeout: vi.fn(),
        setTimeout: vi.fn(() => 1),
      },
    });
    const stopObservers = vi.fn();
    const startObservers = vi.fn(() => stopObservers);
    const runtime = createPerformanceMonitoringRuntime({
      collector,
      runtimeWindow: {} as Window,
      startObservers,
    });

    runtime.api.stop();
    expect(runtime.api.start()).toBe(false);

    runtime.api.reset();
    expect(runtime.api.status).toBe("idle");
    expect(runtime.api.start()).toBe(true);
    expect(startObservers).toHaveBeenCalledTimes(2);
  });

  it("prints summaries and downloads the private report locally", () => {
    const collector = new PerformanceCollector({
      scheduler: {
        clearTimeout: vi.fn(),
        setTimeout: vi.fn(() => 1),
      },
    });
    const consoleTable = vi.fn();
    const downloadReport = vi.fn();
    const runtime = createPerformanceMonitoringRuntime({
      collector,
      consoleTable,
      downloadReport,
      runtimeWindow: {} as Window,
      startObservers: () => () => undefined,
    });

    collector.record({
      category: "react",
      durationMs: 20,
      name: "react.Timers",
    });

    runtime.api.printSummary();
    runtime.api.downloadReport();

    expect(consoleTable).toHaveBeenCalledWith([
      expect.objectContaining({ count: 1, name: "react.Timers" }),
    ]);
    expect(downloadReport).toHaveBeenCalledWith(
      expect.stringContaining('"apiVersion":1'),
      expect.stringMatching(/^lootlog-performance-.*\.json$/),
    );
  });

  it("keeps the API usable when browser observers cannot start", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const collector = new PerformanceCollector({
      scheduler: {
        clearTimeout: vi.fn(),
        setTimeout: vi.fn(() => 1),
      },
    });

    expect(() =>
      createPerformanceMonitoringRuntime({
        collector,
        runtimeWindow: {} as Window,
        startObservers: () => {
          throw new Error("unsupported");
        },
      }),
    ).not.toThrow();
    expect(collector.status).toBe("running");
  });
});
