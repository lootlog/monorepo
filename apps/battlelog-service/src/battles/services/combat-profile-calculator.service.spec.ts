import { describe, expect, it } from "vitest";
import type { InflatedBattleWithWarriors } from "./battle-analytics.types.js";
import { BattleAnalyticsDomainService } from "./battle-analytics-domain.service.js";
import { CombatProfileCalculatorService } from "./combat-profile-calculator.service.js";

type TestBattleInput = {
  id: string;
  damage: number;
  damageTaken: number;
  blockedDamage: number;
  createdAt: Date;
  hasFlee?: boolean;
  winningTeam?: number;
};

function createBattle({
  id,
  damage,
  damageTaken,
  blockedDamage,
  createdAt,
  hasFlee = false,
  winningTeam = 1,
}: TestBattleInput): InflatedBattleWithWarriors {
  return {
    id,
    type: "1v1",
    winningTeam,
    losingTeam: winningTeam === 1 ? 2 : 1,
    hasFlee,
    duration: 100,
    ratingDelta: 5,
    createdAt,
    warriors: [
      {
        originalId: "character-1",
        name: "Character",
        icon: "character-icon",
        prof: "w",
        lvl: 100,
        team: 1,
        ph: 10,
        turns: 5,
        turnsLost: 1,
        damageDealtAfterDefensive: damage,
        damageTaken,
        blockedDamage,
        blocks: 1,
        evasions: 0,
        meleeDamage: damage,
        distanceDamage: 0,
        auxiliaryDamage: 0,
        fireDamage: 0,
        frostDamage: 0,
        lightningDamage: 0,
        thirdAttDamage: 0,
        trueDamageDealt: 0,
        rageDamageDealt: 0,
        stigmaDamageDealt: 0,
        spellsUsedMap: { "101": 2 },
      },
      {
        originalId: "opponent-1",
        name: "Opponent",
        icon: "opponent-icon",
        prof: "m",
        lvl: 95,
        team: 2,
        ph: 5,
      },
    ],
  } as InflatedBattleWithWarriors;
}

describe("CombatProfileCalculatorService", () => {
  const service = new CombatProfileCalculatorService(
    new BattleAnalyticsDomainService(),
  );
  const characterIds = new Set(["character-1"]);

  it("keeps strongest combat highlights and ignores flee battles", () => {
    const profile = service.calculate(
      [
        createBattle({
          id: "small-win",
          damage: 100,
          damageTaken: 500,
          blockedDamage: 20,
          createdAt: new Date("2024-01-01T10:00:00Z"),
        }),
        createBattle({
          id: "big-loss",
          damage: 300,
          damageTaken: 100,
          blockedDamage: 50,
          createdAt: new Date("2024-01-02T10:00:00Z"),
          winningTeam: 2,
        }),
        createBattle({
          id: "ignored-flee",
          damage: 999,
          damageTaken: 999,
          blockedDamage: 999,
          createdAt: new Date("2024-01-03T10:00:00Z"),
          hasFlee: true,
        }),
      ],
      characterIds,
    );

    expect(profile.summary).toMatchObject({
      totalBattles: 2,
      wins: 1,
      losses: 1,
      totalPH: 20,
      totalRatingDelta: 10,
    });
    expect(profile.highlights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          battleId: "big-loss",
          type: "biggestDamage",
          value: 300,
        }),
        expect.objectContaining({
          battleId: "big-loss",
          type: "biggestMitigation",
          value: 50,
        }),
        expect.objectContaining({
          battleId: "small-win",
          type: "biggestComeback",
          value: 500,
        }),
      ]),
    );
  });
});
