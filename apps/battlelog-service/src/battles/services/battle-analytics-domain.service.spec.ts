import { describe, expect, it } from "vitest";
import type { InflatedBattleWithWarriors } from "./battle-analytics.types";
import { BattleAnalyticsDomainService } from "./battle-analytics-domain.service";

type TestWarriorInput = {
  originalId: string;
  team: number;
  lvl?: number;
};

type TestBattleInput = {
  id: string;
  type?: string;
  winningTeam?: number;
  losingTeam?: number;
  hasFlee?: boolean;
  warriors: TestWarriorInput[];
};

function createBattle({
  id,
  type = "1v1",
  winningTeam = 1,
  losingTeam = 2,
  hasFlee = false,
  warriors,
}: TestBattleInput): InflatedBattleWithWarriors {
  return {
    id,
    type,
    winningTeam,
    losingTeam,
    hasFlee,
    warriors: warriors.map((warrior) => ({
      originalId: warrior.originalId,
      name: warrior.originalId,
      icon: "",
      prof: "w",
      lvl: warrior.lvl ?? 100,
      team: warrior.team,
      ph: 0,
    })),
  } as InflatedBattleWithWarriors;
}

describe("BattleAnalyticsDomainService", () => {
  const service = new BattleAnalyticsDomainService();
  const characterIds = new Set(["character-1"]);

  it("filters 1v1 battles by the direct opponent level", () => {
    const battles = [
      createBattle({
        id: "in-range",
        warriors: [
          { originalId: "character-1", team: 1 },
          { originalId: "opponent-1", team: 2, lvl: 90 },
        ],
      }),
      createBattle({
        id: "too-low",
        warriors: [
          { originalId: "character-1", team: 1 },
          { originalId: "opponent-2", team: 2, lvl: 40 },
        ],
      }),
      createBattle({
        id: "team-fight",
        type: "team",
        warriors: [
          { originalId: "character-1", team: 1 },
          { originalId: "opponent-3", team: 2, lvl: 90 },
        ],
      }),
    ];

    expect(
      service
        .filterByOpponentLevel(battles, characterIds, 80, 100)
        .map((battle) => battle.id),
    ).toEqual(["in-range"]);
  });

  it("can filter by any opponent level for non-1v1 battle sets", () => {
    const battles = [
      createBattle({
        id: "has-eligible-opponent",
        type: "team",
        warriors: [
          { originalId: "character-1", team: 1 },
          { originalId: "opponent-1", team: 2, lvl: 300 },
          { originalId: "opponent-2", team: 2, lvl: 80 },
        ],
      }),
      createBattle({
        id: "outside-range",
        type: "team",
        warriors: [
          { originalId: "character-1", team: 1 },
          { originalId: "opponent-3", team: 2, lvl: 50 },
        ],
      }),
    ];

    expect(
      service
        .filterByAnyOpponentLevel(battles, characterIds, 250, 350)
        .map((battle) => battle.id),
    ).toEqual(["has-eligible-opponent"]);
  });

  it("prioritizes flee result over winning team checks", () => {
    const battle = createBattle({
      id: "flee",
      hasFlee: true,
      winningTeam: 1,
      warriors: [{ originalId: "character-1", team: 1 }],
    });

    expect(
      service.getBattleResultForUserWarrior(battle, battle.warriors[0]!),
    ).toBe("flee");
  });
});
