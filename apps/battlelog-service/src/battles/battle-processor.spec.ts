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

    it("should preserve zero timestamp when calculating duration", () => {
      const battleData: CreateBattleDto = {
        accountId: "test-account",
        characterId: "char-1",
        world: "test-world",
        events: [
          {
            ev: 0,
            f: { w: {} },
          },
          {
            ev: 2500,
            f: { w: {} },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      expect(result.duration).toBe(2500);
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
            m: ["1=100.00;2=90.85;+dmg=50", "2=80.25;1=100.00;-dmg=50"],
          },
        },
      ];

      const moves = processor.extractAndParseMoves(events as any);

      expect(moves).toHaveLength(2);
      expect(moves[0]).toEqual({
        attackerId: "1",
        defenderId: "2",
        attackerHpPercentage: 100,
        defenderHpPercentage: 90.85,
        actions: [{ actionType: "+dmg", param: "50" }],
      });
      expect(moves[1]).toEqual({
        attackerId: "2",
        defenderId: "1",
        attackerHpPercentage: 80.25,
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

    it("should keep blocked damage finite when block action has no value", () => {
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
              m: ["1=100;2=100;-blok"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const defender = result.warriors.find((w) => w.name === "Defender");
      const attacker = result.warriors.find((w) => w.name === "Attacker");

      expect(defender?.blocks).toBe(1);
      expect(defender?.blockedDamage).toBe(0);
      expect(Number.isFinite(defender?.blockedDamage)).toBe(true);
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

    it("should use skillId for follow-up attacks while keeping tspell as spell name", () => {
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
                  originalId: 1,
                  name: "Mage",
                  lvl: 50,
                  prof: "m",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Target",
                  lvl: 45,
                  prof: "w",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;tspell=Podwojny strzal;skillId=97",
                "1=100;2=90;+dmgd=100;-dmgd=100",
                "1=100;2=80;+dmgd=100;-dmgd=100",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const mage = result.warriors.find((w) => w.name === "Mage");
      const mechanics = result.warriorMechanics.find(
        (w) => w.warriorId === "1",
      );

      expect(mage?.spellsUsed).toBe(1);
      expect(mage?.normalAttacks).toBe(0);
      expect(mage?.turns).toBe(1);
      expect(mage?.spellsUsedMap["Podwojny strzal"]).toBe(1);
      expect(mechanics?.spells[0]).toMatchObject({
        name: "Podwojny strzal",
        skillId: 97,
        casts: 1,
      });
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
  });

  describe("combat timeline analytics", () => {
    it("should build HP timeline and team HP snapshots for group PvP", () => {
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
                  originalId: 1,
                  name: "Ally1",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Ally2",
                  lvl: 50,
                  prof: "m",
                  icon: "icon2",
                  team: 1,
                },
                "3": {
                  originalId: 3,
                  name: "Enemy1",
                  lvl: 50,
                  prof: "p",
                  icon: "icon3",
                  team: 2,
                },
                "4": {
                  originalId: 4,
                  name: "Enemy2",
                  lvl: 50,
                  prof: "h",
                  icon: "icon4",
                  team: 2,
                },
              },
              m: ["1=100;3=80;+dmg=200;-dmg=200"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const firstTurn = result.battleTimeline[0];

      expect(result.type).toBe("2v2");
      expect(firstTurn?.hpByWarrior["3"]).toBe(80);
      expect(firstTurn?.teamHp["1"]).toBe(100);
      expect(firstTurn?.teamHp["2"]).toBe(90);
      expect(firstTurn?.deltas.damage).toBe(200);
    });

    it("should track auxiliary taken damage, absorb, magic absorb and target healing", () => {
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
                  originalId: 1,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=90;+dmga=40;-dmga=35;+absorb=20;-absorb=10;+absorbm=15;-absorbm=5;heal_target=30",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      const defender = result.warriors.find((w) => w.name === "Defender");
      const attackerMechanics = result.warriorMechanics.find(
        (w) => w.warriorId === "1",
      );
      const defenderMechanics = result.warriorMechanics.find(
        (w) => w.warriorId === "2",
      );

      expect(attacker?.auxiliaryDamage).toBe(40);
      expect(attacker?.damageDealtAfterDefensive).toBe(35);
      expect(defender?.auxiliaryDamageTaken).toBe(35);
      expect(defender?.activeHealing).toBe(30);
      expect(attackerMechanics?.absorptionGained).toBe(20);
      expect(attackerMechanics?.magicAbsorptionGained).toBe(15);
      expect(attackerMechanics?.targetHealing).toBe(30);
      expect(defenderMechanics?.auxiliaryDamageTaken).toBe(35);
      expect(defenderMechanics?.absorptionSpent).toBe(10);
      expect(defenderMechanics?.magicAbsorptionSpent).toBe(5);
      expect(result.battleTimeline[0]?.flags).toContain("absorb");
    });

    it("should expose control and defensive event flags", () => {
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
                  originalId: 1,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: [
                "1=100;2=100;-evade;-parry=10;-arrowblock=12;-pierceb=14;+stun;+freeze",
              ],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const defender = result.warriors.find((w) => w.name === "Defender");
      const defenderMechanics = result.warriorMechanics.find(
        (w) => w.warriorId === "2",
      );
      const flags = result.battleTimeline[0]?.flags ?? [];

      expect(defender?.evasions).toBe(1);
      expect(defender?.blocks).toBe(3);
      expect(defender?.blockedDamage).toBe(36);
      expect(defenderMechanics?.mitigationEvents).toBe(4);
      expect(defenderMechanics?.controlTaken).toBe(2);
      expect(flags).toEqual(
        expect.arrayContaining([
          "evade",
          "parry",
          "arrowBlock",
          "pierceBlock",
          "stun",
          "freeze",
        ]),
      );
    });

    it("should expose counter without counting it as mitigation", () => {
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
                  originalId: 1,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=90;+dmg=100;-dmg=100;-contra=75"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const turn = result.battleTimeline[0];
      const defender = result.warriors.find((w) => w.name === "Defender");
      const defenderMechanics = result.warriorMechanics.find(
        (w) => w.warriorId === "2",
      );
      const counterAction = turn?.actions.find(
        (action) => action.actionType === "-contra",
      );

      expect(defender?.counters).toBe(1);
      expect(defender?.blockedDamage).toBe(0);
      expect(turn?.deltas.damage).toBe(100);
      expect(turn?.deltas.mitigation).toBe(0);
      expect(turn?.deltas.byWarrior["2"]?.mitigation).toBe(0);
      expect(defenderMechanics?.mitigationEvents).toBe(0);
      expect(turn?.flags).toContain("counter");
      expect(counterAction?.category).toBe("counter");
    });

    it("should split resource pressure into energy and mana pressure", () => {
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
                  originalId: 1,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=100;-endest=12,3;-manadest=7;stealmana=5"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const turn = result.battleTimeline[0];
      const attackerDelta = turn?.deltas.byWarrior["1"];
      const defenderDelta = turn?.deltas.byWarrior["2"];
      const attackerMechanics = result.warriorMechanics.find(
        (warrior) => warrior.warriorId === "1",
      );
      const energyDestroyAction = turn?.actions.find(
        (action) => action.actionType === "-endest",
      );

      expect(turn?.deltas.resourcePressure).toBe(24);
      expect(turn?.deltas.energyPressure).toBe(12);
      expect(turn?.deltas.manaPressure).toBe(12);
      expect(attackerDelta?.resourcePressure).toBe(24);
      expect(attackerDelta?.energyPressure).toBe(12);
      expect(attackerDelta?.manaPressure).toBe(12);
      expect(defenderDelta?.resourceDelta).toBe(-24);
      expect(turn?.cumulative["1"]?.energyPressure).toBe(12);
      expect(turn?.cumulative["1"]?.manaPressure).toBe(12);
      expect(attackerMechanics?.resourcePressure).toBe(24);
      expect(attackerMechanics?.energyPressure).toBe(12);
      expect(attackerMechanics?.manaPressure).toBe(12);
      expect(energyDestroyAction?.value).toBe(12);
      expect(energyDestroyAction?.param).toBe("12,3");
    });

    it("should classify special damage effects in timeline and coverage", () => {
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
                  originalId: 1,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=92;+rage=80;+taken_dmg=45"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const turn = result.battleTimeline[0];
      const rageAction = turn?.actions.find(
        (action) => action.actionType === "+rage",
      );
      const stigmaAction = turn?.actions.find(
        (action) => action.actionType === "+taken_dmg",
      );

      expect(turn?.deltas.damage).toBe(125);
      expect(turn?.deltas.byWarrior["1"]?.damageDealt).toBe(125);
      expect(turn?.deltas.byWarrior["2"]?.damageTaken).toBe(125);
      expect(rageAction?.category).toBe("damage");
      expect(rageAction?.handled).toBe(true);
      expect(stigmaAction?.category).toBe("damage");
      expect(stigmaAction?.handled).toBe(true);
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("should classify observed modifier metadata without timeline deltas", () => {
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
                  originalId: 1,
                  name: "Attacker",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Defender",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=100;-redacdmg_per=-30;+of_wound;+critsa_per=15"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const turn = result.battleTimeline[0];
      const reductionAction = turn?.actions.find(
        (action) => action.actionType === "-redacdmg_per",
      );
      const woundAction = turn?.actions.find(
        (action) => action.actionType === "+of_wound",
      );
      const critSpeedAction = turn?.actions.find(
        (action) => action.actionType === "+critsa_per",
      );

      expect(reductionAction?.category).toBe("debuff");
      expect(woundAction?.category).toBe("buff");
      expect(critSpeedAction?.category).toBe("buff");
      expect(turn?.deltas.damage).toBe(0);
      expect(turn?.deltas.resourcePressure).toBe(0);
      expect(turn?.deltas.byWarrior).toEqual({});
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("should expose resource self-spend and regeneration in timeline", () => {
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
                  originalId: 1,
                  name: "Caster",
                  lvl: 50,
                  prof: "m",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Target",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=100;2=100;energyout=9;+endest=4;en-regen=3"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const turn = result.battleTimeline[0];

      expect(turn?.deltas.byWarrior["1"]?.resourceDelta).toBe(-10);
      expect(turn?.deltas.resourcePressure).toBe(0);
      expect(turn?.flags).toContain("resource");
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("should expose flee and PH in timeline", () => {
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
                  originalId: 1,
                  name: "Runner",
                  lvl: 50,
                  prof: "w",
                  icon: "icon1",
                  team: 1,
                },
                "2": {
                  originalId: 2,
                  name: "Winner",
                  lvl: 45,
                  prof: "p",
                  icon: "icon2",
                  team: 2,
                },
              },
              m: ["1=50;2=100;+ph=12;flee;loser=Runner;winner=Winner"],
            },
          },
        ],
      };

      const result = processor.processBattle(battleData);
      const runner = result.warriors.find((w) => w.name === "Runner");
      const flags = result.battleTimeline[0]?.flags ?? [];

      expect(runner?.fled).toBe(true);
      expect(runner?.ph).toBe(-12);
      expect(result.outcome.hasFlee).toBe(true);
      expect(flags).toEqual(expect.arrayContaining(["flee", "ph"]));
    });

    it("should process legacy parsed-only R2 payloads", () => {
      const result = processor.processParsedBattle({
        accountId: "test-account",
        characterId: "1",
        world: "test-world",
        duration: 2500,
        warriors: {
          "1": {
            originalId: 1,
            name: "LegacyUser",
            lvl: 50,
            prof: "w",
            icon: "icon1",
            team: 1,
          },
          "2": {
            originalId: 2,
            name: "LegacyOpponent",
            lvl: 45,
            prof: "p",
            icon: "icon2",
            team: 2,
          },
        },
        events: [
          {
            attackerId: "1",
            defenderId: "2",
            attackerHpPercentage: 100,
            defenderHpPercentage: 70,
            actions: [
              { actionType: "+dmg", param: "300" },
              { actionType: "-dmg", param: "300" },
            ],
          },
        ],
      });

      expect(result.duration).toBe(2500);
      expect(result.battleTimeline).toHaveLength(1);
      expect(result.battleTimeline[0]?.hpByWarrior["2"]).toBe(70);
      expect(result.actionCoverage.handledPercentage).toBe(100);
    });
  });
});
