export const PERFORMANCE_SESSION_DURATION_MS = 20 * 60 * 1_000;

const HISTOGRAM_UPPER_BOUNDS_MS = [
  0.1,
  0.25,
  0.5,
  1,
  2,
  4,
  8,
  16,
  32,
  50,
  100,
  250,
  500,
  1_000,
  2_000,
  5_000,
  Number.POSITIVE_INFINITY,
] as const;

const PRIVATE_DETAIL_KEY_PATTERN =
  /(account|character|map|nickname|npcid|payload|raw|selector|world)/i;
const SERIALIZED_MEASUREMENT_PLACEHOLDER = 987_654_321_012_345;
const SERIALIZED_MEASUREMENT_WIDTH = String(
  SERIALIZED_MEASUREMENT_PLACEHOLDER,
).length;

export type PerformanceMonitoringStatus = "idle" | "running" | "stopped";

export type PerformanceDetailValue = boolean | number | string | null;
export type PerformanceDetails = Record<string, PerformanceDetailValue>;

export type PerformanceRecordInput = {
  category: string;
  correlationId?: string;
  data?: PerformanceDetails;
  durationMs?: number;
  name: string;
};

export type PerformanceTimelineRecord = Readonly<{
  category: string;
  correlationId?: string;
  data?: PerformanceDetails;
  durationMs?: number;
  name: string;
  sequence: number;
  timestampMs: number;
}>;

export type PerformanceMetricSummary = Readonly<{
  category: string;
  count: number;
  maximumMs: number;
  meanMs: number;
  minimumMs: number;
  name: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  totalMs: number;
}>;

export type PerformanceRecordCount = Readonly<{
  category: string;
  count: number;
  name: string;
}>;

export type PerformanceReport = Readonly<{
  apiVersion: 1;
  counts: readonly PerformanceRecordCount[];
  endedAt: string | null;
  freezes: Readonly<{
    over1000Ms: number;
    over100Ms: number;
    over40Ms: number;
    over500Ms: number;
  }>;
  selfMonitoring: Readonly<{
    lastExportBytes: number;
    lastExportDurationMs: number;
    recordingDurationMs: number;
  }>;
  sessionId: string;
  startedAt: string | null;
  status: PerformanceMonitoringStatus;
  summaries: readonly PerformanceMetricSummary[];
  timeline: readonly PerformanceTimelineRecord[];
}>;

export type PerformanceCollectorScheduler = {
  clearTimeout: (handle: unknown) => void;
  setTimeout: (callback: () => void, delayMs: number) => unknown;
};

type PerformanceCollectorOptions = {
  autoStopAfterMs?: number;
  now?: () => number;
  scheduler?: PerformanceCollectorScheduler;
  wallClockNow?: () => number;
  warningSink?: (message: string, record: PerformanceTimelineRecord) => void;
};

type MutableMetricSummary = {
  category: string;
  count: number;
  histogram: number[];
  maximumMs: number;
  minimumMs: number;
  name: string;
  totalMs: number;
};

type MutableRecordCount = {
  category: string;
  count: number;
  name: string;
};

const defaultScheduler: PerformanceCollectorScheduler = {
  clearTimeout: (handle) => window.clearTimeout(handle as number),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
};

function sanitizeDetails(
  details: PerformanceDetails | undefined,
): PerformanceDetails | undefined {
  if (!details) return undefined;

  const sanitizedEntries = Object.entries(details).filter(
    ([key]) => !PRIVATE_DETAIL_KEY_PATTERN.test(key),
  );
  if (sanitizedEntries.length === 0) return undefined;

  return Object.fromEntries(
    sanitizedEntries.map(([key, value]) => [
      key,
      typeof value === "string" ? value.slice(0, 256) : value,
    ]),
  );
}

function getHistogramIndex(durationMs: number): number {
  const index = HISTOGRAM_UPPER_BOUNDS_MS.findIndex(
    (upperBound) => durationMs <= upperBound,
  );
  return index === -1 ? HISTOGRAM_UPPER_BOUNDS_MS.length - 1 : index;
}

