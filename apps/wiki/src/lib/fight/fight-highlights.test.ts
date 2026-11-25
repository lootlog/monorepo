import { describe, expect, test } from "vitest";
import { fightHighlights, winnerHpBuckets } from "./fight-highlights";
import type { FightRecord } from "./fight-summary";

const fight = (
  winner: number | null,
  moves: number,
  hpLeft: readonly number[],
): FightRecord => ({ seed: 0, winner, moves, hpLeft });

const FIGHTS = [
  fight(0, 12, [0.6, 0]),
  fight(0, 20, [0.05, 0]),
  fight(1, 9, [0, 0.9]),
  fight(1, 14, [0, 0.1]),
  fight(0, 13, [0.55, 0]),
];

describe("fightHighlights", () => {
  test("picks the fights at the extremes of length and of each side's margin", () => {
    const picked = Object.fromEntries(
      fightHighlights(FIGHTS).map(({ id, index }) => [id, index]),
    );

    expect(picked).toEqual({
      typical: 4,
      shortest: 2,
      longest: 1,
      closestWin: 1,
      safestWin: 0,
      closestLoss: 3,
      worstLoss: 2,
    });
  });

  test("offers no win or loss highlight when that outcome never happened", () => {
    const ids = fightHighlights([fight(null, 30, [0.2, 0.4])]).map(
      ({ id }) => id,
    );

    expect(ids).toEqual(["typical", "shortest", "longest", "draw"]);
  });
});

describe("winnerHpBuckets", () => {
  test("counts each decided fight once, under its winner and that winner's life", () => {
    const buckets = winnerHpBuckets(
      [...FIGHTS, fight(null, 30, [0.5, 0.5]), fight(0, 8, [1, 0])],
      2,
    );

    expect(
      buckets.flatMap(({ from, wins }) =>
        wins.some((count) => count > 0) ? [[from, ...wins]] : [],
      ),
    ).toEqual([
      [0.05, 1, 0],
      [0.1, 0, 1],
      [0.55, 1, 0],
      [0.6, 1, 0],
      [0.9, 0, 1],
      [0.95, 1, 0],
    ]);
  });
});
