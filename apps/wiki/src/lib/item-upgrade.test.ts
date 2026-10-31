import { describe, expect, it } from "vitest";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import {
  upgradeBonusOptions,
  upgradedItemLevel,
  upgradeItemStat,
} from "./item-upgrade";

const statOf = (stat: string, key: string) =>
  parseItemStats(stat).find((entry) => entry.key === key)?.value;

// Real catalog items at level 227, whose +5 virtual level is 262.
const necklace = {
  stat: "act=5;binds;crit=3;da=122;evade=23;heal=514;lowcrit=4;lowevade=23;lvl=227;rarity=heroic;sa=178",
  lvl: 227,
  rarity: "HEROIC",
  type: "NECKLACE",
};

const sword = {
  stat: "abdest=551;acdmg=33;binds;crit=1;dmg=4793,5858;hp=1722;lvl=227;rarity=heroic;reqp=w;sa=122",
  lvl: 227,
  rarity: "HEROIC",
  type: "ONE_AND_HALF_HAND_WEAPON",
};

describe("item upgrade", () => {
  it("raises the virtual level by 3% of the item level per upgrade", () => {
    expect(upgradedItemLevel(227, 5)).toBe(262);
    expect(upgradedItemLevel(20, 1)).toBe(21);
  });

  it("computes bonuses at the virtual level from the number the item was given", () => {
    const upgraded = upgradeItemStat(necklace, { level: 5 });

    // Two "all attributes" bonuses: 0.25 * 262 * 2 + 8.
    expect(statOf(upgraded, "da")).toBe("139");
    // Three attack speed bonuses: 8 + 0.25 * 262 * 3, in hundredths.
    expect(statOf(upgraded, "sa")).toBe("205");
    expect(statOf(upgraded, "heal")).toBe("628");
    // Critical chance does not depend on level, and wearing it still takes 227.
    expect(statOf(upgraded, "crit")).toBe("3");
    expect(statOf(upgraded, "lvl")).toBe("227");
    expect(statOf(upgraded, "enhancement_upgrade_lvl")).toBe("5");
  });

  it("grows weapon damage with the rarity and level power", () => {
    // 8 * 0.3984 * (rarity_power + level_power) at 262, with a 10% spread.
    expect(statOf(upgradeItemStat(sword, { level: 5 }), "dmg")).toBe(
      "6050,7394",
    );
  });

  it("makes a legendary bonus as strong as the virtual level", () => {
    const upgraded = upgradeItemStat(
      {
        stat: "crit=4;legbon=lastheal,200;lvl=200;rarity=legendary",
        lvl: 200,
        rarity: "LEGENDARY",
        type: "NECKLACE",
      },
      { level: 5 },
    );

    expect(statOf(upgraded, "legbon")).toBe("lastheal,230");
  });

  it("leaves items the game cannot upgrade as they are", () => {
    for (const item of [
      { ...necklace, stat: "da=12;lvl=19", lvl: 19 },
      { ...necklace, stat: `${necklace.stat};cursed` },
      { ...necklace, type: "BAG" },
    ]) {
      expect(upgradeItemStat(item, { level: 5, bonus: "ds" })).toBe(item.stat);
      expect(upgradeBonusOptions(item)).toEqual([]);
    }
  });

  it("adds the chosen +5 bonus from the item's class pool at the virtual level", () => {
    // One strength bonus at 262: 5 * 262 / 9 + 4, a stat the necklace lacked.
    const withStrength = upgradeItemStat(necklace, { level: 5, bonus: "ds" });

    expect(statOf(withStrength, "bonus")).toBe("ds,150");
    expect(statOf(withStrength, "ds")).toBe("150");
    // One more healing bonus: 8 + 2 * (0.8 * 262 + 0.2 * level_power), the
    // base counted once, not 628 + 628.
    expect(
      statOf(upgradeItemStat(necklace, { level: 5, bonus: "heal" }), "heal"),
    ).toBe("1249");
    // A necklace cannot draw a weapon bonus, and below +5 there is none.
    expect(
      statOf(upgradeItemStat(necklace, { level: 5, bonus: "acdmg" }), "bonus"),
    ).toBeUndefined();
    expect(
      statOf(upgradeItemStat(necklace, { level: 4, bonus: "ds" }), "bonus"),
    ).toBeUndefined();
  });

  it("makes the +5 bonus one more of the item's bonuses, its base counted once", () => {
    // Oko mrozu: one attack speed bonus, 0.94 at 345; a second gives
    // round(8 + 2 * 0.25 * 345) = 1.81, not 0.94 + 0.94.
    const orb = {
      stat: "binds;crit=1;di=171;frost=220,2861;heal=764;lvl=300;manabon=80;rarity=heroic;reqp=m;resdmg=1;sa=83",
      lvl: 300,
      rarity: "HEROIC",
      type: "ORB_WEAPON",
    };

    const upgraded = upgradeItemStat(orb, { level: 5, bonus: "sa" });

    expect(statOf(upgraded, "sa")).toBe("181");
    expect(statOf(upgraded, "bonus")).toBe("sa,87");
    expect(
      upgradeBonusOptions(orb).find(({ key }) => key === "sa")?.value,
    ).toBe(87);
  });

  it("grows native armor and absorption apart from the bonuses added to them", () => {
    // A mage's heroic helmet at 300: native absorption 8 * 0.375 * 0.33 *
    // (rarity_power + level_power) = 2613.8, plus two bonuses of
    // 0.6 * level_power * 0.33 = 510.8 each.
    const helmet = {
      stat: "absorb=3635;lvl=300;rarity=heroic;reqp=m",
      lvl: 300,
      rarity: "HEROIC",
      type: "HELMET",
    };

    // At 345 the native part is 3310.6 and the bonuses 1297.9; scaling the
    // whole value by rarity_power + level_power would give 4604.
    expect(statOf(upgradeItemStat(helmet, { level: 5 }), "absorb")).toBe(
      "4608",
    );
    // The +5 bonus is a third absorption bonus: 649 more.
    expect(
      statOf(upgradeItemStat(helmet, { level: 5, bonus: "absorb" }), "bonus"),
    ).toBe("absorb,649");
  });

  it("offers stronger groups more often, three bonuses at a time", () => {
    const options = upgradeBonusOptions(necklace);

    const chanceOf = (key: string) =>
      options.find((option) => option.key === key)?.offerChance ?? 0;

    expect(options).toHaveLength(12);
    expect(
      options.reduce((sum, { offerChance }) => sum + offerChance, 0),
    ).toBeCloseTo(3);
    expect(chanceOf("ds")).toBeGreaterThan(chanceOf("critval"));
    expect(chanceOf("critval")).toBeGreaterThan(chanceOf("heal"));
  });
});
