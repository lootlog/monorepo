import { describe, expect, it } from "vitest";
import {
  compareItemStats,
  decodeItemComparison,
  encodeItemComparison,
} from "./item-comparison";

// A catalog necklace trimmed to the stats tested, and a rival with other ones.
const necklace = "crit=3;da=122;evade=23;heal=514;lvl=227;rarity=heroic";

const otherNecklace = "crit=3;da=150;evade=10;hp=900;lvl=200;rarity=heroic";

const bestOf = (key: string) =>
  compareItemStats([necklace, otherNecklace]).find((row) => row.key === key)
    ?.best;

describe("item comparison", () => {
  it("marks the higher value of a stat both items have", () => {
    expect(bestOf("da")).toEqual([false, true]);
    expect(bestOf("evade")).toEqual([true, false]);
  });

  it("marks the only item with a stat and leaves equal values unmarked", () => {
    expect(bestOf("heal")).toEqual([true, false]);
    expect(bestOf("hp")).toEqual([false, true]);
    expect(bestOf("crit")).toEqual([false, false]);
  });

  it("does not rank the required level or text that starts with a number", () => {
    expect(bestOf("lvl")).toEqual([false, false]);

    const events = compareItemStats([
      "etiquette=20. Urodziny Margonem 2026 r.",
      "etiquette=Święto Plonów 2026 r.",
    ]);

    expect(events[0]?.best).toEqual([false, false]);
  });

  it("keeps the items and upgrades of a shared link", () => {
    const items = [
      { id: 12_345, upgrade: { level: 5, bonus: "ds" } as const },
      { id: 678, upgrade: { level: 0 } as const },
    ];

    expect(decodeItemComparison(encodeItemComparison(items))).toEqual(items);
  });

  it("drops unreadable and repeated items and keeps four", () => {
    expect(decodeItemComparison("1_x_1u2_2_3_4_5").map(({ id }) => id)).toEqual(
      [1, 2, 3, 4],
    );
  });
});
