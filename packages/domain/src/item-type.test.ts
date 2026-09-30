import { describe, expect, it } from "bun:test";
import { ItemTypeEnum } from "@lootlog/schema/loot";
import { getItemTypeByCl } from "./item-type.js";

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
