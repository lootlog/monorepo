import { beforeEach, describe, expect, it } from "bun:test";
import { parseBattleMoves, type BattlePayload } from "../src/battle-log.js";
import { BattleProcessor } from "../src/battle-processor.js";
import { processBattleWithStatisticsParity } from "./battle-processor.fixtures.js";

describe("BattleProcessor", () => {
  let processor: BattleProcessor;

  beforeEach(() => {
    processor = new BattleProcessor();
  });

  describe("calculateBattleDuration", () => {
    it("should calculate battle duration correctly", () => {
      const battleData: BattlePayload = {
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

      const result = processBattleWithStatisticsParity(battleData);
      expect(result.duration).toBe(4000);
    });

    it("should preserve zero timestamp when calculating duration", () => {
      const battleData: BattlePayload = {
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

      const result = processBattleWithStatisticsParity(battleData);
      expect(result.duration).toBe(2500);
    });

    it("should throw error when no events provided", () => {
      const battleData: BattlePayload = {
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

  describe("parseBattleMoves", () => {
    it("should parse moves correctly", () => {
      const events: BattlePayload["events"] = [
        {
          ev: 1000,
          f: {
            m: ["1=100.00;2=90.85;+dmg=50", "2=80.25;1=100.00;-dmg=50"],
          },
        },
      ];

      const moves = parseBattleMoves(events);

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
      const events: BattlePayload["events"] = [
        {
          ev: 1000,
          f: {
            m: ["0=0;1=100;heal=20"],
          },
        },
      ];

      const moves = parseBattleMoves(events);

      expect(moves[0]).toEqual({
        attackerId: null,
        defenderId: "1",
        attackerHpPercentage: 0,
        defenderHpPercentage: 100,
        actions: [{ actionType: "heal", param: "20" }],
      });
    });

    it("should handle moves without params", () => {
      const events: BattlePayload["events"] = [
        {
          ev: 1000,
          f: {
            m: ["1=100;2=90;step;flee"],
          },
        },
      ];

      const moves = parseBattleMoves(events);

      expect(moves[0]?.actions).toEqual([
        { actionType: "step", param: "" },
        { actionType: "flee", param: "" },
      ]);
    });

    it("keeps unreadable rows representable in the raw battle response", () => {
      const moves = parseBattleMoves([
        { ev: 1000, f: { m: ["=50;2=n/a;txt=a=b;wound=2595,30"] } },
      ]);

      expect(moves[0]).toEqual({
        attackerId: null,
        defenderId: "2",
        attackerHpPercentage: 50,
        defenderHpPercentage: null,
        actions: [
          { actionType: "txt", param: "a" },
          { actionType: "wound", param: "2595,30" },
        ],
      });
    });
  });
});
