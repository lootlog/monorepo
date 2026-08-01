import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerformanceCollector } from "./performance-monitoring/performance-collector";

const performanceMocks = vi.hoisted(() => ({
  recordPerformance: vi.fn(),
}));

vi.mock(
  "@/lib/performance-monitoring/performance-monitor",
  () => performanceMocks,
);

import {
  captureReactError,
  getReactRootErrorHandlers,
  reportApiActionFailure,
  reportLootSkipped,
} from "./local-diagnostics";

describe("local diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("records counts without player, NPC, map, or world identifiers", () => {
    reportLootSkipped({
      attemptId: "private-attempt",
      eventNpcDelIds: [601, 602],
      mapName: "private-map",
      reason: "missing-dialog-npc-snapshot",
      requestedNpcIds: [501],
      resolvedNpcCount: 0,
      source: "dialog",
      world: "private-world",
    });

    const diagnostic = performanceMocks.recordPerformance.mock.calls[0]?.[0];
    expect(diagnostic).toEqual({
      category: "diagnostic",
      data: {
        eventNpcDeletionCount: 2,
        reason: "missing-dialog-npc-snapshot",
        requestedNpcCount: 1,
        resolvedNpcCount: 0,
        source: "dialog",
      },
      name: "loot.skipped",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("private");
  });

  it("normalizes API identifiers and records only safe aggregate context", () => {
    reportApiActionFailure({
      actionId: "private-action",
      actionType: "create_loot",
      failedRequests: [
        {
          endpoint: "/loots/123?token=private",
          error: new Error("private error"),
          method: "POST",
          statusCode: 500,
        },
      ],
      monitoringContext: {
        mapName: "private-map",
        npcIds: [501],
        world: "private-world",
      },
      requestAttemptCount: 2,
      status: "error",
    });

    const diagnostic = performanceMocks.recordPerformance.mock.calls[0]?.[0];
    expect(diagnostic.data.endpoint).toBe("/loots/:id");
    expect(JSON.stringify(diagnostic)).not.toContain("private");
  });

  it("provides React root handlers and records boundary metadata only", () => {
    const handlers = getReactRootErrorHandlers();
    handlers.onRecoverableError?.(new TypeError("private"), {
      componentStack: "private-stack",
    });
    captureReactError(new Error("private"), {
      componentStack: "private-stack",
    });

    expect(performanceMocks.recordPerformance).toHaveBeenCalledTimes(2);
    expect(
      performanceMocks.recordPerformance.mock.calls.map(([record]) => record),
    ).toEqual([
      {
        category: "diagnostic",
        data: { errorKind: "TypeError" },
        name: "error.react.recoverable",
      },
      {
        category: "diagnostic",
        data: { errorKind: "Error", hasComponentStack: true },
        name: "error.react.boundary",
      },
    ]);
  });

  it("remains compatible with collector privacy guards", () => {
    const collector = new PerformanceCollector();
    collector.start();
    collector.record({
      category: "diagnostic",
      data: { mapName: "private", safeCount: 1 },
      name: "diagnostic",
    });

    expect(collector.getReport().timeline[0]?.data).toEqual({ safeCount: 1 });
  });
});
