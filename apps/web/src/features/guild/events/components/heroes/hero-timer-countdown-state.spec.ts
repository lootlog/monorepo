import { describe, expect, it } from "vitest";
import type { EventTimer } from "../../types/api";
import { getHeroTimerCountdownState } from "./hero-timer-countdown-state";

const timer: EventTimer = {
  npcId: 123,
  world: "tempest",
  minSpawnTime: "2026-07-30T12:00:00.000Z",
  maxSpawnTime: "2026-07-30T15:00:00.000Z",
  npc: {
    name: "Test Hero",
    icon: null,
  },
};

describe("getHeroTimerCountdownState", () => {
  it("keeps waiting when the time to minimum spawn is shorter than the spawn window", () => {
    expect(
      getHeroTimerCountdownState(
        timer,
        new Date("2026-07-30T11:00:00.000Z").getTime(),
      ),
    ).toEqual({
      phase: "waiting",
      timeLeftMilliseconds: 3_600_000,
    });
  });

  it("opens the spawn window exactly at the minimum spawn time", () => {
    expect(
      getHeroTimerCountdownState(
        timer,
        new Date("2026-07-30T12:00:00.000Z").getTime(),
      ),
    ).toEqual({
      phase: "open",
      timeLeftMilliseconds: 10_800_000,
    });
  });

  it("expires exactly at the maximum spawn time", () => {
    expect(
      getHeroTimerCountdownState(
        timer,
        new Date("2026-07-30T15:00:00.000Z").getTime(),
      ),
    ).toEqual({
      phase: "expired",
      timeLeftMilliseconds: 0,
    });
  });
});
