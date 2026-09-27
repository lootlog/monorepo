import { describe, expect, it } from "vitest";
import { getRankingSelection } from "./event-ranking-selection";

describe("getRankingSelection", () => {
  const heroes = [
    { npcName: "Unranked" },
    { npcName: "Zorin" },
    { npcName: "Mushita" },
  ];

  const rankings = [
    { heroNpcName: "Mushita", memberId: 1 },
    { heroNpcName: "Zorin", memberId: 2 },
    { heroNpcName: "Zorin", memberId: 3 },
  ];

  it("defaults to the first configured hero with rankings, preserving its member order", () => {
    expect(getRankingSelection(heroes, rankings, null)).toEqual({
      effectiveSelectedHeroName: "Zorin",
      filteredRankings: [rankings[1], rankings[2]],
    });
  });

  it("recovers from a selected hero removed from the event", () => {
    expect(getRankingSelection(heroes, rankings, "Removed hero")).toEqual({
      effectiveSelectedHeroName: "Zorin",
      filteredRankings: [rankings[1], rankings[2]],
    });
  });

  it("keeps an explicitly selected hero without rankings instead of showing another hero", () => {
    expect(getRankingSelection(heroes, rankings, "Unranked")).toEqual({
      effectiveSelectedHeroName: "Unranked",
      filteredRankings: [],
    });
  });
});
