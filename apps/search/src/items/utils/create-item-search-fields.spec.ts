import { describe, expect, it } from "bun:test";
import { createItemSearchFields } from "./create-item-search-fields.js";

describe("createItemSearchFields", () => {
  it("normalizes scalar stat values and keeps default required professions", () => {
    expect(
      createItemSearchFields(
        "lvl=10;upgraded=true;soulbound=false;ratio=-1.5;rarity=heroic;ignored",
      ),
    ).toEqual({
      stats: {
        lvl: 10,
        upgraded: true,
        soulbound: false,
        ratio: -1.5,
        rarity: "heroic",
      },
      numericStats: {
        lvl: 10,
        ratio: -1.5,
      },
      statsKeys: ["lvl", "upgraded", "soulbound", "ratio", "rarity"],
      requiredProfessions: ["w", "p", "h", "m", "b", "t"],
    });
  });

  it("uses reqp as the required profession list", () => {
    expect(createItemSearchFields("reqp=wm;lvl=20")).toEqual({
      stats: {
        reqp: ["w", "m"],
        lvl: 20,
      },
      numericStats: {
        lvl: 20,
      },
      statsKeys: ["reqp", "lvl"],
      requiredProfessions: ["w", "m"],
    });
  });
});
