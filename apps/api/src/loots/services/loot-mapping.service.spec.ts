import { Test, type TestingModule } from "@nestjs/testing";
import { LootMappingService } from "./loot-mapping.service";
import { ItemRarity, Profession } from "src/generated/prisma/client";

describe("LootMappingService", () => {
  let service: LootMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LootMappingService],
    }).compile();

    service = module.get<LootMappingService>(LootMappingService);
  });

  describe("createUniqueLootId", () => {
    it("should create consistent hash for same input", () => {
      const loots = [{ hid: "item1" }, { hid: "item2" }];
      const world = "testworld";

      const result1 = service.createUniqueLootId(loots as any, world);
      const result2 = service.createUniqueLootId(loots as any, world);

      expect(result1).toBe(result2);
      expect(result1).toHaveLength(64);
    });

    it("should create different hashes for different inputs", () => {
      const loots1 = [{ hid: "item1" }];
      const loots2 = [{ hid: "item2" }];
      const world = "testworld";

      const result1 = service.createUniqueLootId(loots1 as any, world);
      const result2 = service.createUniqueLootId(loots2 as any, world);

      expect(result1).not.toBe(result2);
    });
  });

  describe("parseItemStats", () => {
    it("should parse item stats correctly", () => {
      const stats = "lvl=50;rarity=UNIQUE;reqp=w";

      const result = service.parseItemStats(stats);

      expect(result).toEqual({
        lvl: "50",
        rarity: "UNIQUE",
        reqp: "w",
      });
    });

    it("should handle empty stats", () => {
      const result = service.parseItemStats("");
      expect(result).toEqual({});
    });

    it("should ignore malformed entries", () => {
      const stats = "lvl=50;invalidentry;rarity=UNIQUE";

      const result = service.parseItemStats(stats);

      expect(result).toEqual({
        lvl: "50",
        rarity: "UNIQUE",
      });
    });
  });

  describe("getItemStats", () => {
    it("should extract item statistics correctly", () => {
      const item = {
        stat: "lvl=50;rarity=UNIQUE;reqp=w",
        cl: 1,
      } as any;

      const result = service.getItemStats(item);

      expect(result).toEqual({
        lvl: 50,
        rarity: ItemRarity.UNIQUE,
        prof: [Profession.WARRIOR],
        type: expect.any(String),
      });
    });

    it("should handle missing level", () => {
      const item = {
        stat: "rarity=UNIQUE",
        cl: 1,
      } as any;

      const result = service.getItemStats(item);

      expect(result.lvl).toBe(0);
    });

    it("should default to all professions when no reqp specified", () => {
      const item = {
        stat: "lvl=50;rarity=UNIQUE",
        cl: 1,
      } as any;

      const result = service.getItemStats(item);

      expect(result.prof).toEqual(Object.values(Profession));
    });
  });

  describe("parseJsonField", () => {
    it("should parse JSON string", () => {
      const jsonString = '{"test": "value"}';

      const result = service.parseJsonField(jsonString);

      expect(result).toEqual({ test: "value" });
    });

    it("should return non-string values as-is", () => {
      const objectValue = { test: "value" };

      const result = service.parseJsonField(objectValue);

      expect(result).toBe(objectValue);
    });
  });

  describe("processNpcs", () => {
    it("should sort NPCs by wt descending and return processed data", () => {
      const npcs = [
        {
          id: 1,
          wt: 100,
          name: "NPC1",
          lvl: 10,
          prof: "w",
          icon: "icon1.png",
          location: "loc1",
          type: 1,
          hpp: 1000,
          x: 100,
          y: 200,
        },
        {
          id: 2,
          wt: 200,
          name: "NPC2",
          lvl: 20,
          prof: "p",
          icon: "icon2.png",
          location: "loc2",
          type: 2,
          hpp: 2000,
          x: 150,
          y: 250,
        },
      ];

      const result = service.processNpcs(npcs);

      expect(result.highest).toEqual(npcs[1]);
      expect(result.sorted).toEqual([npcs[1], npcs[0]]);
      expect(result.mapped).toHaveLength(2);
      expect(result.mapped[0].wt).toBe(200);
    });
  });

  describe("getLootShareFromMsg", () => {
    it("should parse loot share message correctly", () => {
      const msg =
        'Test Player otrzymał ITEM#abc123:"Item One", ITEM#def456:"Item Two"';

      const result = service.getLootShareFromMsg(msg);

      expect(result).toEqual({
        "Test Player": ["abc123", "def456"],
      });
    });

    it("should handle empty message", () => {
      const result = service.getLootShareFromMsg("");
      expect(result).toEqual({});
    });

    it("should handle multiple players", () => {
      const msg =
        'Player1 otrzymał ITEM#abc123:"Item One" Player2 otrzymała ITEM#def456:"Item Two"';

      const result = service.getLootShareFromMsg(msg);

      expect(result).toEqual({
        Player1: ["abc123"],
        Player2: ["def456"],
      });
    });
  });
});
