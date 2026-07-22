import { describe, expect, it } from "vitest";
import {
  AFTER_GC_HEAP_HEADROOM_BYTES,
  analyzePostGcTrend,
  buildSoakMarkdown,
  createSoakReport,
  getAfterGcHeapLimit,
  type SoakReportInput,
} from "../../../benchmarks/soak/soak-report";

const MEBIBYTE = 1024 * 1024;

const createValidInput = (): SoakReportInput => ({
  durationMs: 1_234,
  heap: {
    afterGcBytes: 22 * MEBIBYTE,
    beforeBytes: 20 * MEBIBYTE,
    peakBytes: 48 * MEBIBYTE,
    postGcSamplesBytes: [
      22 * MEBIBYTE,
      22.1 * MEBIBYTE,
      21.9 * MEBIBYTE,
      22.05 * MEBIBYTE,
      22 * MEBIBYTE,
    ],
  },
  structural: {
    battle: {
      byteLimit: 5 * MEBIBYTE,
      capturesProcessed: 200,
      eventLimit: 10_000,
      expectedCaptures: 200,
      maxRetainedBytes: 256 * 1024,
      maxRetainedEvents: 24,
      overflowedCaptures: 0,
    },
    chat: {
      expectedMessages: 10_000,
      guilds: 10,
      maxMessagesPerGuild: 300,
      messageLimitPerGuild: 300,
      messagesProcessed: 10_000,
      totalRetainedMessages: 3_000,
    },
    lifecycle: {
      airTagClearsVerified: 100,
      distinctMapIds: 100,
      expectedMapChanges: 100,
      expectedNpcClearedTransitions: 99,
      expectedResets: 100,
      interactionCancelsVerified: 100,
      mapChangesPerIteration: 100,
      mapChangesProcessed: 100,
      mapPingClearsVerified: 100,
      npcClearedTransitions: 99,
      resetsCompleted: 100,
      transientRecordsAfterReset: 0,
    },
    logs: {
      actionLimit: 200,
      byteLimit: 5 * MEBIBYTE,
      capturesProcessed: 200,
      expectedCaptures: 200,
      retainedActions: 20,
      retainedBytes: 4 * MEBIBYTE,
    },
    notifications: {
      autoHideDeadlines: 50,
      expectedNotifications: 10_000,
      notificationLimit: 50,
      notificationsProcessed: 10_000,
      retainedNotifications: 50,
    },
  },
});

