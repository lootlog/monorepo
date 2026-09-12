import { describe, expect, it } from "vitest";
import { getTimerProgressStyle } from "./timer-progress";

const timer = {
  updatedAt: "2026-04-22T10:00:00.000Z",
  minSpawnTime: "2026-04-22T10:04:00.000Z",
  maxSpawnTime: "2026-04-22T10:05:00.000Z",
};

describe("getTimerProgressStyle", () => {
  it("starts the animation at the elapsed fraction of the full window", () => {
    const now = Date.parse("2026-04-22T10:02:00.000Z");

    expect(getTimerProgressStyle(timer, now)).toMatchObject({
      animationDuration: "300000ms",
      animationDelay: "-120000ms",
    });
  });

  it("draws nothing for an expired timer or a window too short to animate", () => {
    expect(
      getTimerProgressStyle(timer, Date.parse("2026-04-22T10:05:01.000Z")),
    ).toBeUndefined();
    expect(
      getTimerProgressStyle(
        { ...timer, updatedAt: "2026-04-22T10:04:59.500Z" },
        Date.parse("2026-04-22T10:04:59.600Z"),
      ),
    ).toBeUndefined();
  });
});
