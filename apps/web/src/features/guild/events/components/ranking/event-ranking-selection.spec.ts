import { describe, expect, it } from "vitest";
import {
  getRankingLeaders,
  getRankingSelection,
} from "./event-ranking-selection";

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

describe("getRankingLeaders", () => {
  // Listed out of order: the leaders follow points, not the API's order.
  const rankings = Array.from({ length: 15 }, (_, index) => ({
    memberId: 15 - index,
    totalPoints: 86 + index,
  }));

  it.each([
    [12, [1, 2, 3], { memberId: 12, place: 12 }],
    [2, [1, 2, 3], undefined],
    [99, [1, 2, 3], undefined],
  ])(
    "shows the leaders plus member %i's own place when it is outside them",
    (currentMemberId, leaderIds, own) => {
      const result = getRankingLeaders(rankings, 3, currentMemberId);

      expect(result.leaders.map(({ ranking }) => ranking.memberId)).toEqual(
        leaderIds,
      );
      expect(result.leaders.map(({ place }) => place)).toEqual([1, 2, 3]);
      expect(
        result.own && {
          memberId: result.own.ranking.memberId,
          place: result.own.place,
        },
      ).toEqual(own);
    },
  );
});
