import { describe, expect, it, vi } from "vitest";
import {
  PerformanceCollector,
  type PerformanceCollectorScheduler,
} from "./performance-collector";

function createHarness() {
  let currentTimeMs = 100;
  let scheduledCallback: (() => void) | null = null;
  const scheduler: PerformanceCollectorScheduler = {
    clearTimeout: vi.fn(() => {
      scheduledCallback = null;
    }),
    setTimeout: vi.fn((callback) => {
      scheduledCallback = callback;
      return 1;
    }),
  };
  const collector = new PerformanceCollector({
    now: () => currentTimeMs,
    scheduler,
    wallClockNow: () => 1_800_000_000_000 + currentTimeMs,
  });

  return {
    advanceBy(durationMs: number) {
      currentTimeMs += durationMs;
    },
    collector,
    runAutoStop() {
      scheduledCallback?.();
    },
    scheduler,
  };
}

describe("PerformanceCollector", () => {
  it("records a complete correlated timeline and percentile summaries", () => {
    const harness = createHarness();

    expect(harness.collector.start()).toBe(true);
    harness.collector.runInContext("event:7", () => {
      harness.collector.measure(
        "runtime.envelope",
        "runtime",
        { eventKinds: "other,npc-upsert", npcCount: 3, otherCount: 12 },
        () => harness.advanceBy(18),
      );
      harness.collector.measure(
        "runtime.envelope",
        "runtime",
        { eventKinds: "other", npcCount: 0, otherCount: 2 },
        () => harness.advanceBy(6),
      );
    });

    const report = harness.collector.getReport();

    expect(report.status).toBe("running");
    expect(report.counts).toContainEqual({
      category: "runtime",
      count: 2,
      name: "runtime.envelope",
    });
    expect(report.timeline).toHaveLength(2);
    expect(report.timeline[0]).toMatchObject({
      category: "runtime",
      correlationId: "event:7",
      durationMs: 18,
      name: "runtime.envelope",
    });
    expect(report.summaries).toContainEqual(
      expect.objectContaining({
        count: 2,
        maximumMs: 18,
        name: "runtime.envelope",
        p50Ms: 8,
        p95Ms: 32,
        p99Ms: 32,
      }),
    );
  });

  it("auto-stops after twenty minutes and requires reset before a new session", () => {
    const harness = createHarness();

    harness.collector.start();

    expect(harness.scheduler.setTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      20 * 60 * 1_000,
    );

    harness.advanceBy(20 * 60 * 1_000);
    harness.runAutoStop();

    expect(harness.collector.status).toBe("stopped");
    expect(harness.collector.start()).toBe(false);

    harness.collector.reset();

    expect(harness.collector.status).toBe("idle");
    expect(harness.collector.getReport().timeline).toEqual([]);
    expect(harness.collector.start()).toBe(true);
  });

  it("keeps every detail recorded during the session", () => {
    const harness = createHarness();
    harness.collector.start();

    for (let index = 0; index < 50_001; index += 1) {
      harness.collector.record({
        category: "callback",
        durationMs: 0.25,
        name: "callback.frame",
      });
    }

    expect(harness.collector.getReport().timeline).toHaveLength(50_001);
  });

  it("drops identifying game data from record details", () => {
    const harness = createHarness();
    harness.collector.start();

    harness.collector.record({
      category: "runtime",
      data: {
        accountId: "123",
        eventKinds: "other",
        mapName: "Nithal",
        npcCount: 4,
        rawPayload: "secret",
        world: "tempest",
      },
      name: "runtime.event",
    });

    expect(harness.collector.getReport().timeline[0]?.data).toEqual({
      eventKinds: "other",
      npcCount: 4,
    });
  });

  it("measures serialization cost and size in the serialized report", () => {
    const harness = createHarness();
    harness.collector.start();
    harness.collector.record({ category: "manual", name: "session.mark" });
    harness.advanceBy(3);

    const serializedReport = harness.collector.serializeReport();
    const report = JSON.parse(serializedReport) as ReturnType<
      PerformanceCollector["getReport"]
    >;

    expect(report.selfMonitoring.lastExportDurationMs).toBeGreaterThanOrEqual(
      0,
    );
    expect(report.selfMonitoring.lastExportBytes).toBe(
      new TextEncoder().encode(serializedReport).byteLength,
    );
    expect(report.selfMonitoring.recordingDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("rate-limits warnings and uses a higher threshold for page freeze markers", () => {
    let currentTimeMs = 0;
    const warningSink = vi.fn();
    const collector = new PerformanceCollector({
      now: () => currentTimeMs,
      scheduler: { clearTimeout: vi.fn(), setTimeout: vi.fn(() => 1) },
      warningSink,
    });
    collector.start();

    collector.record({
      category: "browser",
      durationMs: 80,
      name: "browser.frame-gap",
    });
    collector.record({
      category: "callback",
      durationMs: 20,
      name: "callback.slow",
    });
    collector.record({
      category: "callback",
      durationMs: 30,
      name: "callback.rate-limited",
    });
    currentTimeMs = 1_000;
    collector.record({
      category: "browser",
      durationMs: 120,
      name: "browser.long-animation-frame",
    });

    expect(warningSink).toHaveBeenCalledTimes(2);
    expect(warningSink.mock.calls[0]?.[1]).toMatchObject({
      name: "callback.slow",
    });
    expect(warningSink.mock.calls[1]?.[1]).toMatchObject({
      name: "browser.long-animation-frame",
    });
    expect(collector.getReport().freezes).toEqual({
      over1000Ms: 0,
      over100Ms: 0,
      over40Ms: 1,
      over500Ms: 0,
    });
  });
});
