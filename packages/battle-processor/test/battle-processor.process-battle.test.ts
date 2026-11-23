import { describe, expect, it } from "bun:test";
import type { BattlePayload } from "../src/battle-log.js";
import { calculateBattleStatistics } from "../src/statistics.js";
import {
  processBattleWithStatisticsParity,
  duel,
  duelist,
} from "./battle-processor.fixtures.js";

describe("BattleProcessor", () => {
  describe("processBattle", () => {
    it("names no winner for a group battle closed before it ended", () => {
      const warrior = (originalId: number, team: number) => ({
        originalId,
        name: `Warrior${originalId}`,
        lvl: 50,
        prof: "w",
        icon: "icon",
        team,
      });

      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "101",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "101": warrior(101, 1),
                "102": warrior(102, 1),
                "201": warrior(201, 2),
                "202": warrior(202, 2),
              },
              m: ["201=100;101=0;+dmg=900;-dmg=900"],
            },
          },
          { ev: 1003, f: { m: ["102=100;201=60;+dmg=400;-dmg=400"] } },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);

      expect(result.outcome).toMatchObject({
        unfinished: true,
        winner: "",
        loser: "",
        winningTeam: 0,
        losingTeam: 0,
      });
    });

    it("names no winner when the battle reaches the turn limit", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": duelist(1, "Attacker", 1),
                "2": duelist(2, "Defender", 2),
              },
              m: ["1=100;2=40;+dmg=600;-dmg=600", "0;0;winner=?"],
              endBattle: 1,
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);

      expect(result.outcome).toMatchObject({
        unfinished: false,
        winningTeam: 0,
        losingTeam: 0,
      });
    });

    it("keeps the inferred teams of a battle a warrior fled from", () => {
      const result = processBattleWithStatisticsParity(
        duel([
          "1=100;2=40;+dmg=600;-dmg=600",
          "1=100;2=40;flee",
          "0;0;winner=?",
        ]),
      );

      expect(result.outcome).toMatchObject({
        hasFlee: true,
        winningTeam: 1,
        losingTeam: 2,
      });
    });

    it("should process a simple 1v1 battle", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Warrior1",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Warrior2",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;step",
                "1=100;2=80;+dmg=200;-dmg=200",
                "2=80;1=95;+dmgd=150;-dmgd=150",
                "1=95;2=0;+dmg=400;-dmg=400;winner=Warrior1;loser=Warrior2",
              ],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);

      expect(result.warriors).toHaveLength(2);
      expect(result.type).toBe("1v1");
      expect(result.outcome.winner).toBe("Warrior1");
      expect(result.outcome.loser).toBe("Warrior2");
      expect(result.outcome.winningTeam).toBe(1);
      expect(result.outcome.losingTeam).toBe(2);

      const warrior1 = result.warriors.find((w) => w.name === "Warrior1");
      expect(warrior1?.damageDealt).toBe(600);
      expect(warrior1?.meleeDamage).toBe(600);
      expect(warrior1?.damageTaken).toBe(150);

      const warrior2 = result.warriors.find((w) => w.name === "Warrior2");
      expect(warrior2?.damageDealt).toBe(150);
      expect(warrior2?.distanceDamage).toBe(150);
      expect(warrior2?.damageTaken).toBe(600);
      expect(warrior2?.isDead).toBe(true);
    });

    it("should preserve abyss points from match summary", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            match_summary: {
              difficulty_rank: 1,
              result: 1,
              rating_delta: 12,
              opponent_lvl: 55,
              opponent_oplvl: 55,
              opponent_rating: 1400,
              rating: 1412,
              status: 1,
              points_gained: 18,
              placement_cur: 24,
              placement_max: 100,
              daily_stage: {
                id: 3,
                points_cur: 40,
                points_max: 100,
                points_step: 20,
                rewards_last: 1,
                rewards_cur: 2,
                rewards_max: 5,
              },
            },
            f: {
              w: {
                "1": {
                  originalId: 1,
                  name: "Warrior1",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Warrior2",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=0;winner=Warrior1;loser=Warrior2"],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);

      expect(result.matchmaking).toEqual(
        expect.objectContaining({
          pointsGained: 18,
          placementCur: 24,
          placementMax: 100,
          dailyStageId: 3,
          dailyPointsCur: 40,
          dailyPointsMax: 100,
          dailyPointsStep: 20,
          dailyRewardsLast: 1,
          dailyRewardsCur: 2,
          dailyRewardsMax: 5,
        }),
      );
    });

    it("should sum -dmga with post-defense damage taken by the defender", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Warrior1",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Warrior2",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=90;+dmg=20755;-dmg=20754;-dmga=2137"],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const warrior1 = result.warriors.find((w) => w.name === "Warrior1");
      const warrior2 = result.warriors.find((w) => w.name === "Warrior2");
      const turn = result.battleTimeline[0];

      expect(warrior1?.damageDealt).toBe(20755);
      expect(warrior1?.damageDealtAfterDefensive).toBe(22891);
      expect(warrior2?.damageTaken).toBe(22891);
      expect(warrior2?.meleeDamageTaken).toBe(20754);
      expect(warrior2?.auxiliaryDamageTaken).toBe(2137);
      expect(warrior2?.flatDamageTaken).toBe(22891);
      expect(warrior2?.maxHp).toBe(228910);
      expect(turn?.deltas.damage).toBe(22891);
      expect(turn?.deltas.byWarrior["1"]?.damageDealt).toBe(22891);
      expect(turn?.deltas.byWarrior["2"]?.damageTaken).toBe(22891);
    });

    it("should track critical hits and armor pierces", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Warrior1",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Warrior2",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;+dmg=200;-dmg=200;+crit;+pierce",
                "1=100;2=80;+dmg=300;-dmg=300;+crit",
              ],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const warrior1 = result.warriors.find((w) => w.name === "Warrior1");

      expect(warrior1?.criticalHits).toBe(2);
      expect(warrior1?.armorPierces).toBe(1);
    });

    it("should track evasions and blocks", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;-evade",
                "1=100;2=100;-blok=50",
                "1=100;2=100;-evade",
              ],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const defender = result.warriors.find((w) => w.name === "Defender");
      const attacker = result.warriors.find((w) => w.name === "Attacker");

      expect(defender?.evasions).toBe(2);
      expect(defender?.blocks).toBe(1);
      expect(defender?.blockedDamage).toBe(50);
      expect(attacker?.attacksEvaded).toBe(2);
      expect(attacker?.attacksBlocked).toBe(1);
    });

    it("should keep blocked damage finite when block action has no value", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=100;-blok"],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const defender = result.warriors.find((w) => w.name === "Defender");
      const attacker = result.warriors.find((w) => w.name === "Attacker");

      expect(defender?.blocks).toBe(1);
      expect(defender?.blockedDamage).toBe(0);
      expect(Number.isFinite(defender?.blockedDamage)).toBe(true);
      expect(attacker?.attacksBlocked).toBe(1);
    });

    it("should track spell usage", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Mage",
                  lvl: 50,
                  prof: "m",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Target",
                  lvl: 45,
                  prof: "w",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;tspell=42",
                "1=100;2=90;+dmgf=100;-dmgf=100",
                "1=100;2=80;tspell=42",
                "1=100;2=70;+dmgf=110;-dmgf=110",
              ],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const mage = result.warriors.find((w) => w.name === "Mage");

      expect(mage?.spellsUsed).toBe(2);
      expect(mage?.spellsUsedMap["42"]).toBe(2);
      expect(mage?.normalAttacks).toBe(0);
    });

    it("should handle flee correctly", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "Coward",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Brave",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=50;2=100;flee;loser=Coward;winner=Brave"],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const coward = result.warriors.find((w) => w.name === "Coward");

      expect(coward?.fled).toBe(true);
      expect(result.outcome.hasFlee).toBe(true);
      expect(result.outcome.winner).toBe("Brave");
      expect(result.outcome.loser).toBe("Coward");
    });

    it("should calculate battle statistics", () => {
      const battleData: BattlePayload = {
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: {
              w: {
                "1": {
                  originalId: 101,
                  name: "TopDamage",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "TopTank",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;+dmg=1000;-dmg=1000",
                "2=50;1=90;+dmgd=500;-dmgd=500",
              ],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);

      const statistics = calculateBattleStatistics(result.warriors);

      expect(statistics.topDamageDealer).toEqual({
        warriorId: "101",
        name: "TopDamage",
        value: 1000,
      });

      expect(statistics.topTank).toEqual({
        warriorId: "102",
        name: "TopTank",
        value: 1000,
      });
    });
  });
});
