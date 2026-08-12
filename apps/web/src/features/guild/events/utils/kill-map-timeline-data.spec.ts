import { describe, expect, it } from "vitest";
import type { MapTimelineData } from "../types/api";
import { getKillMapTimelineDiagnostics } from "./kill-map-timeline-data";

const startTime = new Date("2026-08-12T08:00:00.000Z");
const endTime = new Date("2026-08-12T10:00:00.000Z");

describe("getKillMapTimelineDiagnostics", () => {
  it("normalizes overlapping gaps with UNASSIGNED priority", () => {
    const result = getKillMapTimelineDiagnostics(
      createMap({
        gaps: [
          createGap(
            "uncovered-1",
            "UNCOVERED",
            "2026-08-12T08:10:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
          createGap(
            "unassigned-1",
            "UNASSIGNED",
            "2026-08-12T08:20:00.000Z",
            "2026-08-12T08:40:00.000Z",
          ),
          createGap(
            "uncovered-2",
            "UNCOVERED",
            "2026-08-12T08:40:00.000Z",
            "2026-08-12T09:10:00.000Z",
          ),
        ],
      }),
      startTime,
      endTime,
    );

    expect(result.gaps).toEqual([
      expect.objectContaining({
        gapType: "UNCOVERED",
        startedAt: "2026-08-12T08:10:00.000Z",
        endedAt: "2026-08-12T08:20:00.000Z",
        durationSeconds: 600,
        sourceIds: ["uncovered-1"],
      }),
      expect.objectContaining({
        gapType: "UNASSIGNED",
        startedAt: "2026-08-12T08:20:00.000Z",
        endedAt: "2026-08-12T08:40:00.000Z",
        durationSeconds: 1200,
        sourceIds: ["unassigned-1"],
      }),
      expect.objectContaining({
        gapType: "UNCOVERED",
        startedAt: "2026-08-12T08:40:00.000Z",
        endedAt: "2026-08-12T09:10:00.000Z",
        durationSeconds: 1800,
        sourceIds: ["uncovered-1", "uncovered-2"],
      }),
    ]);
    expect(result.uncoveredSeconds).toBe(2400);
    expect(result.unassignedSeconds).toBe(1200);
    expect(result.coveredSeconds).toBe(3600);
    expect(result.coveragePercent).toBe(50);
  });

  it("builds deterministic gap identifiers after merging and splitting", () => {
    const first = getKillMapTimelineDiagnostics(
      createMap({
        gaps: [
          createGap(
            "b",
            "UNCOVERED",
            "2026-08-12T08:00:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
          createGap(
            "a",
            "UNCOVERED",
            "2026-08-12T08:30:00.000Z",
            "2026-08-12T09:30:00.000Z",
          ),
          createGap(
            "priority",
            "UNASSIGNED",
            "2026-08-12T08:45:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
        ],
      }),
      startTime,
      endTime,
    );
    const reordered = getKillMapTimelineDiagnostics(
      createMap({
        gaps: [
          createGap(
            "priority",
            "UNASSIGNED",
            "2026-08-12T08:45:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
          createGap(
            "a",
            "UNCOVERED",
            "2026-08-12T08:30:00.000Z",
            "2026-08-12T09:30:00.000Z",
          ),
          createGap(
            "b",
            "UNCOVERED",
            "2026-08-12T08:00:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
        ],
      }),
      startTime,
      endTime,
    );

    expect(first.gaps.map((gap) => gap.id)).toEqual(
      reordered.gaps.map((gap) => gap.id),
    );
    expect(new Set(first.gaps.map((gap) => gap.id)).size).toBe(
      first.gaps.length,
    );
  });

  it("clips, merges, and groups assignment periods per member", () => {
    const result = getKillMapTimelineDiagnostics(
      createMap({
        assignments: [
          createAssignment(
            "2026-08-12T07:30:00.000Z",
            "2026-08-12T08:30:00.000Z",
          ),
          createAssignment(
            "2026-08-12T08:20:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
          createAssignment(
            "2026-08-12T09:15:00.000Z",
            "2026-08-12T10:30:00.000Z",
          ),
        ],
      }),
      startTime,
      endTime,
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.periods).toEqual([
      expect.objectContaining({
        assignedAt: "2026-08-12T08:00:00.000Z",
        unassignedAt: "2026-08-12T09:00:00.000Z",
        durationSeconds: 3600,
      }),
      expect.objectContaining({
        assignedAt: "2026-08-12T09:15:00.000Z",
        unassignedAt: "2026-08-12T10:00:00.000Z",
        durationSeconds: 2700,
      }),
    ]);
    expect(result.assignments[0]?.totalDurationSeconds).toBe(6300);
  });

  it("clips open gaps and ignores stale API durations and empty intervals", () => {
    const result = getKillMapTimelineDiagnostics(
      createMap({
        gaps: [
          createGap("open", "UNCOVERED", "2026-08-12T09:50:00.000Z", null),
          createGap(
            "empty",
            "UNASSIGNED",
            "2026-08-12T09:00:00.000Z",
            "2026-08-12T09:00:00.000Z",
          ),
          createGap(
            "outside",
            "UNCOVERED",
            "2026-08-12T10:30:00.000Z",
            "2026-08-12T11:00:00.000Z",
          ),
        ],
      }),
      startTime,
      endTime,
    );

    expect(result.gaps).toEqual([
      expect.objectContaining({
        id: expect.stringContaining("open"),
        endedAt: endTime.toISOString(),
        durationSeconds: 600,
      }),
    ]);
    expect(result.coveragePercent).toBe(92);
  });

  it("reports full coverage for an empty valid timeline", () => {
    const result = getKillMapTimelineDiagnostics(
      createMap(),
      startTime,
      endTime,
    );

    expect(result).toEqual(
      expect.objectContaining({
        isValidWindow: true,
        coveragePercent: 100,
        coveredSeconds: 7200,
        gaps: [],
        assignments: [],
      }),
    );
  });

  it("returns an unavailable result for an invalid window", () => {
    const result = getKillMapTimelineDiagnostics(
      createMap(),
      endTime,
      startTime,
    );

    expect(result).toEqual(
      expect.objectContaining({
        isValidWindow: false,
        gaps: [],
        assignments: [],
      }),
    );
  });
});

function createMap(overrides: Partial<MapTimelineData> = {}): MapTimelineData {
  return {
    mapId: "map-1",
    mapName: "Pradawne Wzgórze",
    numericMapId: 123,
    assignments: [],
    gaps: [],
    ...overrides,
  };
}

function createGap(
  id: string,
  gapType: "UNCOVERED" | "UNASSIGNED",
  startedAt: string,
  endedAt: string | null,
): MapTimelineData["gaps"][number] {
  return { id, gapType, startedAt, endedAt, durationSeconds: 1 };
}

function createAssignment(
  assignedAt: string,
  unassignedAt: string | null,
): MapTimelineData["assignments"][number] {
  return {
    memberId: 7,
    memberName: "Tester",
    memberAvatar: null,
    memberUserId: "user-7",
    assignedAt,
    unassignedAt,
  };
}
