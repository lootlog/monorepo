import { describe, expect, it } from "bun:test";
import {
  getTimerCountdownMs,
  getTimerPhase,
  getTimerTimeLeft,
} from "./timers.js";

const NOW = Date.parse("2026-10-14T12:00:00.000Z");

const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe("timer phases, as the game client and web app show them", () => {
  it.each([
    { min: 60_000, max: 120_000, phase: "waiting" },
    { min: -1, max: 120_000, phase: "window" },
    { min: -60_000, max: -1, phase: "overdue" },
    { min: -60_000, max: -29_999, phase: "overdue" },
    { min: -90_000, max: -30_000, phase: "expired" },
  ] as const)(
    "is $phase with $min ms to the minimum and $max ms to the maximum",
    ({ min, max, phase }) => {
      const timeLeft = getTimerTimeLeft(
        { minSpawnTime: at(min), maxSpawnTime: at(max) },
        NOW,
      );

      expect(getTimerPhase(timeLeft, 30_000)).toBe(phase);
    },
  );

  it("counts a deleted timer down to its deletion", () => {
    const timeLeft = getTimerTimeLeft(
      {
        minSpawnTime: at(60_000),
        maxSpawnTime: at(120_000),
        deletedAt: at(-5_000),
      },
      NOW,
    );

    expect(timeLeft).toEqual({ minTimeLeft: -5_000, maxTimeLeft: -5_000 });
    expect(getTimerPhase(timeLeft, 30_000)).toBe("overdue");
  });

  it("counts a Hero Tracker down to its entrance closing, then to its respawn", () => {
    const timer = {
      entranceClosesAt: at(60_000),
      minSpawnTime: at(60_000 + 45 * 60_000),
      maxSpawnTime: at(60_000 + 135 * 60_000),
    };

    const open = getTimerTimeLeft(timer, NOW);

    expect(getTimerPhase(open, 30_000)).toBe("entrance");
    expect(getTimerCountdownMs(open, "max")).toBe(60_000);
    expect(getTimerCountdownMs(open, "min")).toBe(60_000);

    const closed = getTimerTimeLeft(timer, NOW + 60_000);

    expect(getTimerPhase(closed, 30_000)).toBe("waiting");
    expect(getTimerCountdownMs(closed, "min")).toBe(45 * 60_000);
  });

  it("counts to the minimum spawn only in min mode and only until it passes", () => {
    expect(
      getTimerCountdownMs({ minTimeLeft: 5_000, maxTimeLeft: 10_000 }, "max"),
    ).toBe(10_000);
    expect(
      getTimerCountdownMs({ minTimeLeft: 5_000, maxTimeLeft: 10_000 }, "min"),
    ).toBe(5_000);
    expect(
      getTimerCountdownMs({ minTimeLeft: -1, maxTimeLeft: 10_000 }, "min"),
    ).toBe(10_000);
  });
});
