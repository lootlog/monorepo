import { createBattle, createBattleWarrior } from "@/lib/testing/battle";
import { describe, expect, it } from "vitest";
import { getBattlePlayerRanking } from "./battle-player-ranking";

describe("getBattlePlayerRanking", () => {
  const battle = createBattle({
    characterId: "me",
    warriors: [
      createBattleWarrior({ originalId: "me", team: 2, damageDealt: 100 }),
      createBattleWarrior({ originalId: "enemy", team: 1, damageDealt: 300 }),
      createBattleWarrior({ originalId: "idle", team: 2, damageDealt: 0 }),
    ],
  });

  it("orders players by value and scales bars to the top player", () => {
    const ranking = getBattlePlayerRanking(battle, "damageDealt");

    expect(
      ranking.map((entry) => [
        entry.warrior.originalId,
        entry.isFriendly,
        entry.relative,
        entry.share,
      ]),
    ).toEqual([
      ["enemy", false, 1, 0.75],
      ["me", true, 1 / 3, 0.25],
      ["idle", true, 0, 0],
    ]);
  });

  it("stays finite when nobody scored in the metric", () => {
    const ranking = getBattlePlayerRanking(battle, "damageTaken");

    expect(ranking.every((entry) => entry.relative === 0)).toBe(true);
    expect(ranking.every((entry) => entry.share === 0)).toBe(true);
  });
});
