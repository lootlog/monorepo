import { describe, expect, it } from "vitest";
import {
  indexChampionFactions,
  selectVisibleChampions,
} from "./faction-war-champions";

const factions = indexChampionFactions({
  warId: "2026-barbatos-tanroth",
  champions: [
    { faction: "BARBATOS", characterIds: ["100", "200"] },
    { faction: "TANROTH", characterIds: ["300"] },
  ],
});

describe("indexChampionFactions", () => {
  it("finds the winning faction of each champion character", () => {
    expect(factions.get("200")).toBe("BARBATOS");
    expect(factions.get("300")).toBe("TANROTH");
    expect(factions.get("400")).toBeUndefined();
  });

  it("has no champions before any war ended", () => {
    expect(indexChampionFactions({ warId: null, champions: [] }).size).toBe(0);
  });
});

describe("selectVisibleChampions", () => {
  it("lights up the hero and the champions on the map", () => {
    expect(
      selectVisibleChampions({
        factions,
        heroId: "100",
        otherIds: ["300", "999", "100"],
        hideOthers: false,
      }),
    ).toEqual([
      { characterId: "100", faction: "BARBATOS" },
      { characterId: "300", faction: "TANROTH" },
    ]);
  });

  it("keeps only the hero's own highlight when others are hidden", () => {
    expect(
      selectVisibleChampions({
        factions,
        heroId: "100",
        otherIds: ["200", "300"],
        hideOthers: true,
      }),
    ).toEqual([{ characterId: "100", faction: "BARBATOS" }]);
  });
});