function getPercentile(
  histogram: readonly number[],
  count: number,
  percentile: number,
  maximumMs: number,
): number {
  const targetCount = Math.max(1, Math.ceil(count * percentile));
  let observedCount = 0;

  for (let index = 0; index < histogram.length; index += 1) {
    observedCount += histogram[index] ?? 0;
    if (observedCount < targetCount) continue;

    const upperBound = HISTOGRAM_UPPER_BOUNDS_MS[index];
    return Number.isFinite(upperBound) ? upperBound : maximumMs;
  }

  return maximumMs;
}

function toIsoTimestamp(timestampMs: number | null): string | null {
  return timestampMs === null ? null : new Date(timestampMs).toISOString();
}

function replaceSerializedMeasurement(
  serializedReport: string,
  key: "lastExportBytes" | "lastExportDurationMs",
  value: number,
): string {
  const marker = `"${key}":${SERIALIZED_MEASUREMENT_PLACEHOLDER}`;
  const roundedValue = Math.round(value * 1_000) / 1_000;
  const compactValue = String(roundedValue);
  const replacementValue = compactValue
    .slice(0, SERIALIZED_MEASUREMENT_WIDTH)
    .padEnd(SERIALIZED_MEASUREMENT_WIDTH, " ");
  return serializedReport.replace(marker, `"${key}":${replacementValue}`);
}

export class PerformanceCollector {
  private readonly autoStopAfterMs: number;
  private readonly now: () => number;
  private readonly scheduler: PerformanceCollectorScheduler;
  private readonly wallClockNow: () => number;
  private readonly warningSink?: PerformanceCollectorOptions["warningSink"];
  private readonly timeline: PerformanceTimelineRecord[] = [];
  private readonly metricSummaries = new Map<string, MutableMetricSummary>();
  private readonly recordCounts = new Map<string, MutableRecordCount>();
  private readonly contextStack: string[] = [];
  private readonly statusListeners = new Set<
    (status: PerformanceMonitoringStatus) => void
  >();
  private autoStopHandle: unknown = null;
  private endedAtMs: number | null = null;
  private lastExportBytes = 0;
  private lastExportDurationMs = 0;
  private lastWarningAtMs = Number.NEGATIVE_INFINITY;
  private nextSequence = 0;
  private recordingDurationMs = 0;
  private freezeCounts = {
    over1000Ms: 0,
    over100Ms: 0,
    over40Ms: 0,
    over500Ms: 0,
  };
  private sessionIdentifier = "unstarted";
  private sessionStartedAtMonotonicMs = 0;
  private startedAtMs: number | null = null;
  status: PerformanceMonitoringStatus = "idle";

  constructor(options: PerformanceCollectorOptions = {}) {
    this.autoStopAfterMs =
      options.autoStopAfterMs ?? PERFORMANCE_SESSION_DURATION_MS;
    this.now = options.now ?? (() => performance.now());
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.wallClockNow = options.wallClockNow ?? (() => Date.now());
    this.warningSink = options.warningSink;
  }

  start(): boolean {
    if (this.status !== "idle") return false;

    this.status = "running";
    this.startedAtMs = this.wallClockNow();
    this.endedAtMs = null;
    this.sessionStartedAtMonotonicMs = this.now();
    this.sessionIdentifier = `performance-${this.startedAtMs}`;
    this.autoStopHandle = this.scheduler.setTimeout(
      () => this.stop(),
      this.autoStopAfterMs,
    );
    this.notifyStatusListeners();
    return true;
  }

  stop(): boolean {
    if (this.status !== "running") return false;

    this.status = "stopped";
    this.endedAtMs = this.wallClockNow();
    if (this.autoStopHandle !== null) {
      this.scheduler.clearTimeout(this.autoStopHandle);
      this.autoStopHandle = null;
    }
    this.notifyStatusListeners();
    return true;
  }

