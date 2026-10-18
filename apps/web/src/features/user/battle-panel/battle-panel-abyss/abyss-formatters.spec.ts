import { describe, expect, it } from "vitest";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { findAbyssSeason } from "./abyss-formatters";

const season = (startedAt: number, endedAt: number): AbyssSeason => ({
  id: `abyss-${startedAt}-${endedAt}`,
  startedAt: new Date(startedAt).toISOString(),
  endedAt: new Date(endedAt).toISOString(),
  totalBattles: 1,
  wins: 1,
  losses: 0,
  winRate: 100,
  totalRatingDelta: 10,
  peakRating: null,
  totalPointsGained: null,
});

describe("findAbyssSeason", () => {
  const seasons = [season(3000, 4000), season(1000, 2000)];

  it("finds a season still in progress from a link made before its last battle", () => {
    expect(findAbyssSeason(seasons, "abyss-3000-3500")).toBe(seasons[0]);
  });

  it("does not mistake another season for the linked one", () => {
    expect(findAbyssSeason(seasons, "abyss-5000-6000")).toBeUndefined();
  });
});
