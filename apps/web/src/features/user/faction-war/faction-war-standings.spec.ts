import { describe, expect, it } from "vitest";
import {
  getFactionWarDailyRows,
  getFactionWarOutcome,
  getFactionWarStandings,
} from "./faction-war-standings";

describe("faction war standings", () => {
  it("splits the tug of war by score after the underdog bonus, Barbatos first whatever order the API sends", () => {
    const standings = getFactionWarStandings([
      {
        faction: "TANROTH",
        points: 300,
        rawPoints: 200,
        players: 4,
        multiplier: 1.5,
      },
      {
        faction: "BARBATOS",
        points: 100,
        rawPoints: 100,
        players: 9,
        multiplier: 1,
      },
    ]);

    expect(
      standings.map(({ faction, share, players }) => ({
        faction,
        share,
        players,
      })),
    ).toEqual([
      { faction: "BARBATOS", share: 0.25, players: 9 },
      { faction: "TANROTH", share: 0.75, players: 4 },
    ]);
  });

  it("holds the rope in the middle before anyone scores instead of dividing by zero", () => {
    const standings = getFactionWarStandings([
      {
        faction: "BARBATOS",
        points: 0,
        rawPoints: 0,
        players: 3,
        multiplier: 1,
      },
    ]);

    expect(standings.map((standing) => standing.share)).toEqual([0.5, 0.5]);
    expect(standings[1]).toMatchObject({ faction: "TANROTH", players: 0 });
  });
});

describe("faction war outcome", () => {
  it("names no winner when nobody scored, one faction, or a tie", () => {
    expect(getFactionWarOutcome([])).toEqual({ kind: "none" });
    expect(getFactionWarOutcome(["TANROTH"])).toEqual({
      kind: "winner",
      faction: "TANROTH",
    });
    expect(getFactionWarOutcome(["BARBATOS", "TANROTH"])).toEqual({
      kind: "tie",
    });
  });
});

describe("faction war daily rows", () => {
  it("charts each day's score in date order, zero where a faction scored nothing", () => {
    expect(
      getFactionWarDailyRows([
        { day: "2026-10-21", faction: "TANROTH", score: 60 },
        { day: "2026-10-20", faction: "BARBATOS", score: 15 },
        { day: "2026-10-21", faction: "BARBATOS", score: 5 },
      ]),
    ).toEqual([
      { day: "2026-10-20", BARBATOS: 15, TANROTH: 0 },
      { day: "2026-10-21", BARBATOS: 5, TANROTH: 60 },
    ]);
  });
});
