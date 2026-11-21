import { describe, expect, it } from "bun:test";
import {
  chestComponents,
  findChest,
  socketOptions,
  symbolRecipe,
  SYMBOL_TIERS,
} from "./item-socket.js";
import { itemStatValue } from "./item-stat.js";
import { upgradeItemStat } from "./item-upgrade.js";

// Real catalog items: a Mirvenis-Adur armor with an empty socket, and a
// Krwawa Kopalnia helmet whose socket holds a fleeting symbol.
const armor = {
  stat: "ac=1561;act=8;artisanbon=242;crit=1;dmgmul=3;ds=121;energybon=24;evade=112;hp=1551;lvl=210;permbound;rarity=legendary;reqp=b;resfire=5;sa=218;socket_content=0",
  lvl: 210,
  rarity: "LEGENDARY",
  type: "ARMOR",
};

const mineHelmet = {
  stat: "ac=152;act=16;binds;crit=1;energybon=17;evade=22;hp=471;lowcrit=4;lowevade=11;lvl=110;rarity=legendary;reqp=h;resfire=7;sa=146;socket_content=0;socket_fleeting_legbon=critred,110",
  lvl: 110,
  rarity: "LEGENDARY",
  type: "HELMET",
};

describe("symbol in a socket", () => {
  it("gives its bonus as strong as the item's upgraded level", () => {
    const stat = upgradeItemStat(armor, { level: 5, symbol: "facade" });

    // 210 + round(210 * 0.03) * 5
    expect(itemStatValue(stat, "socket_injection_legbon")).toBe("facade,240");
    expect(itemStatValue(stat, "socket_content")).toBe("1");
  });

  it("replaces the fleeting symbol a mine item was made with", () => {
    const stat = upgradeItemStat(mineHelmet, { level: 0, symbol: "glare" });

    expect(itemStatValue(stat, "socket_injection_legbon")).toBe("glare,110");
    expect(itemStatValue(stat, "socket_fleeting_legbon")).toBeUndefined();
  });

  it("offers the symbols whose own stats take the item's class and level", () => {
    const symbols = [
      // Stabilne: for armors and helmets, armors only, then Słabe.
      {
        id: 57_475,
        stat: "legbon=glare,1;permbound;rarity=legendary;socket_enhancer;target_class=8,9;target_max_lvl=200;target_min_lvl=101",
      },
      {
        id: 57_483,
        stat: "legbon=puncture,1;permbound;rarity=legendary;socket_enhancer;target_class=8;target_max_lvl=200;target_min_lvl=101",
      },
      {
        id: 54_347,
        stat: "legbon=curse,1;permbound;rarity=legendary;socket_enhancer;target_class=8,10,11;target_max_lvl=100;target_min_lvl=20",
      },
      {
        id: 57_474,
        stat: "legbon=curse,1;permbound;rarity=legendary;socket_enhancer;target_class=8,9;target_max_lvl=200;target_min_lvl=101",
      },
    ];

    expect(socketOptions(mineHelmet, symbols)).toEqual([
      { bonus: "curse", symbolId: 57_474 },
      { bonus: "glare", symbolId: 57_475 },
    ]);
    expect(socketOptions({ ...mineHelmet, stat: "lvl=110" }, symbols)).toEqual(
      [],
    );
  });

  it("counts a component a recipe takes twice", () => {
    const [weak] = SYMBOL_TIERS;

    if (!weak) throw new Error("No symbol tiers.");

    expect(symbolRecipe(weak, "verycrit")).toEqual([
      { element: "fire", id: 54_332, count: 2 },
      { element: "frost", id: 54_333, count: 1 },
    ]);
  });
});

describe("component chests", () => {
  const chancesOf = (chestId: number) => {
    const chest = findChest(chestId);

    if (!chest) throw new Error(`No chest ${chestId}.`);

    return {
      components: chest.components,
      likeliest: chestComponents(chest)[0]?.element,
      chances: Object.fromEntries(
        chestComponents(chest).map(({ element, chance }) => [element, chance]),
      ),
    };
  };

  it("gives an element's chest its own component half the time", () => {
    // Ciężka skrytka ognistej mocy
    expect(chancesOf(59_494)).toEqual({
      components: 1,
      likeliest: "fire",
      chances: {
        steel: 0.125,
        fire: 0.5,
        frost: 0.125,
        light: 0.125,
        venom: 0.125,
      },
    });
  });

  it("gives two components alike from a double-power chest", () => {
    // Lekka skrytka zdwojonej mocy
    expect(chancesOf(63_696)).toEqual({
      components: 2,
      likeliest: "steel",
      chances: { steel: 0.2, fire: 0.2, frost: 0.2, light: 0.2, venom: 0.2 },
    });
  });
});
