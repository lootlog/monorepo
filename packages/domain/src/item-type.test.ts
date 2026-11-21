import { describe, expect, it } from "bun:test";
import { ItemTypeEnum } from "@lootlog/schema/loot";
import { classifyItemCategory, getItemTypeByCl } from "./item-type.js";

describe("Margonem item classes", () => {
  it("maps every persisted Margonem item class", () => {
    expect(
      Array.from({ length: 32 }, (_, index) => getItemTypeByCl(index + 1)),
    ).toEqual(Object.values(ItemTypeEnum));
  });

  it("does not invent an item type for an unknown class", () => {
    expect(getItemTypeByCl(0)).toBeUndefined();
    expect(getItemTypeByCl(33)).toBeUndefined();
  });
});

describe("classifyItemCategory", () => {
  it("classifies crafting-only equipment drops (e.g. Chochoł boots, Marzanna necklace) as crafting", () => {
    expect(
      classifyItemCategory({
        type: ItemTypeEnum.BOOTS,
        stat: "ac=161;artisanbon=250;etiquette=Święto Plonów;lvl=100;opis=Małowartościowy przedmiot w walce, jednak dobry surowiec do użycia w rzemiośle;rarity=unique",
      }),
    ).toBe("crafting");

    expect(
      classifyItemCategory({
        type: ItemTypeEnum.NECKLACE,
        stat: "artisanbon=250;etiquette=Pierwszy Dzień Wiosny;lvl=250;rarity=legendary",
      }),
    ).toBe("crafting");
  });

  it("keeps wearable gear with artisanbon and combat stats in equipment", () => {
    expect(
      classifyItemCategory({
        type: ItemTypeEnum.ARMOR,
        stat: "ac=281;artisanbon=150;crit=2;da=55;evade=19;hp=3059;legbon=lastheal,187;lvl=187;rarity=legendary;sa=148",
      }),
    ).toBe("equipment");
  });

  it("keeps plain low-level armor without artisanbon and blessings in equipment", () => {
    expect(
      classifyItemCategory({
        type: ItemTypeEnum.BOOTS,
        stat: "ac=5;lvl=3;rarity=common",
      }),
    ).toBe("equipment");

    expect(
      classifyItemCategory({
        type: ItemTypeEnum.BLESS,
        stat: "da=20;lvl=50;rarity=heroic",
      }),
    ).toBe("equipment");
  });

  it("classifies non-equippable and untyped items as other", () => {
    expect(
      classifyItemCategory({
        type: ItemTypeEnum.NEUTRAL,
        stat: "lvl=1;rarity=unique",
      }),
    ).toBe("other");

    expect(
      classifyItemCategory({
        type: ItemTypeEnum.UPGRADE,
        stat: "lvl=1;rarity=heroic",
      }),
    ).toBe("other");

    expect(
      classifyItemCategory({
        type: null,
        stat: "lvl=1",
      }),
    ).toBe("other");
  });
});
