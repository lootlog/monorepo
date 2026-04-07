import { BattleProcessor } from "@lootlog/battle-processor";
import type { CreateBattleDto } from "./dto/create-battle.dto";

describe("BattleProcessor", () => {
  let processor: BattleProcessor;

  beforeEach(() => {
    processor = new BattleProcessor();
  });

  describe("calculateBattleDuration", () => {
    it("should calculate battle duration correctly", () => {
      const battleData: CreateBattleDto = {
        accountId: "test-account",
        characterId: "char-1",
        world: "test-world",
        events: [
          {
            ev: 1000,
            f: { w: {} },
          },
          {
            ev: 5000,
            f: { w: {} },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      expect(result.duration).toBe(4000);
    });

    it("should throw error when no events provided", () => {
      const battleData: CreateBattleDto = {
        accountId: "test-account",
        characterId: "char-1",
        world: "test-world",
        events: [],
      };

      expect(() => processor.processBattle(battleData)).toThrow(
        "No events found in battle data",
      );
    });
  });

  describe("extractAndParseMoves", () => {
    it("should parse moves correctly", () => {
      const events = [
        {
          ev: 1000,
          f: {
            m: ["1=100;2=90;+dmg=50", "2=80;1=100;-dmg=50"],
          },
        },
      ];

      const moves = processor.extractAndParseMoves(events as any);

      expect(moves).toHaveLength(2);
      expect(moves[0]).toEqual({
        attackerId: "1",
        defenderId: "2",
        attackerHpPercentage: 100,
        defenderHpPercentage: 90,
        actions: [{ actionType: "+dmg", param: "50" }],
      });
      expect(moves[1]).toEqual({
        attackerId: "2",
        defenderId: "1",
        attackerHpPercentage: 80,
        defenderHpPercentage: 100,
        actions: [{ actionType: "-dmg", param: "50" }],
      });
    });

    it("should handle moves with zero IDs as null", () => {
      const events = [
        {
          ev: 1000,
          f: {
            m: ["0=0;1=100;heal=20"],
          },
        },
      ];

      const moves = processor.extractAndParseMoves(events as any);

      expect(moves[0]).toEqual({
        attackerId: null,
        defenderId: "1",
        attackerHpPercentage: 0,
        defenderHpPercentage: 100,
        actions: [{ actionType: "heal", param: "20" }],
      });
    });

    it("should handle moves without params", () => {
      const events = [
        {
          ev: 1000,
          f: {
            m: ["1=100;2=90;step;flee"],
          },
        },
      ];

      const moves = processor.extractAndParseMoves(events as any);

      expect(moves[0].actions).toEqual([
        { actionType: "step", param: "" },
        { actionType: "flee", param: "" },
      ]);
    });
  });

  describe("processBattle", () => {
    it("should process a simple 1v1 battle", () => {
      const battleData: CreateBattleDto = {
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

      const result = processor.processBattle(battleData);

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

    it("should track critical hits and armor pierces", () => {
      const battleData: CreateBattleDto = {
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

      const result = processor.processBattle(battleData);
      const warrior1 = result.warriors.find((w) => w.name === "Warrior1");

      expect(warrior1?.criticalHits).toBe(2);
      expect(warrior1?.armorPierces).toBe(1);
    });

    it("should track evasions and blocks", () => {
      const battleData: CreateBattleDto = {
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

      const result = processor.processBattle(battleData);
      const defender = result.warriors.find((w) => w.name === "Defender");
      const attacker = result.warriors.find((w) => w.name === "Attacker");

      expect(defender?.evasions).toBe(2);
      expect(defender?.blocks).toBe(1);
      expect(defender?.blockedDamage).toBe(50);
      expect(attacker?.attacksEvaded).toBe(2);
      expect(attacker?.attacksBlocked).toBe(1);
    });

    it("should track spell usage", () => {
      const battleData: CreateBattleDto = {
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

      const result = processor.processBattle(battleData);
      const mage = result.warriors.find((w) => w.name === "Mage");

      expect(mage?.spellsUsed).toBe(2);
      expect(mage?.spellsUsedMap["42"]).toBe(2);
      expect(mage?.normalAttacks).toBe(0);
    });

    it("should handle flee correctly", () => {
      const battleData: CreateBattleDto = {
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

      const result = processor.processBattle(battleData);
      const coward = result.warriors.find((w) => w.name === "Coward");

      expect(coward?.fled).toBe(true);
      expect(result.outcome.hasFlee).toBe(true);
      expect(result.outcome.winner).toBe("Brave");
      expect(result.outcome.loser).toBe("Coward");
    });

    it("should calculate battle statistics", () => {
      const battleData: CreateBattleDto = {
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

      const result = processor.processBattle(battleData);

      expect(result.statistics.topDamageDealer).toEqual({
        warriorId: "101",
        name: "TopDamage",
        value: 1000,
      });

      expect(result.statistics.topTank).toEqual({
        warriorId: "102",
        name: "TopTank",
        value: 1000,
      });
    });
  });

  describe("battle type determination", () => {
    it("should determine 2v2 battle type", () => {
      const battleData: CreateBattleDto = {
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
                  name: "W1",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "W2",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 1,
                },
                "3": {
                  originalId: 103,
                  name: "W3",
                  lvl: 50,
                  prof: "w",
                  icon: "icon3",
                  team: 2,
                },
                "4": {
                  originalId: 104,
                  name: "W4",
                  lvl: 45,
                  prof: "p",
                  icon: "icon4",
                  team: 2,
                },
              },
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      expect(result.type).toBe("2v2");
    });
  });

  describe("damage calculations", () => {
    it("should track different damage types separately", () => {
      const battleData: CreateBattleDto = {
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
                  name: "Warrior",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Target",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;+dmg=100;-dmg=100",
                "1=100;2=90;+dmgd=200;-dmgd=200",
                "1=100;2=80;+dmgf=150;-dmgf=150",
                "1=100;2=70;+dmgc=120;-dmgc=120",
                "1=100;2=60;+dmgl=180;-dmgl=180",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const warrior = result.warriors.find((w) => w.name === "Warrior");

      expect(warrior?.damageDealt).toBe(750);
      expect(warrior?.meleeDamage).toBe(100);
      expect(warrior?.distanceDamage).toBe(200);
      expect(warrior?.fireDamage).toBe(150);
      expect(warrior?.frostDamage).toBe(120);
      expect(warrior?.lightningDamage).toBe(180);
    });

    it("should calculate damage dealt after defensive percentage", () => {
      const battleData: CreateBattleDto = {
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
                  name: "Warrior",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Target",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=100;+dmg=1000;-dmg=400"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const warrior = result.warriors.find((w) => w.name === "Warrior");

      expect(warrior?.damageDealt).toBe(1000);
      expect(warrior?.damageDealtAfterDefensive).toBe(400);
      expect(warrior?.damageDealtAfterDefensivePercentage).toBe(40);
    });
  });

  describe("turn tracking", () => {
    it("should track normal attacks and spell casts separately", () => {
      const battleData: CreateBattleDto = {
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
                  name: "Fighter",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Target",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;+dmg=100;-dmg=100",
                "1=100;2=90;+dmg=100;-dmg=100",
                "1=100;2=80;tspell=42",
                "1=100;2=70;+dmgf=100;-dmgf=100",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const fighter = result.warriors.find((w) => w.name === "Fighter");

      expect(fighter?.normalAttacks).toBe(2);
      expect(fighter?.spellsUsed).toBe(1);
      expect(fighter?.turns).toBe(3);
    });

    it("should track steps", () => {
      const battleData: CreateBattleDto = {
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
                  name: "Runner",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Target",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;step",
                "1=100;2=100;step",
                "1=100;2=100;step;+dmg=100;-dmg=100",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const runner = result.warriors.find((w) => w.name === "Runner");

      expect(runner?.steps).toBe(3);
    });

    it("should not double-count turns on step+damage moves", () => {
      const battleData: CreateBattleDto = {
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
                  name: "Runner",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 102,
                  name: "Target",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;step",
                "1=100;2=90;step;+dmg=200;-dmg=200",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const runner = result.warriors.find((w) => w.name === "Runner");

      expect(runner?.steps).toBe(2);
      expect(runner?.turns).toBe(2);
      expect(runner?.normalAttacks).toBe(1);
    });
  });

  describe("new action handlers", () => {
    const makeSimpleBattle = (moves: string[]): CreateBattleDto => ({
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
            m: moves,
          },
        },
      ],
    });

    it("should track vampirism healing", () => {
      const result = processor.processBattle(
        makeSimpleBattle(["1=100;2=90;+dmg=300;-dmg=300;vamp_time=45"]),
      );
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      expect(attacker?.vampirismHealing).toBe(45);
    });

    it("should track absorbed damage", () => {
      const result = processor.processBattle(
        makeSimpleBattle([
          "1=100;2=100;+dmg=500;-dmg=300;-absorb=200",
          "1=100;2=90;+dmgf=200;-dmgf=100;-absorbm=100",
        ]),
      );
      const defender = result.warriors.find((w) => w.name === "Defender");
      expect(defender?.absorbedDamage).toBe(200);
      expect(defender?.absorbedMagicDamage).toBe(100);
    });

    it("should track energy recovered via +engback", () => {
      const result = processor.processBattle(
        makeSimpleBattle(["1=100;2=100;+dmg=100;-dmg=100;+engback=15"]),
      );
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      expect(attacker?.energyRecovered).toBe(15);
    });

    it("should track crush damage", () => {
      const result = processor.processBattle(
        makeSimpleBattle(["1=100;2=80;+dmg=500;-dmg=500;+crush=120"]),
      );
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      expect(attacker?.crushDamage).toBe(120);
    });

    it("should track stuns and freezes", () => {
      const result = processor.processBattle(
        makeSimpleBattle([
          "1=100;2=100;+dmg=100;-dmg=100;+stun",
          "1=100;2=90;+dmg=100;-dmg=100;+stun2",
          "1=100;2=80;+dmg=100;-dmg=100;+freeze",
        ]),
      );
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      expect(attacker?.stuns).toBe(2);
      expect(attacker?.freezes).toBe(1);
    });

    it("should track parries", () => {
      const result = processor.processBattle(
        makeSimpleBattle([
          "1=100;2=100;-parry",
          "1=100;2=100;-parry",
        ]),
      );
      const defender = result.warriors.find((w) => w.name === "Defender");
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      expect(defender?.parries).toBe(2);
      expect(attacker?.attacksParried).toBe(2);
    });

    it("should track missing legbons", () => {
      const result = processor.processBattle(
        makeSimpleBattle([
          "1=100;2=100;+dmg=100;-dmg=100;+legbon_frenzy_main=1",
          "1=100;2=90;+dmg=100;-dmg=100;+legbon_frenzy_off=1",
          "1=100;2=80;+dmg=100;-dmg=100;+legbon_pushback",
          "1=100;2=70;+dmg=100;-dmg=100;-legbon_retaliation",
          "1=100;2=60;+dmg=100;-dmg=100;-legbon_dmgred=5",
          "1=100;2=50;+dmg=100;-dmg=100;-legbon_resgain",
        ]),
      );
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      const defender = result.warriors.find((w) => w.name === "Defender");

      expect(attacker?.legbonFrenzy).toBe(2);
      expect(attacker?.legbonPushback).toBe(1);
      expect(defender?.legbonRetaliation).toBe(1);
      expect(defender?.legbonDmgred).toBe(1);
      expect(defender?.legbonResgain).toBe(1);
    });

    it("should not double-count en-regen", () => {
      const result = processor.processBattle(
        makeSimpleBattle(["1=100;2=100;+dmg=100;-dmg=100;en-regen=10"]),
      );
      const defender = result.warriors.find((w) => w.name === "Defender");
      expect(defender?.regeneratedEnergy).toBe(10);

      const attacker = result.warriors.find((w) => w.name === "Attacker");
      expect(attacker?.regeneratedEnergy).toBe(0);
    });
  });
});
