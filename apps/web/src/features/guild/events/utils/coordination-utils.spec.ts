import { describe, expect, it } from "vitest";
import {
  findSelfAssignGap,
  getCoordinationActionLabelKey,
  getCoordinationPriorityLabelKey,
  getCoordinationPriorityTone,
  getCoordinationStatusLabelKey,
  getCoveragePercentage,
} from "./coordination-utils";
import type { EventCoordinationResponseDtoHeroesItem } from "@/lib/api/generated/main/model";

describe("coordination-utils", () => {
  it("maps priorities to stable UI tones and translation keys", () => {
    expect(getCoordinationPriorityTone("CRITICAL")).toBe("destructive");
    expect(getCoordinationPriorityTone("WARNING")).toBe("warning");
    expect(getCoordinationPriorityTone("OK")).toBe("success");
    expect(getCoordinationPriorityTone("IDLE")).toBe("muted");
    expect(getCoordinationPriorityLabelKey("CRITICAL")).toBe(
      "events.coordination.priority.critical",
    );
  });

  it("maps status and action values to translation keys", () => {
    expect(getCoordinationStatusLabelKey("OPEN")).toBe(
      "events.coordination.windowStatus.open",
    );
    expect(getCoordinationActionLabelKey("ASSIGN_MAPS")).toBe(
      "events.coordination.actions.assign_maps",
    );
  });

  it("calculates coverage percentage without dividing by zero", () => {
    expect(getCoveragePercentage({ coveredMaps: 3, totalMaps: 4 })).toBe(75);
    expect(getCoveragePercentage({ coveredMaps: 0, totalMaps: 0 })).toBe(0);
  });

  it("prefers unassigned gaps for self assign action", () => {
    const hero = createHero([
      {
        id: "gap-1",
        mapId: "map-1",
        numericMapId: 1,
        mapName: "Map 1",
        gapType: "UNCOVERED",
        startedAt: "2026-06-19T12:00:00.000Z",
        durationSeconds: 60,
      },
      {
        id: "gap-2",
        mapId: "map-2",
        numericMapId: 2,
        mapName: "Map 2",
        gapType: "UNASSIGNED",
        startedAt: "2026-06-19T12:01:00.000Z",
        durationSeconds: 30,
      },
    ]);

    expect(findSelfAssignGap(hero)?.mapId).toBe("map-2");
  });
});

function createHero(
  activeGaps: EventCoordinationResponseDtoHeroesItem["activeGaps"],
): EventCoordinationResponseDtoHeroesItem {
  return {
    heroId: "hero-1",
    npcId: 123,
    npcName: "Test Hero",
    npcIcon: null,
    npcLvl: null,
    timer: null,
    coverage: {
      totalMaps: 2,
      assignedMaps: 0,
      coveredMaps: 0,
      unassignedMaps: 1,
      uncoveredMaps: 1,
      activeGapCount: activeGaps.length,
    },
    activeGaps,
    priority: "CRITICAL",
    recommendedAction: "ASSIGN_MAPS",
  };
}
