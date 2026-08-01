import {
  PerformanceCollector,
  type PerformanceDetails,
  type PerformanceMonitoringStatus,
  type PerformanceRecordInput,
  type PerformanceReport,
} from "./performance-collector";
import { startBrowserPerformanceObservers } from "./browser-observers";

export type LootlogPerformanceApi = Readonly<{
  apiVersion: 1;
  downloadReport: () => void;
  getReport: () => PerformanceReport;
  mark: (label: string) => void;
  printSummary: () => void;
  reset: () => void;
  start: () => boolean;
  readonly status: PerformanceMonitoringStatus;
  stop: () => boolean;
}>;

declare global {
  interface Window {
    lootlogPerformance?: LootlogPerformanceApi;
  }
}

type PerformanceMonitoringRuntimeOptions = {
  collector: PerformanceCollector;
  consoleTable?: (data: unknown) => void;
  downloadReport?: (contents: string, filename: string) => void;
  runtimeWindow: Window;
  startObservers?: (collector: PerformanceCollector) => () => void;
};

type PerformanceMonitoringRuntime = {
  api: LootlogPerformanceApi;
  dispose: () => void;
};

const performanceMonitoringEnabled =
  import.meta.env.VITE_GAME_CLIENT_PERFORMANCE_MONITORING === "1";

let activeCollector: PerformanceCollector | null = null;
let activeRuntime: PerformanceMonitoringRuntime | null = null;

function downloadJsonReport(contents: string, filename: string): void {
  const blobUrl = URL.createObjectURL(
    new Blob([contents], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.download = filename;
  link.href = blobUrl;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export function createPerformanceMonitoringRuntime({
  collector,
  consoleTable = (data) => console.warn("[LootlogPerf] summary", data),
  downloadReport = downloadJsonReport,
  runtimeWindow,
  startObservers = startBrowserPerformanceObservers,
}: PerformanceMonitoringRuntimeOptions): PerformanceMonitoringRuntime {
  let cleanupObservers: (() => void) | null = null;

  const cleanupActiveObservers = () => {
    cleanupObservers?.();
    cleanupObservers = null;
  };
  const unsubscribeStatus = collector.subscribeStatus((status) => {
    if (status !== "running") cleanupActiveObservers();
  });
  const start = (): boolean => {
    if (!collector.start()) return false;
    try {
      cleanupObservers = startObservers(collector);
    } catch (error) {
      console.warn("[LootlogPerf] browser observers unavailable", error);
    }
    return true;
  };

  const api: LootlogPerformanceApi = Object.freeze({
    apiVersion: 1 as const,
    downloadReport() {
      const report = collector.serializeReport();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadReport(report, `lootlog-performance-${timestamp}.json`);
    },
    getReport: () => collector.getReport(),
    mark(label) {
      collector.record({
        category: "manual",
        data: { label: label.slice(0, 128) },
        name: "session.mark",
      });
    },
    printSummary() {
      consoleTable(
        collector.getReport().summaries.map((summary) => ({
          count: summary.count,
          maximumMs: summary.maximumMs,
          meanMs: summary.meanMs,
          name: summary.name,
          p95Ms: summary.p95Ms,
          totalMs: summary.totalMs,
        })),
      );
    },
    reset() {
      cleanupActiveObservers();
      collector.reset();
    },
    start,
    get status() {
      return collector.status;
    },
    stop: () => collector.stop(),
  });

  Object.defineProperty(runtimeWindow, "lootlogPerformance", {
    configurable: true,
    enumerable: true,
    value: api,
    writable: false,
  });
  activeCollector = collector;
  start();

  const runtime: PerformanceMonitoringRuntime = {
    api,
    dispose() {
      collector.stop();
      cleanupActiveObservers();
      unsubscribeStatus();
      if (runtimeWindow.lootlogPerformance === api) {
        delete runtimeWindow.lootlogPerformance;
      }
      if (activeCollector === collector) activeCollector = null;
      if (activeRuntime === runtime) activeRuntime = null;
    },
  };
  return runtime;
}

export function initializePerformanceMonitoring(): void {
  if (!performanceMonitoringEnabled || activeRuntime) return;

  try {
    const collector = new PerformanceCollector({
      warningSink: (message, record) => {
        console.warn("[LootlogPerf]", message, {
          category: record.category,
          correlationId: record.correlationId,
          sequence: record.sequence,
        });
      },
    });
    activeRuntime = createPerformanceMonitoringRuntime({
      collector,
      runtimeWindow: window,
    });
  } catch (error) {
    activeCollector = null;
    console.warn("[LootlogPerf] initialization failed", error);
  }
}

export function recordPerformance(input: PerformanceRecordInput): void {
  if (!performanceMonitoringEnabled) return;
  activeCollector?.record(input);
}

export function measurePerformance<Result>(
  name: string,
  category: string,
  data: PerformanceDetails | undefined,
  callback: () => Result,
): Result {
  if (!performanceMonitoringEnabled || !activeCollector) return callback();
  return activeCollector.measure(name, category, data, callback);
}

export function runWithPerformanceContext<Result>(
  correlationId: string,
  callback: () => Result,
): Result {
  if (!performanceMonitoringEnabled || !activeCollector) return callback();
  return activeCollector.runInContext(correlationId, callback);
}
