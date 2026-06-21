import { describe, expect, it } from "vitest";
import type { InflatedBattleWithWarriors } from "./battle-analytics.types";
import { BattleAnalyticsDomainService } from "./battle-analytics-domain.service";
import { HeadToHeadCalculatorService } from "./head-to-head-calculator.service";

type TestBattleInput = {
  id: string;
  opponentId: string;
  opponentName: string;
  ratingDelta: number | null;
  createdAt: Date;
  userTeam?: number;
  winningTeam?: number;
};

function createBattle({
  id,
  opponentId,
  opponentName,
  ratingDelta,
  createdAt,
  userTeam = 1,
  winningTeam = 1,
}: TestBattleInput): InflatedBattleWithWarriors {
  const opponentTeam = userTeam === 1 ? 2 : 1;

  return {
    id,
    type: "1v1",
    winningTeam,
    losingTeam: winningTeam === 1 ? 2 : 1,
    hasFlee: false,
    ratingDelta,
    createdAt,
    warriors: [
      {
        originalId: "character-1",
        name: "Character",
        icon: "character-icon",
        prof: "w",
        lvl: 100,
        team: userTeam,
        ph: 10,
        fireDamage: 0,
        frostDamage: 0,
        lightningDamage: 0,
        poisonDamageTaken: 0,
        woundDamageTaken: 0,
        critWoundDamageTaken: 0,
      },
      {
        originalId: opponentId,
        name: opponentName,
        icon: "opponent-icon",
        prof: "m",
        lvl: 95,
        team: opponentTeam,
        ph: 5,
        fireDamage: 0,
        frostDamage: 0,
        lightningDamage: 0,
        poisonDamageTaken: 0,
        woundDamageTaken: 0,
        critWoundDamageTaken: 0,
      },
    ],
  } as InflatedBattleWithWarriors;
}

describe("HeadToHeadCalculatorService", () => {
  const service = new HeadToHeadCalculatorService(
    new BattleAnalyticsDomainService(),
  );
  const characterIds = new Set(["character-1"]);

  it("aggregates matchmaking rating deltas after search and min battle filters", () => {
    const records = service.calculateRecords(
      [
        createBattle({
          id: "battle-1",
          opponentId: "opponent-1",
          opponentName: "Arena Mage",
          ratingDelta: 25,
          createdAt: new Date("2024-01-01T10:00:00Z"),
        }),
        createBattle({
          id: "battle-2",
          opponentId: "opponent-1",
          opponentName: "Arena Mage",
          ratingDelta: 0,
          createdAt: new Date("2024-01-03T10:00:00Z"),
          winningTeam: 2,
        }),
        createBattle({
          id: "battle-3",
          opponentId: "opponent-2",
          opponentName: "Arena Hunter",
          ratingDelta: 10,
          createdAt: new Date("2024-01-02T10:00:00Z"),
        }),
      ],
      characterIds,
      {
        matchmaking: true,
        minBattles: 2,
        search: "mage",
        sortBy: "totalRatingDelta",
        sortOrder: "desc",
      },
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      opponentId: "opponent-1",
      opponentName: "Arena Mage",
      wins: 1,
      losses: 1,
      totalBattles: 2,
      totalRatingDelta: 25,
      avgRatingDelta: 25,
      lastBattleResult: "lost",
      lastBattleDate: "2024-01-03T10:00:00.000Z",
    });
  });
});
