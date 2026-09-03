import { describe, expect, it } from "bun:test";
import type { InflatedBattleWithWarriors } from "./battle-analytics.types.js";
import { battleAnalyticsDomain } from "./battle-analytics-domain.service.js";
import { makePlayerVsPlayerCalculator } from "./player-vs-player-calculator.service.js";

type TestBattleInput = {
  id: string;
  opponentId?: string;
  opponentLevel?: number;
  type?: string;
};

function createBattle({
  id,
  opponentId = "opponent-1",
  opponentLevel = 85,
  type = "1v1",
}: TestBattleInput): InflatedBattleWithWarriors {
  return {
    id,
    type,
    duration: 120,
    winner: "Character",
    loser: "Opponent",
    winningTeam: 1,
    losingTeam: 2,
    hasFlee: false,
    matchmaking: true,
    rating: 1500,
    opponentRating: 1490,
    ratingDelta: 12,
    createdAt: new Date("2024-01-01T10:00:00Z"),
    warriors: [
      {
        originalId: "character-1",
        name: "Character",
        icon: "character-icon",
        prof: "w",
        lvl: 100,
        team: 1,
        ph: 10,
        fireDamage: 1,
        frostDamage: 2,
        lightningDamage: 3,
        poisonDamageTaken: 4,
        woundDamageTaken: 5,
        critWoundDamageTaken: 6,
      },
      {
        originalId: opponentId,
        name: "Opponent",
        icon: "opponent-icon",
        prof: "m",
        lvl: opponentLevel,
        team: 2,
        ph: 5,
        fireDamage: 7,
        frostDamage: 8,
        lightningDamage: 9,
        poisonDamageTaken: 10,
        woundDamageTaken: 11,
        critWoundDamageTaken: 12,
      },
    ],
  } as InflatedBattleWithWarriors;
}

describe("player-vs-player calculator", () => {
  const service = makePlayerVsPlayerCalculator(battleAnalyticsDomain);
  const characterIds = new Set(["character-1"]);

  it("keeps only matching 1v1 opponent battles inside level filters", () => {
    const battles = service.calculateBattles(
      [
        createBattle({ id: "included" }),
        createBattle({ id: "excluded-battle" }),
        createBattle({ id: "wrong-opponent", opponentId: "opponent-2" }),
        createBattle({ id: "wrong-type", type: "team" }),
        createBattle({ id: "wrong-level", opponentLevel: 120 }),
      ],
      characterIds,
      {
        opponentId: "opponent-1",
        excludeBattleId: "excluded-battle",
        minLevel: 80,
        maxLevel: 90,
        size: 20,
        sortBy: "totalBattles",
        sortOrder: "desc",
        includeTotal: false,
      },
    );

    expect(battles).toHaveLength(1);
    expect(battles[0]).toMatchObject({
      battleId: "included",
      ratingDelta: 12,
      userWarrior: {
        name: "Character",
        fireDamage: 1,
      },
      opponentWarrior: {
        name: "Opponent",
        fireDamage: 7,
      },
    });
  });
});
