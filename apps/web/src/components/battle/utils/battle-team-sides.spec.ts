import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";
import { describe, expect, it } from "vitest";
import { getBattleTeamSides } from "./battle-team-sides";

const createWarrior = ({
  name,
  originalId,
  team,
}: {
  name: string;
  originalId: string;
  team: number;
}): BattleWarrior =>
  ({
    id: originalId,
    name,
    originalId,
    team,
  }) as BattleWarrior;

const createBattle = (characterId = "defender"): Battle =>
  ({
    characterId,
    warriors: [
      createWarrior({
        name: "Attacker",
        originalId: "attacker",
        team: 1,
      }),
      createWarrior({
        name: "Defender",
        originalId: "defender",
        team: 2,
      }),
    ],
  }) as Battle;

describe("battle team sides", () => {
  it("places the user team on the left with team numbers", () => {
    const sides = getBattleTeamSides(createBattle());

    expect(sides.leftTeam.map((warrior) => warrior.name)).toEqual(["Defender"]);
    expect(sides.rightTeam.map((warrior) => warrior.name)).toEqual([
      "Attacker",
    ]);
    expect(sides.leftTeamNumber).toBe(2);
    expect(sides.rightTeamNumber).toBe(1);
    expect(sides.userWarrior?.name).toBe("Defender");
  });

  it("uses an explicit character id when provided", () => {
    const sides = getBattleTeamSides(createBattle(), "attacker");

    expect(sides.leftTeam.map((warrior) => warrior.name)).toEqual(["Attacker"]);
    expect(sides.rightTeam.map((warrior) => warrior.name)).toEqual([
      "Defender",
    ]);
    expect(sides.leftTeamNumber).toBe(1);
    expect(sides.rightTeamNumber).toBe(2);
    expect(sides.userWarrior?.name).toBe("Attacker");
  });

  it("falls back to defender-left ordering when the user warrior is missing", () => {
    const sides = getBattleTeamSides(createBattle("missing"));

    expect(sides.leftTeamNumber).toBe(2);
    expect(sides.rightTeamNumber).toBe(1);
    expect(sides.userWarrior).toBeUndefined();
  });
});
