import { describe, expect, it } from "bun:test";
import { elasticItemLevel, itemForCharacter } from "./elastic-level.js";

// Kapitan Mikodyń's legendary gloves as Lootlog saw them dropped.
const gloves = (lvl: number, stat: string) => ({
  stat,
  lvl,
  rarity: "LEGENDARY",
  type: "GLOVES",
  elasticLevel: true,
});

const glovesAt187 = gloves(
  187,
  "ac=281;artisanbon=150;crit=2;da=55;evade=19;hp=3059;legbon=lastheal,187;lowevade=19;lvl=187;permbound;rarity=legendary;sa=148",
);

const glovesAt40 = gloves(
  40,
  "ac=38;artisanbon=150;crit=2;da=18;evade=4;hp=601;legbon=lastheal,40;lowevade=4;lvl=40;permbound;rarity=legendary;sa=38",
);

describe("elastic items", () => {
  it("takes the highest level of the item class's ladder not above the looter's", () => {
    // Looters' levels and the levels their drops had.
    expect(elasticItemLevel("GLOVES", 53)).toBe(52);
    expect(elasticItemLevel("GLOVES", 42)).toBe(42);
    expect(elasticItemLevel("GLOVES", 298)).toBe(297);
    expect(elasticItemLevel("RING", 53)).toBe(51);
    expect(elasticItemLevel("ONE_HAND_WEAPON", 53)).toBe(50);
  });

  it("gives no item below level 40 or above 300", () => {
    expect(elasticItemLevel("GLOVES", 41)).toBe(40);
    expect(elasticItemLevel("RING", 12)).toBe(40);
    // 300 lies on no armor ladder, and every character past it gets 300.
    expect(elasticItemLevel("GLOVES", 300)).toBe(300);
    expect(elasticItemLevel("GLOVES", 473)).toBe(300);
  });

  it("shows an elastic item as a character of another level would loot it", () => {
    expect(itemForCharacter(glovesAt187, 41)).toEqual(glovesAt40);
  });

  it("shows an elastic item at 300 without a character level, whoever looted it last", () => {
    const glovesAt300 = gloves(
      300,
      "ac=600;artisanbon=150;crit=2;da=83;evade=30;hp=5310;legbon=lastheal,300;lowevade=30;lvl=300;permbound;rarity=legendary;sa=233",
    );

    expect(itemForCharacter(glovesAt40, null)).toEqual(glovesAt300);
    expect(itemForCharacter(glovesAt187, null)).toEqual(glovesAt300);
  });

  it("keeps items of fixed level as the catalog saw them", () => {
    const fixed = { ...glovesAt187, elasticLevel: false };

    expect(itemForCharacter(fixed, 41)).toBe(fixed);
    expect(itemForCharacter(fixed, null)).toBe(fixed);
  });
});
