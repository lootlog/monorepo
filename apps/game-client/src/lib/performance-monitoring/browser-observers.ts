import type { PerformanceCollector } from "./performance-collector";

type PerformanceObserverLike = {
  disconnect: () => void;
  observe: (options: {
    buffered?: boolean;
    durationThreshold?: number;
    type: string;
  }) => void;
};

type HeapMemorySnapshot = {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
};

export type BrowserPerformanceEnvironment = {
  cancelAnimationFrame: (handle: number) => void;
  clearInterval: (handle: unknown) => void;
  createObserver: (
    callback: (entries: readonly Record<string, unknown>[]) => void,
  ) => PerformanceObserverLike;
  getHeapMemory: () => HeapMemorySnapshot | null;
  getLootlogRoot: () => HTMLElement | null;
  isDocumentVisible: () => boolean;
  isLootlogSource: (sourceUrl: string) => boolean;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  setInterval: (callback: () => void, delayMs: number) => unknown;
  supportedEntryTypes: readonly string[];
};

type LongAnimationFrameEntry = {
  blockingDuration?: number;
  duration?: number;
  renderStart?: number;
  scripts?: Array<{
    duration?: number;
    forcedStyleAndLayoutDuration?: number;
    invoker?: string;
    sourceFunctionName?: string;
    sourceURL?: string;
  }>;
  startTime?: number;
  styleAndLayoutStart?: number;
};

type EventTimingEntry = {
  duration?: number;
  name?: string;
  processingEnd?: number;
  processingStart?: number;
  startTime?: number;
  target?: Node | null;
};

const FRAME_FREEZE_THRESHOLDS_MS = [1_000, 500, 100, 40] as const;
const HEAP_SAMPLE_INTERVAL_MS = 5_000;

function createDefaultEnvironment(): BrowserPerformanceEnvironment {
  const PerformanceObserverConstructor = globalThis.PerformanceObserver;
  const browserPerformance = performance as Performance & {
    memory?: HeapMemorySnapshot;
  };

  return {
    cancelAnimationFrame: (handle) => cancelAnimationFrame(handle),
    clearInterval: (handle) => window.clearInterval(handle as number),
    createObserver(callback) {
      if (!PerformanceObserverConstructor) {
        return { disconnect: () => undefined, observe: () => undefined };
      }

      return new PerformanceObserverConstructor((list) => {
        callback(
          list.getEntries() as unknown as readonly Record<string, unknown>[],
        );
      });
    },
    getHeapMemory: () => browserPerformance.memory ?? null,
    getLootlogRoot: () => document.getElementById("lootlog-root"),
    isDocumentVisible: () => document.visibilityState === "visible",
    isLootlogSource: (sourceUrl) =>
      /(?:@lootlog|game-client|lootlog-performance)/i.test(sourceUrl),
    requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
    supportedEntryTypes:
      PerformanceObserverConstructor?.supportedEntryTypes ?? [],
  };
}

function getFreezeThreshold(frameDurationMs: number): number {
  return (
    FRAME_FREEZE_THRESHOLDS_MS.find(
      (thresholdMs) => frameDurationMs >= thresholdMs,
    ) ?? 0
  );
}

function startFrameObserver(
  collector: PerformanceCollector,
  environment: BrowserPerformanceEnvironment,
): () => void {
  let animationFrameHandle = 0;
  let previousFrameTimestamp: number | null = null;
  const observeFrame: FrameRequestCallback = (timestamp) => {
    if (!environment.isDocumentVisible()) {
      previousFrameTimestamp = null;
    } else if (previousFrameTimestamp !== null) {
      const frameDurationMs = Math.max(0, timestamp - previousFrameTimestamp);
      collector.record({
        category: "browser",
        data: {
          freezeThresholdMs: getFreezeThreshold(frameDurationMs),
        },
        durationMs: frameDurationMs,
        name: "browser.frame-gap",
      });
    }

    previousFrameTimestamp = timestamp;
    animationFrameHandle = environment.requestAnimationFrame(observeFrame);
  };

  animationFrameHandle = environment.requestAnimationFrame(observeFrame);
  return () => environment.cancelAnimationFrame(animationFrameHandle);
}

