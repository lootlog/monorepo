import { describe, expect, it } from "vitest";
import { loadBattlePanelAbyssSearch } from "./battle-panel-statistics-search";

describe("battle panel abyss search params", () => {
  it("parses selected season and date range", () => {
    const result = loadBattlePanelAbyssSearch(
      "?characterId=char-1&tab=analytics&seasonId=abyss-1&startDate=2025-01-28T18%3A00%3A00.000Z&endDate=2025-02-09T20%3A00%3A00.000Z&minLevel=40&maxLevel=300&cursor=abc",
    );

    expect(result).toEqual({
      characterId: "char-1",
      tab: "analytics",
      seasonId: "abyss-1",
      startDate: "2025-01-28T18:00:00.000Z",
      endDate: "2025-02-09T20:00:00.000Z",
      minLevel: 40,
      maxLevel: 300,
      cursor: "abc",
    });
  });

  it("keeps default level range for abyss hub links", () => {
    const result = loadBattlePanelAbyssSearch("?characterId=char-1");

    expect(result).toEqual({
      characterId: "char-1",
      tab: "battles",
      seasonId: null,
      startDate: null,
      endDate: null,
      minLevel: 1,
      maxLevel: 500,
      cursor: null,
    });
  });
});
