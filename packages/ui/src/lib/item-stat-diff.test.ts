import { describe, expect, it } from "vitest";
import { diffItemStats } from "./item-stat-diff";

describe("diffItemStats", () => {
  it("diffs shared stats and keeps only the ones that differ", () => {
    const { changes } = diffItemStats(
      "crit=3;da=150;evade=10;lvl=200;rarity=heroic",
      "crit=3;da=122;evade=23;lvl=227;rarity=heroic",
    );

    expect(Object.fromEntries(changes)).toEqual({ da: [28], evade: [-13] });
  });

  it("diffs each end of a damage range", () => {
    const { changes } = diffItemStats("dmg=100,300", "dmg=90,320");

    expect(changes.get("dmg")).toEqual([10, -20]);
  });

  it("diffs scaled stats in their displayed unit", () => {
    const { changes } = diffItemStats("sa=150", "sa=100");

    expect(changes.get("sa")).toEqual([0.5]);
  });

  it("counts a stat the compared item lacks as a full gain", () => {
    const { changes } = diffItemStats("hp=900;da=10", "da=10");

    expect(Object.fromEntries(changes)).toEqual({ hp: [900] });
  });

  it("lists stats only the compared item has as lost", () => {
    const { lost } = diffItemStats(
      "da=10;lvl=200",
      "da=10;heal=514;legbon=curse;lvl=220",
    );

    expect(lost.map(({ key }) => key)).toEqual(["heal", "legbon.curse"]);
  });

  it("never diffs legendary bonus strength", () => {
    const { changes } = diffItemStats("legbon=curse", "");

    expect(changes.size).toBe(0);
  });
});