function startLongAnimationFrameObserver(
  collector: PerformanceCollector,
  environment: BrowserPerformanceEnvironment,
): () => void {
  const observer = environment.createObserver((entries) => {
    for (const rawEntry of entries) {
      const entry = rawEntry as LongAnimationFrameEntry;
      const durationMs = entry.duration ?? 0;
      const startTime = entry.startTime ?? 0;
      const renderStart = entry.renderStart ?? 0;
      const styleAndLayoutStart = entry.styleAndLayoutStart ?? 0;
      collector.record({
        category: "browser",
        data: {
          blockingDurationMs: entry.blockingDuration ?? 0,
          freezeThresholdMs: getFreezeThreshold(durationMs),
          renderDurationMs:
            renderStart > 0
              ? Math.max(0, startTime + durationMs - renderStart)
              : 0,
          styleAndLayoutDurationMs:
            styleAndLayoutStart > 0
              ? Math.max(0, startTime + durationMs - styleAndLayoutStart)
              : 0,
          workDurationMs:
            renderStart > 0 ? Math.max(0, renderStart - startTime) : durationMs,
        },
        durationMs,
        name: "browser.long-animation-frame",
      });

      for (const script of entry.scripts ?? []) {
        const sourceUrl = script.sourceURL ?? "";
        if (!environment.isLootlogSource(sourceUrl)) continue;

        collector.record({
          category: "browser",
          data: {
            forcedStyleAndLayoutDurationMs:
              script.forcedStyleAndLayoutDuration ?? 0,
            function: (
              script.sourceFunctionName ||
              script.invoker ||
              "unknown"
            ).slice(0, 160),
            source: "lootlog-bundle",
          },
          durationMs: script.duration ?? 0,
          name: "browser.long-animation-frame.lootlog-script",
        });
      }
    }
  });
  observer.observe({ buffered: true, type: "long-animation-frame" });
  return () => observer.disconnect();
}

function startLongTaskFallback(
  collector: PerformanceCollector,
  environment: BrowserPerformanceEnvironment,
): () => void {
  const observer = environment.createObserver((entries) => {
    for (const entry of entries) {
      const durationMs =
        typeof entry.duration === "number" ? entry.duration : 0;
      collector.record({
        category: "browser",
        data: { freezeThresholdMs: getFreezeThreshold(durationMs) },
        durationMs,
        name: "browser.long-task",
      });
    }
  });
  observer.observe({ buffered: true, type: "longtask" });
  return () => observer.disconnect();
}

function startOverlayEventObserver(
  collector: PerformanceCollector,
  environment: BrowserPerformanceEnvironment,
): () => void {
  const observer = environment.createObserver((entries) => {
    for (const rawEntry of entries) {
      const entry = rawEntry as EventTimingEntry;
      const target = entry.target ?? null;
      if (!target || !environment.getLootlogRoot()?.contains(target)) continue;

      const startTime = entry.startTime ?? 0;
      const processingStart = entry.processingStart ?? startTime;
      const processingEnd = entry.processingEnd ?? processingStart;
      const durationMs = entry.duration ?? 0;
      collector.record({
        category: "browser",
        data: {
          eventType: (entry.name ?? "unknown").slice(0, 80),
          inputDelayMs: Math.max(0, processingStart - startTime),
          presentationDelayMs: Math.max(
            0,
            startTime + durationMs - processingEnd,
          ),
          processingDurationMs: Math.max(0, processingEnd - processingStart),
        },
        durationMs,
        name: "browser.overlay-input",
      });
    }
  });
  observer.observe({ durationThreshold: 16, type: "event" });
  return () => observer.disconnect();
}

function startHeapObserver(
  collector: PerformanceCollector,
  environment: BrowserPerformanceEnvironment,
): () => void {
  const sampleHeap = () => {
    const memory = environment.getHeapMemory();
    if (!memory) return;

    collector.record({
      category: "memory",
      data: {
        heapLimitBytes: memory.jsHeapSizeLimit,
        totalHeapBytes: memory.totalJSHeapSize,
        usedHeapBytes: memory.usedJSHeapSize,
      },
      name: "browser.heap",
    });
  };
  const intervalHandle = environment.setInterval(
    sampleHeap,
    HEAP_SAMPLE_INTERVAL_MS,
  );
  return () => environment.clearInterval(intervalHandle);
}

export function startBrowserPerformanceObservers(
  collector: PerformanceCollector,
  environment = createDefaultEnvironment(),
): () => void {
  const cleanupCallbacks: Array<() => void> = [];
  const startSafely = (name: string, startObserver: () => () => void) => {
    try {
      cleanupCallbacks.push(startObserver());
    } catch {
      collector.record({
        category: "diagnostic",
        data: { observer: name, supported: false },
        name: "browser.observer-unavailable",
      });
    }
  };

  startSafely("animation-frame", () =>
    startFrameObserver(collector, environment),
  );
  startSafely("heap", () => startHeapObserver(collector, environment));

  if (environment.supportedEntryTypes.includes("long-animation-frame")) {
    startSafely("long-animation-frame", () =>
      startLongAnimationFrameObserver(collector, environment),
    );
  } else if (environment.supportedEntryTypes.includes("longtask")) {
    startSafely("longtask", () =>
      startLongTaskFallback(collector, environment),
    );
  }

  if (environment.supportedEntryTypes.includes("event")) {
    startSafely("event", () =>
      startOverlayEventObserver(collector, environment),
    );
  }

  return () => {
    for (const cleanup of cleanupCallbacks) cleanup();
  };
}
