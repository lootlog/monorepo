import { describe, expect, it } from "bun:test";
import type { BattlePayload } from "../src/battle-log.js";
import { processBattleWithStatisticsParity } from "./battle-processor.fixtures.js";

describe("BattleProcessor", () => {
  describe("combat timeline analytics", () => {
    it("should build HP timeline and team HP snapshots for group PvP", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const firstTurn = result.battleTimeline[0];

      expect(result.type).toBe("2v2");
      expect(firstTurn?.hpByWarrior["3"]).toBe(80);
      expect(firstTurn?.teamHp["1"]).toBe(100);
      expect(firstTurn?.teamHp["2"]).toBe(90);
      expect(firstTurn?.deltas.damage).toBe(200);
    });

    it("should track auxiliary taken damage, absorb, magic absorb and target healing", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const attacker = result.warriors.find((w) => w.name === "Attacker");
      const defender = result.warriors.find((w) => w.name === "Defender");

      expect(attacker?.auxiliaryDamage).toBe(40);
      expect(attacker?.damageDealtAfterDefensive).toBe(35);
      expect(defender?.auxiliaryDamageTaken).toBe(35);
      expect(defender?.activeHealing).toBe(30);
      expect(result.battleTimeline[0]?.flags).toContain("absorb");
    });

    it("should expose control and defensive event flags", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const defender = result.warriors.find((w) => w.name === "Defender");

      const flags = result.battleTimeline[0]?.flags ?? [];

      expect(defender?.evasions).toBe(3);
      expect(defender?.blocks).toBe(0);
      expect(defender?.blockedDamage).toBe(0);
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

      const result = processBattleWithStatisticsParity(battleData);
      const turn = result.battleTimeline[0];
      const defender = result.warriors.find((w) => w.name === "Defender");

      const counterAction = turn?.actions.find(
        (action) => action.actionType === "-contra",
      );

      expect(defender?.counters).toBe(1);
      expect(defender?.blockedDamage).toBe(0);
      expect(turn?.deltas.damage).toBe(100);
      expect(turn?.deltas.mitigation).toBe(0);
      expect(turn?.deltas.byWarrior["2"]?.mitigation).toBe(0);
      expect(turn?.flags).toContain("counter");
      expect(counterAction?.category).toBe("counter");
    });

    it("should split resource pressure into energy and mana pressure", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const turn = result.battleTimeline[0];
      const attackerDelta = turn?.deltas.byWarrior["1"];
      const defenderDelta = turn?.deltas.byWarrior["2"];

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
      expect(energyDestroyAction?.value).toBe(12);
      expect(energyDestroyAction?.param).toBe("12,3");
    });

    it("should not count attack bonuses as separate timeline damage", () => {
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
              m: ["1=100;2=92;+dmg=300;+rage=80;+taken_dmg=45;-dmg=200"],
            },
          },
        ],
      };

      const result = processBattleWithStatisticsParity(battleData);
      const turn = result.battleTimeline[0];

      const rageAction = turn?.actions.find(
        (action) => action.actionType === "+rage",
      );

      const stigmaAction = turn?.actions.find(
        (action) => action.actionType === "+taken_dmg",
      );

      const attacker = result.warriors.find((w) => w.name === "Attacker");

      expect(turn?.deltas.damage).toBe(200);
      expect(turn?.deltas.byWarrior["1"]?.damageDealt).toBe(200);
      expect(turn?.deltas.byWarrior["2"]?.damageTaken).toBe(200);
      expect(attacker?.rageDamageDealt).toBe(80);
      expect(attacker?.stigmaDamageDealt).toBe(45);
      expect(rageAction?.category).toBe("buff");
      expect(stigmaAction?.category).toBe("buff");
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("should classify observed modifier metadata without timeline deltas", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
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

    it("should take destroyed energy from the target, not the actor", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const turn = result.battleTimeline[0];

      expect(turn?.deltas.byWarrior["1"]?.resourceDelta).toBe(-6);
      expect(turn?.deltas.byWarrior["2"]?.resourceDelta).toBe(-4);
      expect(turn?.deltas.energyPressure).toBe(4);
      expect(turn?.flags).toContain("resource");
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("should expose flee and PH in timeline", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const runner = result.warriors.find((w) => w.name === "Runner");
      const flags = result.battleTimeline[0]?.flags ?? [];

      expect(runner?.fled).toBe(true);
      expect(runner?.ph).toBe(-12);
      expect(result.outcome.hasFlee).toBe(true);
      expect(flags).toEqual(expect.arrayContaining(["flee", "ph"]));
    });
  });
});
