import { expect, test } from "bun:test";
import { toMonsterFormerLevels } from "./monster-levels.js";

const level = (
  lvl: number,
  fights: number,
  firstFight: number,
  firstFoughtOn: string,
  recentFights: number,
) => ({
  gameVersion: "pl" as const,
  name: "Reuzen",
  type: "COLOSSUS",
  lvl,
  fights,
  firstFight,
  firstFoughtOn,
  recentFights,
});

test("dates a rebalance by the new level's first fight, though older clients kept reporting the former one", () => {
  expect(
    toMonsterFormerLevels([
      // Older clients reported 252 for months after the colossus became 244.
      level(252, 31_697, 1, "2025-06-03", 0),
      level(244, 39_855, 20_000, "2026-01-15", 1000),
    ]),
  ).toEqual([
    {
      gameVersion: "pl",
      name: "Reuzen",
      type: "COLOSSUS",
      formerLevels: [{ lvl: 252, until: "2026-01-15" }],
    },
  ]);
});

test("keeps no history of a namesake fought from the start, a monster that follows its fighter's level, or a stray level", () => {
  const formerLevels = (rows: Parameters<typeof toMonsterFormerLevels>[0]) =>
    toMonsterFormerLevels(rows).map((monster) => monster.formerLevels);

  // Two Duchy arystokraty on different maps.
  expect(
    formerLevels([
      level(265, 5270, 1, "2025-06-09", 0),
      level(149, 2566, 3, "2025-06-09", 1000),
    ]),
  ).toEqual([[]]);

  // An elastic myconid, fought at its fighters' levels.
  expect(
    formerLevels(
      [56, 67, 88, 117, 147, 220].map((lvl, index) =>
        level(lvl, 100, index + 1, "2026-10-05", lvl === 220 ? 400 : 100),
      ),
    ),
  ).toEqual([[]]);

  // One client's misread level among thousands of fights.
  expect(
    formerLevels([
      level(213, 9000, 1, "2025-06-05", 1000),
      level(225, 10, 500, "2025-07-01", 0),
    ]),
  ).toEqual([[]]);
});
