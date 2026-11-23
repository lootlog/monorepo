import { describe, expect, it } from "bun:test";
import type { BattlePayload } from "../src/battle-log.js";
import { processBattleWithStatisticsParity } from "./battle-processor.fixtures.js";

describe("BattleProcessor", () => {
  describe("battle type determination", () => {
    it("should determine 2v2 battle type", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      expect(result.type).toBe("2v2");
    });
  });

  describe("damage calculations", () => {
    it("should track different damage types separately", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const warrior = result.warriors.find((w) => w.name === "Warrior");

      expect(warrior?.damageDealt).toBe(750);
      expect(warrior?.meleeDamage).toBe(100);
      expect(warrior?.distanceDamage).toBe(200);
      expect(warrior?.fireDamage).toBe(150);
      expect(warrior?.frostDamage).toBe(120);
      expect(warrior?.lightningDamage).toBe(180);
    });

    it("should calculate damage dealt after defensive percentage", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const warrior = result.warriors.find((w) => w.name === "Warrior");

      expect(warrior?.damageDealt).toBe(1000);
      expect(warrior?.damageDealtAfterDefensive).toBe(400);
      expect(warrior?.damageDealtAfterDefensivePercentage).toBe(40);
    });
  });

  describe("turn tracking", () => {
    it("should track normal attacks and spell casts separately", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const fighter = result.warriors.find((w) => w.name === "Fighter");

      expect(fighter?.normalAttacks).toBe(2);
      expect(fighter?.spellsUsed).toBe(1);
      expect(fighter?.turns).toBe(3);
    });

    it("should use skillId for follow-up attacks while keeping tspell as spell name", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const mage = result.warriors.find((w) => w.name === "Mage");

      expect(mage?.spellsUsed).toBe(1);
      expect(mage?.normalAttacks).toBe(0);
      expect(mage?.turns).toBe(1);
      expect(mage?.spellsUsedMap["Podwojny strzal"]).toBe(1);
    });

    it("should track steps", () => {
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

      const result = processBattleWithStatisticsParity(battleData);
      const runner = result.warriors.find((w) => w.name === "Runner");

      expect(runner?.steps).toBe(3);
    });
  });
});
