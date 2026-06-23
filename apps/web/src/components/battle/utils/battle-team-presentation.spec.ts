import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";
import { describe, expect, it } from "vitest";
import { getBattleTeamPresentation } from "./battle-team-presentation";

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
    name,
    originalId,
    team,
  }) as BattleWarrior;

const createBattle = (overrides: Partial<Battle> = {}): Battle =>
  ({
    characterId: "defender-user",
    warriors: [
      createWarrior({
        name: "Attacker",
        originalId: "attacker-user",
        team: 1,
      }),
      createWarrior({
        name: "Defender",
        originalId: "defender-user",
        team: 2,
      }),
      createWarrior({
        name: "Defender Ally",
        originalId: "defender-ally",
        team: 2,
      }),
    ],
    ...overrides,
  }) as Battle;

const getTeamNames = (team: BattleWarrior[]) =>
  team.map((warrior) => warrior.name);

describe("battle team presentation", () => {
  it("orients teams from the battle character perspective by default", () => {
    const presentation = getBattleTeamPresentation(createBattle());

    expect(getTeamNames(presentation.leftTeam)).toEqual([
      "Defender",
      "Defender Ally",
    ]);
    expect(getTeamNames(presentation.rightTeam)).toEqual(["Attacker"]);
    expect(presentation.leftTeamNumber).toBe(2);
    expect(presentation.rightTeamNumber).toBe(1);
    expect(presentation.characterId).toBe("defender-user");
    expect(presentation.userWarrior?.name).toBe("Defender");
  });

  it("orients teams from the preferred character perspective when provided", () => {
    const presentation = getBattleTeamPresentation(
      createBattle(),
      "attacker-user",
    );

    expect(getTeamNames(presentation.leftTeam)).toEqual(["Attacker"]);
    expect(getTeamNames(presentation.rightTeam)).toEqual([
      "Defender",
      "Defender Ally",
    ]);
    expect(presentation.leftTeamNumber).toBe(1);
    expect(presentation.rightTeamNumber).toBe(2);
    expect(presentation.characterId).toBe("attacker-user");
    expect(presentation.userWarrior?.name).toBe("Attacker");
  });

  it("treats an empty preferred character id as absent", () => {
    const presentation = getBattleTeamPresentation(createBattle(), "");

    expect(presentation.characterId).toBe("defender-user");
    expect(presentation.userWarrior?.name).toBe("Defender");
  });

  it("falls back to defending-team-first when the character is not in the battle", () => {
    const presentation = getBattleTeamPresentation(createBattle(), "missing");

    expect(getTeamNames(presentation.leftTeam)).toEqual([
      "Defender",
      "Defender Ally",
    ]);
    expect(getTeamNames(presentation.rightTeam)).toEqual(["Attacker"]);
    expect(presentation.userWarrior).toBeUndefined();
  });
});
