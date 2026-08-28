import { describe, expect, it } from "vitest";
import { mapStatsToDisplayValues, parseItemStats } from "./item-stat-utils";

describe("item stat utilities", () => {
  it("preserves stat formatting and block ordering", () => {
    const blocks = mapStatsToDisplayValues(
      parseItemStats(
        "created=1767225600;hp=10;dmg=5,8;lvl=20;reqp=wm;opis=Created #YEAR#[br]Line;teleport=Karka-han,Thuzal;legbon=curse,1;amount=2;lvlupgs=3;unknown=value;rarity=legendary;rkey=x",
      ),
    );

    expect(blocks.baseStatsBlock).toEqual([
      { key: "dmg", value: "5 - 8" },
      { key: "hp", value: "10" },
    ]);
    expect(blocks.requirementsBlock).toEqual([
      { key: "reqp", translateKey: "itemStats.prof", value: ["w", "m"] },
      { key: "lvl", value: "20" },
    ]);
    expect(blocks.descriptionBlock).toEqual([
      { key: "teleport", value: ["Karka-han", "Thuzal"] },
      { key: "opis", value: "Created 2026\nLine" },
    ]);
    expect(blocks.legendaryBonusBlock).toEqual([
      { key: "legbon.curse", value: false },
    ]);
    expect(blocks.usageStatsBlock).toEqual([{ key: "amount", value: "2" }]);
    expect(blocks.enhancementStatsBlock).toEqual([
      { key: "lvlupgs", value: "3" },
    ]);
    expect(blocks.unrecognizedBlock).toEqual([
      { key: "unknown", value: "value" },
      { key: undefined },
    ]);
  });
});
