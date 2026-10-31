import { describe, expect, it } from "vitest";
import {
  addFactionWarPoints,
  FACTION_WAR_POINTS_BURST_MS,
  type FactionWarPointsBurst,
} from "./faction-war-points";

const award = (
  points: number,
  faction: "BARBATOS" | "TANROTH" = "BARBATOS",
) => ({
  faction,
  points,
});

const replay = (
  awards: ReadonlyArray<{ at: number; points: number }>,
): FactionWarPointsBurst[] => {
  let burst: FactionWarPointsBurst | null = null;
  const shown: FactionWarPointsBurst[] = [];

  for (const { at, points } of awards) {
    const next = addFactionWarPoints(burst, award(points), at);

    if (next) {
      burst = next;
      shown.push(next);
    }
  }

  return shown;
};

describe("addFactionWarPoints", () => {
  it("adds a kill and its loot into one toast", () => {
    const shown = replay([
      { at: 0, points: 40 },
      { at: 300, points: 12 },
      { at: 300 + FACTION_WAR_POINTS_BURST_MS, points: 40 },
    ]);

    expect(new Set(shown.map((burst) => burst.id)).size).toBe(1);
    expect(shown.at(-1)?.points).toBe(92);
  });

  it("starts a new toast once the burst went quiet", () => {
    const shown = replay([
      { at: 0, points: 40 },
      { at: FACTION_WAR_POINTS_BURST_MS + 1, points: 52 },
    ]);

    expect(shown.map(({ id, points }) => ({ id, points }))).toEqual([
      { id: 1, points: 40 },
      { id: 2, points: 52 },
    ]);
  });

  it("shows nothing for a response without points or at the daily cap", () => {
    const burst = addFactionWarPoints(null, award(40), 0);

    expect(addFactionWarPoints(burst, undefined, 100)).toBeNull();
    expect(addFactionWarPoints(burst, award(0), 100)).toBeNull();
    expect(replay([{ at: 0, points: 0 }])).toEqual([]);
  });
});