describe("soak report gates", () => {
  it("uses the larger of 5 MiB additive and 10% relative heap headroom", () => {
    expect(getAfterGcHeapLimit(20 * MEBIBYTE)).toBe(
      20 * MEBIBYTE + AFTER_GC_HEAP_HEADROOM_BYTES,
    );
    expect(getAfterGcHeapLimit(100 * MEBIBYTE)).toBe(110 * MEBIBYTE);
  });

  it("passes a workload within heap and structural budgets", () => {
    const report = createSoakReport(createValidInput());

    expect(report.gate.passed).toBe(true);
    expect(report.gate.failures).toEqual([]);
    expect(report.heap.afterGcLimitBytes).toBe(25 * MEBIBYTE);
  });

  it("fails heap growth above the calculated after-GC limit", () => {
    const input = createValidInput();
    input.heap.afterGcBytes = 26 * MEBIBYTE;

    const report = createSoakReport(input);

    expect(report.gate.passed).toBe(false);
    expect(report.gate.failures).toContain(
      "after-GC heap exceeds max(baseline + 5 MiB, baseline x 1.10)",
    );
  });

  it("accepts stable post-GC samples with ordinary jitter", () => {
    const baselineBytes = 40 * MEBIBYTE;
    const trend = analyzePostGcTrend(baselineBytes, [
      40.2 * MEBIBYTE,
      39.9 * MEBIBYTE,
      40.3 * MEBIBYTE,
      40.1 * MEBIBYTE,
      40.25 * MEBIBYTE,
    ]);

    expect(trend.monotonicGrowthDetected).toBe(false);
    expect(trend.passed).toBe(true);
  });

  it("ignores a single post-GC spike that returns to steady state", () => {
    const baselineBytes = 40 * MEBIBYTE;
    const trend = analyzePostGcTrend(baselineBytes, [
      40.1 * MEBIBYTE,
      44 * MEBIBYTE,
      40.2 * MEBIBYTE,
      40.3 * MEBIBYTE,
      40.15 * MEBIBYTE,
    ]);

    expect(trend.monotonicGrowthDetected).toBe(false);
    expect(trend.passed).toBe(true);
  });

  it("fails a significant monotonic retained-heap trend", () => {
    const baselineBytes = 40 * MEBIBYTE;
    const trend = analyzePostGcTrend(baselineBytes, [
      40.7 * MEBIBYTE,
      41.4 * MEBIBYTE,
      42.2 * MEBIBYTE,
      43.1 * MEBIBYTE,
      44 * MEBIBYTE,
    ]);

    expect(trend.totalGrowthBytes).toBeGreaterThanOrEqual(3 * MEBIBYTE);
    expect(trend.monotonicGrowthDetected).toBe(true);
    expect(trend.passed).toBe(false);
  });

  it("fails the report gate on significant monotonic growth below the absolute cap", () => {
    const input = createValidInput();
    input.heap.beforeBytes = 40 * MEBIBYTE;
    input.heap.afterGcBytes = 44 * MEBIBYTE;
    input.heap.postGcSamplesBytes = [
      40.7 * MEBIBYTE,
      41.4 * MEBIBYTE,
      42.2 * MEBIBYTE,
      43.1 * MEBIBYTE,
      44 * MEBIBYTE,
    ];

    const report = createSoakReport(input);

    expect(report.heap.afterGcBytes).toBeLessThan(
      report.heap.afterGcLimitBytes,
    );
    expect(report.gate.passed).toBe(false);
    expect(report.gate.failures).toContain(
      "post-GC heap trend shows significant monotonic growth",
    );
  });

  it("accepts a monotonic drift below the significant-growth floor", () => {
    const baselineBytes = 40 * MEBIBYTE;
    const trend = analyzePostGcTrend(baselineBytes, [
      40.1 * MEBIBYTE,
      40.2 * MEBIBYTE,
      40.3 * MEBIBYTE,
      40.4 * MEBIBYTE,
      40.5 * MEBIBYTE,
    ]);

    expect(trend.monotonicGrowthDetected).toBe(false);
    expect(trend.passed).toBe(true);
  });

  it("detects cumulative monotonic growth even when each step is below jitter", () => {
    const baselineBytes = 40 * MEBIBYTE;
    const trend = analyzePostGcTrend(baselineBytes, [
      40.45 * MEBIBYTE,
      40.9 * MEBIBYTE,
      41.35 * MEBIBYTE,
      41.8 * MEBIBYTE,
      42.25 * MEBIBYTE,
    ]);

    expect(trend.monotonicGrowthDetected).toBe(true);
    expect(trend.passed).toBe(false);
  });

  it("fails when too few post-GC samples make the trend unreliable", () => {
    const trend = analyzePostGcTrend(40 * MEBIBYTE, [
      40.1 * MEBIBYTE,
      40.2 * MEBIBYTE,
    ]);

    expect(trend.hasEnoughSamples).toBe(false);
    expect(trend.passed).toBe(false);
  });

  it("fails every retained structure that exceeds its cap", () => {
    const input = createValidInput();
    input.structural.chat.maxMessagesPerGuild = 301;
    input.structural.notifications.retainedNotifications = 51;
    input.structural.logs.retainedBytes = 5 * MEBIBYTE + 1;
    input.structural.battle.maxRetainedEvents = 10_001;
    input.structural.lifecycle.transientRecordsAfterReset = 1;

    const report = createSoakReport(input);

    expect(report.gate.passed).toBe(false);
    expect(report.gate.failures).toEqual(
      expect.arrayContaining([
        "lifecycle reset retained transient records",
        "chat exceeded 300 messages per guild",
        "notifications exceeded retained record cap",
        "battle capture exceeded event cap",
        "logs exceeded serialized byte cap",
      ]),
    );
  });

  it("fails an incomplete real map-change lifecycle workload", () => {
    const input = createValidInput();
    input.structural.lifecycle.mapChangesProcessed = 99;
    input.structural.lifecycle.npcClearedTransitions = 98;
    input.structural.lifecycle.mapPingClearsVerified = 99;
    input.structural.lifecycle.interactionCancelsVerified = 99;
    input.structural.lifecycle.airTagClearsVerified = 99;

    const report = createSoakReport(input);

    expect(report.gate.passed).toBe(false);
    expect(report.gate.failures).toEqual(
      expect.arrayContaining([
        "map-change workload was incomplete",
        "map changes did not clear NPC state",
        "map changes did not clear map-ping state",
        "map changes did not cancel map-ping interaction",
        "map changes did not clear AirTag state",
      ]),
    );
  });

  it("renders heap and structural results in Markdown", () => {
    const markdown = buildSoakMarkdown(createSoakReport(createValidInput()));

    expect(markdown).toContain("# Game client retained-heap soak");
    expect(markdown).toContain(
      "| After full GC | 22.00 MiB | 25.00 MiB | PASS |",
    );
    expect(markdown).toContain("| Chat messages | 10,000 processed");
    expect(markdown).toContain("100 map changes (1 × 100 distinct)");
    expect(markdown).toContain("## Post-GC trend");
    expect(markdown).toContain("Overall: **PASS**");
  });
});
