import { NpcType } from "#src/generated/prisma/client";
import { getStableNpcId } from "./get-stable-npc-id.js";

describe("getStableNpcId", () => {
  describe("COLOSSUS type NPCs", () => {
    it("should return a negative number for COLOSSUS NPCs", () => {
      const result = getStableNpcId(12345, "Wielki Kolos", NpcType.COLOSSUS);
      expect(result).toBeLessThan(0);
    });

    it("should return the same ID for the same NPC name regardless of spawn ID", () => {
      const spawnId1 = 99999;
      const spawnId2 = 88888;
      const spawnId3 = 77777;
      const npcName = "Mroczny Kolos";

      const result1 = getStableNpcId(spawnId1, npcName, NpcType.COLOSSUS);
      const result2 = getStableNpcId(spawnId2, npcName, NpcType.COLOSSUS);
      const result3 = getStableNpcId(spawnId3, npcName, NpcType.COLOSSUS);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should return different IDs for different NPC names", () => {
      const result1 = getStableNpcId(12345, "Kolos Ognia", NpcType.COLOSSUS);
      const result2 = getStableNpcId(12345, "Kolos Lodu", NpcType.COLOSSUS);

      expect(result1).not.toBe(result2);
    });

    it("should produce a deterministic hash", () => {
      const npcName = "Kolos Test";
      const result1 = getStableNpcId(1, npcName, NpcType.COLOSSUS);
      const result2 = getStableNpcId(1, npcName, NpcType.COLOSSUS);

      expect(result1).toBe(result2);
    });

    it("should return -1 for empty name to avoid hash of 0", () => {
      const result = getStableNpcId(12345, "", NpcType.COLOSSUS);
      expect(result).toBe(-1);
    });

    it("should handle special characters in name", () => {
      const result = getStableNpcId(12345, "Kolos @#$%^&*()", NpcType.COLOSSUS);
      expect(result).toBeLessThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should handle unicode characters in name", () => {
      const result = getStableNpcId(12345, "Kolos żółć", NpcType.COLOSSUS);
      expect(result).toBeLessThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should handle very long names", () => {
      const longName = "A".repeat(1000);
      const result = getStableNpcId(12345, longName, NpcType.COLOSSUS);
      expect(result).toBeLessThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe("non-COLOSSUS type NPCs", () => {
    const nonColossusTypes = [
      NpcType.COMMON,
      NpcType.ELITE,
      NpcType.ELITE2,
      NpcType.ELITE3,
      NpcType.HERO,
      NpcType.TITAN,
      NpcType.EVENT_HERO,
      NpcType.NPC,
    ];

    it.each(nonColossusTypes)(
      "should return the original positive ID for %s type",
      (npcType) => {
        const originalId = 12345;
        const result = getStableNpcId(originalId, "Some NPC", npcType);
        expect(result).toBe(originalId);
      },
    );

    it("should convert negative ID to positive for non-COLOSSUS types", () => {
      const result = getStableNpcId(-12345, "Hero Boss", NpcType.HERO);
      expect(result).toBe(12345);
    });

    it("should keep positive ID unchanged for non-COLOSSUS types", () => {
      const result = getStableNpcId(99999, "Titan Boss", NpcType.TITAN);
      expect(result).toBe(99999);
    });
  });

  describe("edge cases", () => {
    it("should handle zero as input ID", () => {
      const colossusResult = getStableNpcId(0, "Zero Kolos", NpcType.COLOSSUS);
      const heroResult = getStableNpcId(0, "Zero Hero", NpcType.HERO);

      expect(colossusResult).toBeLessThan(0);
      expect(heroResult).toBe(0);
    });

    it("should handle negative input ID for COLOSSUS (ignores input ID)", () => {
      const result1 = getStableNpcId(-999, "Test Kolos", NpcType.COLOSSUS);
      const result2 = getStableNpcId(999, "Test Kolos", NpcType.COLOSSUS);

      expect(result1).toBe(result2);
    });

    it("should produce unique IDs for similar names", () => {
      const result1 = getStableNpcId(1, "Kolos", NpcType.COLOSSUS);
      const result2 = getStableNpcId(1, "Kolosa", NpcType.COLOSSUS);
      const result3 = getStableNpcId(1, "Kolosb", NpcType.COLOSSUS);

      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).not.toBe(result3);
    });
  });
});
