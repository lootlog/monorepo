import { describe, expect, it, vi } from "vitest";
import { PerformanceCollector } from "./performance-collector";
import {
  startBrowserPerformanceObservers,
  type BrowserPerformanceEnvironment,
} from "./browser-observers";

function createCollector() {
  const collector = new PerformanceCollector({
    scheduler: {
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(() => 1),
    },
  });
  collector.start();
  return collector;
}

function createEnvironment() {
  let animationFrameCallback: FrameRequestCallback | null = null;
  let intervalCallback: (() => void) | null = null;
  const observerCallbacks = new Map<
    string,
    (entries: readonly Record<string, unknown>[]) => void
  >();
  const disconnect = vi.fn();
  const lootlogRoot = {
    contains: (target: Node | null) => target === lootlogTarget,
  } as HTMLElement;
  const lootlogTarget = {} as Node;
  const environment: BrowserPerformanceEnvironment = {
    cancelAnimationFrame: vi.fn(),
    clearInterval: vi.fn(),
    createObserver(callback) {
      return {
        disconnect,
        observe(options) {
          observerCallbacks.set(options.type, callback);
        },
      };
    },
    getHeapMemory: () => ({
      jsHeapSizeLimit: 3_000,
      totalJSHeapSize: 2_000,
      usedJSHeapSize: 1_000,
    }),
    getLootlogRoot: () => lootlogRoot,
    isDocumentVisible: () => true,
    isLootlogSource: (sourceUrl) => sourceUrl.includes("game-client"),
    requestAnimationFrame(callback) {
      animationFrameCallback = callback;
      return 9;
    },
    setInterval(callback) {
      intervalCallback = callback;
      return 10;
    },
    supportedEntryTypes: ["event", "long-animation-frame"],
  };

  return {
    disconnect,
    emit(type: string, entries: readonly Record<string, unknown>[]) {
      observerCallbacks.get(type)?.(entries);
    },
    environment,
    lootlogTarget,
    runAnimationFrame(timestamp: number) {
      const callback = animationFrameCallback;
      animationFrameCallback = null;
      callback?.(timestamp);
    },
    runMemorySample() {
      intervalCallback?.();
    },
  };
}

describe("browser performance observers", () => {
  it("records every visible frame interval and freeze severity", () => {
    const collector = createCollector();
    const harness = createEnvironment();
    const cleanup = startBrowserPerformanceObservers(
      collector,
      harness.environment,
    );

    harness.runAnimationFrame(1_000);
    harness.runAnimationFrame(1_016);
    harness.runAnimationFrame(1_566);

    expect(collector.getReport().timeline).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({ freezeThresholdMs: 500 }),
        durationMs: 550,
        name: "browser.frame-gap",
      }),
    );

    cleanup();
    expect(harness.environment.cancelAnimationFrame).toHaveBeenCalledWith(9);
  });

  it("keeps whole-frame symptoms but attributes scripts only to Lootlog", () => {
    const collector = createCollector();
    const harness = createEnvironment();
    startBrowserPerformanceObservers(collector, harness.environment);

    harness.emit("long-animation-frame", [
      {
        blockingDuration: 40,
        duration: 140,
        renderStart: 80,
        scripts: [
          {
            duration: 35,
            forcedStyleAndLayoutDuration: 4,
            invoker: "Window.requestAnimationFrame",
            sourceFunctionName: "refreshRows",
            sourceURL: "https://cdn.example/game-client.user.js?token=secret",
          },
          {
            duration: 90,
            forcedStyleAndLayoutDuration: 10,
            invoker: "Window.requestAnimationFrame",
            sourceFunctionName: "renderGame",
            sourceURL: "https://margonem.pl/game.js",
          },
        ],
        startTime: 20,
        styleAndLayoutStart: 100,
      },
    ]);

    const report = collector.getReport();
    expect(report.timeline).toContainEqual(
      expect.objectContaining({
        durationMs: 140,
        name: "browser.long-animation-frame",
      }),
    );
    expect(report.timeline).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          function: "refreshRows",
          source: "lootlog-bundle",
        }),
        durationMs: 35,
        name: "browser.long-animation-frame.lootlog-script",
      }),
    );
    expect(JSON.stringify(report)).not.toContain("renderGame");
    expect(JSON.stringify(report)).not.toContain("token=secret");
  });

  it("records event timing only for interactions inside the Lootlog root", () => {
    const collector = createCollector();
    const harness = createEnvironment();
    startBrowserPerformanceObservers(collector, harness.environment);

    harness.emit("event", [
      {
        duration: 80,
        name: "click",
        processingEnd: 150,
        processingStart: 130,
        startTime: 100,
        target: harness.lootlogTarget,
      },
      {
        duration: 120,
        name: "keydown",
        processingEnd: 260,
        processingStart: 220,
        startTime: 180,
        target: {} as Node,
      },
    ]);

    expect(
      collector
        .getReport()
        .timeline.filter((entry) => entry.name === "browser.overlay-input"),
    ).toEqual([
      expect.objectContaining({
        data: {
          eventType: "click",
          inputDelayMs: 30,
          presentationDelayMs: 30,
          processingDurationMs: 20,
        },
        durationMs: 80,
      }),
    ]);
  });

  it("samples Chromium heap without identifying page data", () => {
    const collector = createCollector();
    const harness = createEnvironment();
    startBrowserPerformanceObservers(collector, harness.environment);

    harness.runMemorySample();

    expect(collector.getReport().timeline).toContainEqual(
      expect.objectContaining({
        data: {
          heapLimitBytes: 3_000,
          totalHeapBytes: 2_000,
          usedHeapBytes: 1_000,
        },
        name: "browser.heap",
      }),
    );
  });

  it("uses Long Tasks as a fallback when LoAF is unavailable", () => {
    const collector = createCollector();
    const harness = createEnvironment();
    harness.environment.supportedEntryTypes = ["longtask"];
    startBrowserPerformanceObservers(collector, harness.environment);

    harness.emit("longtask", [{ duration: 180 }]);

    expect(collector.getReport().timeline).toContainEqual(
      expect.objectContaining({
        data: { freezeThresholdMs: 100 },
        durationMs: 180,
        name: "browser.long-task",
      }),
    );
  });

  it("isolates unsupported observer failures from the monitored app", () => {
    const collector = createCollector();
    const harness = createEnvironment();
    harness.environment.createObserver = () => {
      throw new Error("unsupported");
    };

    expect(() =>
      startBrowserPerformanceObservers(collector, harness.environment),
    ).not.toThrow();
    expect(collector.getReport().timeline).toContainEqual(
      expect.objectContaining({
        data: { observer: "long-animation-frame", supported: false },
        name: "browser.observer-unavailable",
      }),
    );
  });
});
