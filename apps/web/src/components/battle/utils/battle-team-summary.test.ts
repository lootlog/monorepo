import { createBattle, createBattleWarrior } from "@/lib/testing/battle";
import { describe, expect, it } from "vitest";
import { getBattleTeamSummaries } from "./battle-team-summary";

describe("getBattleTeamSummaries", () => {
  it("totals each team and puts the viewing character's team first", () => {
    const battle = createBattle({
      characterId: "me",
      warriors: [
        createBattleWarrior({
          originalId: "enemy",
          team: 1,
          damageDealt: 500,
          activeHealing: 40,
        }),
        createBattleWarrior({
          originalId: "me",
          team: 2,
          damageDealt: 100,
          evasions: 2,
          blocks: 1,
        }),
        createBattleWarrior({
          originalId: "ally",
          team: 2,
          damageDealt: 50,
          passiveHealing: 7,
        }),
      ],
    });

    const { friendly, enemy } = getBattleTeamSummaries(battle);

    expect(friendly.metrics.damageDealt).toBe(150);
    expect(friendly.metrics.avoidedAttacks).toBe(3);
    expect(friendly.metrics.healing).toBe(7);
    expect(enemy.metrics.damageDealt).toBe(500);
    expect(enemy.metrics.healing).toBe(40);
  });

  it("reports damage type shares of the summed segments and drops empty ones", () => {
    const battle = createBattle({
      characterId: "me",
      warriors: [
        createBattleWarrior({
          originalId: "me",
          team: 1,
          meleeDamage: 300,
          fireDamage: 100,
          // Overlaps melee damage, so it must not dilute the shares.
          rageDamageDealt: 250,
        }),
        createBattleWarrior({ originalId: "enemy", team: 2 }),
      ],
    });

    const { friendly, enemy } = getBattleTeamSummaries(battle);

    expect(friendly.damageSegments).toEqual([
      { key: "meleeDamage", value: 300, share: 0.75 },
      { key: "fireDamage", value: 100, share: 0.25 },
    ]);
    expect(enemy.damageSegments).toEqual([]);
  });
});
