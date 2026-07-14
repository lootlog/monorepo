import { describe, expect, it } from "vitest";
import {
  getAssignmentPresence,
  getPrimaryAssignment,
  getRespawnDisplay,
  resolveSelectedEvent,
} from "./event-mode.helpers";

describe("event mode helpers", () => {
  const events = [createEvent("event-1"), createEvent("event-2")];

  it("keeps a stored event while it is available", () => {
    expect(resolveSelectedEvent(events, "event-2")?.id).toBe("event-2");
  });

  it("falls back to the first deterministic event", () => {
    expect(resolveSelectedEvent(events, "missing")?.id).toBe("event-1");
    expect(resolveSelectedEvent([], "missing")).toBeNull();
  });

  it("selects the current map assignment before the first assignment", () => {
    const assignments = [createAssignment(100), createAssignment(200)];

    expect(getPrimaryAssignment(assignments, 200)?.margonemMapId).toBe(200);
    expect(getPrimaryAssignment(assignments, 300)?.margonemMapId).toBe(100);
  });

  it("resolves assignment presence and ignores non-integer map IDs", () => {
    expect(getAssignmentPresence([], 100)).toBe("unassigned");
    expect(getAssignmentPresence([createAssignment(100)], 100)).toBe("on-map");
    expect(getAssignmentPresence([createAssignment(100)], 200)).toBe("off-map");
    expect(
      getAssignmentPresence([createAssignment(Number.NaN)], Number.NaN),
    ).toBe("off-map");
  });

  it("derives waiting, open, and overdue states at exact boundaries", () => {
    const respawn = createRespawn();

    expect(
      getRespawnDisplay(respawn, Date.parse("2026-07-13T11:59:59.000Z")),
    ).toEqual({ state: "waiting", durationMs: 1_000 });
    expect(
      getRespawnDisplay(respawn, Date.parse("2026-07-13T12:00:00.000Z")),
    ).toEqual({ state: "open", durationMs: 3_600_000 });
    expect(
      getRespawnDisplay(respawn, Date.parse("2026-07-13T13:00:00.000Z")),
    ).toEqual({ state: "overdue", durationMs: 0 });
  });

  it("falls back to missing for absent or malformed timers", () => {
    expect(getRespawnDisplay(null, Date.now())).toEqual({ state: "missing" });
    expect(
      getRespawnDisplay(
        {
          ...createRespawn(),
          minSpawnTime: "invalid",
        },
        Date.now(),
      ),
    ).toEqual({ state: "missing" });
  });
});

function createEvent(id: string) {
  return {
    id,
    name: id,
    world: "tempest",
    guild: { id: "guild-1", name: "Gildia" },
    assignments: [],
    nextRespawn: null,
  };
}

function createAssignment(margonemMapId: number) {
  return {
    eventMapId: `map-${margonemMapId}`,
    heroId: "hero-1",
    npcId: 101,
    npcName: "Heros",
    npcIcon: null,
    margonemMapId,
    mapName: "Mapa",
  };
}

function createRespawn() {
  return {
    heroId: "hero-1",
    npcId: null,
    npcName: "Heros",
    minSpawnTime: "2026-07-13T12:00:00.000Z",
    maxSpawnTime: "2026-07-13T13:00:00.000Z",
    status: "WAITING" as const,
  };
}
