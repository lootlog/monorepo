import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { ItemRarityEnum, ItemRaritySchema } from "./item-rarity.js";
import {
  ItemTypeEnum,
  ItemTypeSchema,
  LootShareSourceEnum,
  LootShareSourceSchema,
  LootSourceEnum,
  LootSourceSchema,
  ProfessionEnum,
  ProfessionSchema,
} from "./loot.js";
import { NpcTypeEnum, NpcTypeSchema } from "./npc-type.js";

describe("loot wire enums", () => {
  it("accepts every persisted loot enum value", () => {
    const schemasAndValues = [
      [ItemRaritySchema, Object.values(ItemRarityEnum)],
      [ItemTypeSchema, Object.values(ItemTypeEnum)],
      [LootSourceSchema, Object.values(LootSourceEnum)],
      [LootShareSourceSchema, Object.values(LootShareSourceEnum)],
      [ProfessionSchema, Object.values(ProfessionEnum)],
      [NpcTypeSchema, Object.values(NpcTypeEnum)],
    ] as const;

    for (const [schema, values] of schemasAndValues) {
      for (const value of values) {
        expect(Schema.is(schema)(value)).toBe(true);
      }
    }
  });

  it("rejects unknown wire values", () => {
    expect(Schema.is(ItemRaritySchema)("COMMON")).toBe(false);
    expect(Schema.is(ItemTypeSchema)("MOUNT")).toBe(false);
    expect(Schema.is(LootSourceSchema)("MANUAL")).toBe(false);
    expect(Schema.is(LootShareSourceSchema)("LEGACY")).toBe(false);
    expect(Schema.is(ProfessionSchema)("BARD")).toBe(false);
    expect(Schema.is(NpcTypeSchema)("BOSS")).toBe(false);
  });
});
