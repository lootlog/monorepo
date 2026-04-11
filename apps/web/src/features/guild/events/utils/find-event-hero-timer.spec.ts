import { describe, expect, it } from "vitest";
import { findEventHeroTimer } from "./find-event-hero-timer";
import type { EventTimer } from "../hooks/queries/use-event-hero-timers";

const baseTimer: EventTimer = {
  npcId: 123,
  world: "tempest",
  minSpawnTime: "2026-03-30T10:00:00.000Z",
  maxSpawnTime: "2026-03-30T11:00:00.000Z",
  npc: {
    name: "Test Hero",
    icon: null,
  },
};

describe("findEventHeroTimer", () => {
  it("should prefer exact npcId and name match", () => {
    const timers: EventTimer[] = [
      {
        ...baseTimer,
        npc: { ...baseTimer.npc, name: "Other Hero" },
      },
      baseTimer,
    ];

    const result = findEventHeroTimer(timers, {
      heroNpcId: 123,
      heroName: "Test Hero",
    });

    expect(result).toEqual(baseTimer);
  });

  it("should fall back to name match when hero uses synthetic flow", () => {
    const result = findEventHeroTimer([baseTimer], {
      heroNpcId: null,
      heroName: "Test Hero",
    });

    expect(result).toEqual(baseTimer);
  });

  it("should fall back to npcId when name is unavailable", () => {
    const result = findEventHeroTimer([baseTimer], {
      heroNpcId: 123,
    });

    expect(result).toEqual(baseTimer);
  });
});
