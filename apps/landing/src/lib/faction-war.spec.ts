import { describe, expect, it } from "vitest";
import {
  getPublicFactionWarEmblem,
  getPublicFactionWarSides,
} from "./faction-war";

const war = {
  id: "2026-barbatos-tanroth",
  status: "RUNNING" as const,
  startsAt: "2026-10-19T22:00:00.000Z",
  endsAt: "2026-11-16T23:00:00.000Z",
  winners: [],
};

describe("public faction war", () => {
  it("splits the rope by score, Barbatos first whatever order the API sends", () => {
    const sides = getPublicFactionWarSides({
      ...war,
      totals: [
        { faction: "TANROTH", points: 300, players: 4, multiplier: 1 },
        { faction: "BARBATOS", points: 100, players: 9, multiplier: 2 },
      ],
    });

    expect(sides.map(({ faction, share }) => ({ faction, share }))).toEqual([
      { faction: "BARBATOS", share: 0.25 },
      { faction: "TANROTH", share: 0.75 },
    ]);
  });

  it("holds the rope in the middle before anyone scores", () => {
    expect(
      getPublicFactionWarSides({ ...war, totals: [] }).map(
        (side) => side.share,
      ),
    ).toEqual([0.5, 0.5]);
  });

  it("finds the crests bundled for the war and none for a war without art", () => {
    expect(getPublicFactionWarEmblem(war.id, "TANROTH")).toBeTypeOf("string");
    expect(
      getPublicFactionWarEmblem("2099-unknown", "TANROTH"),
    ).toBeUndefined();
  });
});