  reset(): void {
    if (this.autoStopHandle !== null) {
      this.scheduler.clearTimeout(this.autoStopHandle);
      this.autoStopHandle = null;
    }
    this.timeline.length = 0;
    this.metricSummaries.clear();
    this.recordCounts.clear();
    this.contextStack.length = 0;
    this.endedAtMs = null;
    this.lastExportBytes = 0;
    this.lastExportDurationMs = 0;
    this.lastWarningAtMs = Number.NEGATIVE_INFINITY;
    this.nextSequence = 0;
    this.recordingDurationMs = 0;
    this.freezeCounts = {
      over1000Ms: 0,
      over100Ms: 0,
      over40Ms: 0,
      over500Ms: 0,
    };
    this.sessionIdentifier = "unstarted";
    this.startedAtMs = null;
    this.status = "idle";
    this.notifyStatusListeners();
  }

  subscribeStatus(
    listener: (status: PerformanceMonitoringStatus) => void,
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  runInContext<Result>(correlationId: string, callback: () => Result): Result {
    this.contextStack.push(correlationId);
    try {
      return callback();
    } finally {
      this.contextStack.pop();
    }
  }

  measure<Result>(
    name: string,
    category: string,
    data: PerformanceDetails | undefined,
    callback: () => Result,
  ): Result {
    if (this.status !== "running") return callback();

    const startedAt = this.now();
    try {
      return callback();
    } finally {
      this.record({
        category,
        data,
        durationMs: this.now() - startedAt,
        name,
      });
    }
  }

  record(input: PerformanceRecordInput): void {
    if (this.status !== "running") return;

    try {
      this.recordUnchecked(input);
    } catch {
      // Diagnostics must never change Lootlog runtime behavior.
    }
  }

  private recordUnchecked(input: PerformanceRecordInput): void {
    const recordingStartedAt = this.now();
    const durationMs =
      input.durationMs === undefined
        ? undefined
        : Math.max(0, input.durationMs);
    const correlationId =
      input.correlationId ?? this.contextStack.at(-1) ?? undefined;
    this.nextSequence += 1;
    const record: PerformanceTimelineRecord = Object.freeze({
      category: input.category,
      ...(correlationId ? { correlationId } : {}),
      ...(input.data ? { data: sanitizeDetails(input.data) } : {}),
      ...(durationMs === undefined ? {} : { durationMs }),
      name: input.name.slice(0, 160),
      sequence: this.nextSequence,
      timestampMs: this.now() - this.sessionStartedAtMonotonicMs,
    });

    this.timeline.push(record);
    this.updateRecordCount(input.category, input.name);
    this.updateFreezeCounts(record);
    if (durationMs !== undefined) {
      this.updateSummary(input.category, input.name, durationMs);
      this.warnAboutSlowRecord(record);
    }
    this.recordingDurationMs += this.now() - recordingStartedAt;
  }

  getReport(): PerformanceReport {
    return Object.freeze({
      apiVersion: 1,
      counts: [...this.recordCounts.values()]
        .map((count) => Object.freeze({ ...count }))
        .sort((left, right) => right.count - left.count),
      endedAt: toIsoTimestamp(this.endedAtMs),
      freezes: Object.freeze({ ...this.freezeCounts }),
      selfMonitoring: Object.freeze({
        lastExportBytes: this.lastExportBytes,
        lastExportDurationMs: this.lastExportDurationMs,
        recordingDurationMs: this.recordingDurationMs,
      }),
      sessionId: this.sessionIdentifier,
      startedAt: toIsoTimestamp(this.startedAtMs),
      status: this.status,
      summaries: [...this.metricSummaries.values()]
        .map((summary) => this.toMetricSummary(summary))
        .sort((left, right) => right.totalMs - left.totalMs),
      timeline: [...this.timeline],
    });
  }

  serializeReport(): string {
    const startedAt = this.now();
    this.lastExportBytes = SERIALIZED_MEASUREMENT_PLACEHOLDER;
    this.lastExportDurationMs = SERIALIZED_MEASUREMENT_PLACEHOLDER;
    const reportWithPlaceholders = JSON.stringify(this.getReport());
    const exportBytes = new TextEncoder().encode(
      reportWithPlaceholders,
    ).byteLength;
    const reportWithSize = replaceSerializedMeasurement(
      reportWithPlaceholders,
      "lastExportBytes",
      exportBytes,
    );
    const measuredDurationMs = this.now() - startedAt;
    const completedReport = replaceSerializedMeasurement(
      reportWithSize,
      "lastExportDurationMs",
      measuredDurationMs,
    );
    this.lastExportBytes = exportBytes;
    this.lastExportDurationMs = this.now() - startedAt;
    return completedReport;
  }

  private updateSummary(
    category: string,
    name: string,
    durationMs: number,
  ): void {
    const summaryKey = `${category}\u0000${name}`;
    let summary = this.metricSummaries.get(summaryKey);
    if (!summary) {
      summary = {
        category,
        count: 0,
        histogram: Array.from(
          { length: HISTOGRAM_UPPER_BOUNDS_MS.length },
          () => 0,
        ),
        maximumMs: Number.NEGATIVE_INFINITY,
        minimumMs: Number.POSITIVE_INFINITY,
        name,
        totalMs: 0,
      };
      this.metricSummaries.set(summaryKey, summary);
    }

    summary.count += 1;
    summary.totalMs += durationMs;
    summary.minimumMs = Math.min(summary.minimumMs, durationMs);
    summary.maximumMs = Math.max(summary.maximumMs, durationMs);
    const histogramIndex = getHistogramIndex(durationMs);
    summary.histogram[histogramIndex] =
      (summary.histogram[histogramIndex] ?? 0) + 1;
  }

  private updateRecordCount(category: string, name: string): void {
    const countKey = `${category}\u0000${name}`;
    const currentCount = this.recordCounts.get(countKey);
    if (currentCount) {
      currentCount.count += 1;
      return;
    }
    this.recordCounts.set(countKey, { category, count: 1, name });
  }

  private updateFreezeCounts(record: PerformanceTimelineRecord): void {
    if (record.name !== "browser.frame-gap") return;
    const durationMs = record.durationMs ?? 0;
    if (durationMs >= 40) this.freezeCounts.over40Ms += 1;
    if (durationMs >= 100) this.freezeCounts.over100Ms += 1;
    if (durationMs >= 500) this.freezeCounts.over500Ms += 1;
    if (durationMs >= 1_000) this.freezeCounts.over1000Ms += 1;
  }

  private toMetricSummary(
    summary: MutableMetricSummary,
  ): PerformanceMetricSummary {
    return Object.freeze({
      category: summary.category,
      count: summary.count,
      maximumMs: summary.maximumMs,
      meanMs: summary.totalMs / summary.count,
      minimumMs: summary.minimumMs,
      name: summary.name,
      p50Ms: getPercentile(
        summary.histogram,
        summary.count,
        0.5,
        summary.maximumMs,
      ),
      p95Ms: getPercentile(
        summary.histogram,
        summary.count,
        0.95,
        summary.maximumMs,
      ),
      p99Ms: getPercentile(
        summary.histogram,
        summary.count,
        0.99,
        summary.maximumMs,
      ),
      totalMs: summary.totalMs,
    });
  }

  private warnAboutSlowRecord(record: PerformanceTimelineRecord): void {
    const isWholePageFreezeMarker =
      record.name === "browser.frame-gap" ||
      record.name === "browser.long-animation-frame" ||
      record.name === "browser.long-task";
    const warningThresholdMs = isWholePageFreezeMarker ? 100 : 16;
    if (
      !this.warningSink ||
      (record.durationMs ?? 0) < warningThresholdMs ||
      this.now() - this.lastWarningAtMs < 1_000
    ) {
      return;
    }

    this.lastWarningAtMs = this.now();
    this.warningSink(
      `${record.name} took ${record.durationMs?.toFixed(2)} ms`,
      record,
    );
  }

  private notifyStatusListeners(): void {
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch {
        // Diagnostics lifecycle listeners are isolated from the application.
      }
    }
  }
}
