import { describe, expect, it } from "vitest";
import {
  buildBattleListFilterLabels,
  buildHeadToHeadFilterLabels,
  buildPlayerVsPlayerFilterLabels,
  getResetBattleListFilters,
  getResetHeadToHeadFilters,
  getResetPlayerVsPlayerFilters,
  removeBattleListFilter,
  removeHeadToHeadFilter,
  removePlayerVsPlayerFilter,
} from "./battle-panel-active-filter-helpers";

const translate = (key: string, options?: Record<string, unknown>) => {
  if (!options) {
    return key;
  }

  const suffix = Object.entries(options)
    .map(([name, value]) => `${name}:${value}`)
    .join(",");

  return `${key}(${suffix})`;
};

describe("battle panel active filter helpers", () => {
  it("builds battle list chip labels in a stable order", () => {
    const chips = buildBattleListFilterLabels({
      filters: {
        search: "Kamael",
        world: "aether",
        result: ["won", "lost"],
        characterId: ["1", "2"],
        type: ["solo"],
        ph: true,
        matchmaking: true,
        minLevel: 30,
        maxLevel: 180,
      },
      formatWorld: (world) => world.toUpperCase(),
      selectedWarriorsCount: 1,
      translate,
    });

    expect(chips.map((chip) => chip.id)).toEqual([
      "search",
      "world",
      "result",
      "character",
      "type",
      "ph",
      "matchmaking",
      "level",
    ]);
    expect(chips[1]?.label).toBe(
      "battlePanel.filters.chips.world(value:AETHER)",
    );
    expect(chips[7]?.label).toBe(
      "battlePanel.filters.chips.levelRange(min:30,max:180)",
    );
  });

  it("removes individual battle list filters and resets level range", () => {
    const filters = {
      search: "Kamael",
      minLevel: 30,
      maxLevel: 180,
    };

    expect(removeBattleListFilter(filters, "search")).toEqual({
      search: undefined,
      minLevel: 30,
      maxLevel: 180,
    });
    expect(removeBattleListFilter(filters, "level")).toEqual({
      search: "Kamael",
      minLevel: 1,
      maxLevel: 500,
    });
    expect(getResetBattleListFilters()).toEqual({
      minLevel: 1,
      maxLevel: 500,
    });
  });

  it("builds H2H chips for opponent search, period and optional modes", () => {
    const chips = buildHeadToHeadFilterLabels({
      characterId: "character-id",
      period: "7d",
      minLevel: 10,
      maxLevel: 200,
      ph: true,
      matchmaking: true,
      search: "Opponent",
      selectedWarriorsCount: 1,
      translate,
    });

    expect(chips.map((chip) => chip.id)).toEqual([
      "search",
      "character",
      "period",
      "ph",
      "matchmaking",
      "level",
    ]);
    expect(chips[2]?.label).toBe(
      "battlePanel.filters.chips.period(value:battlePanel.filters.periodOptions.7d)",
    );
  });

  it("resets H2H filters and removes H2H period chips", () => {
    expect(
      removeHeadToHeadFilter(
        {
          characterId: "character-id",
          period: "90d",
          minLevel: 10,
          maxLevel: 200,
        },
        "period",
      ),
    ).toEqual({
      characterId: "character-id",
      period: "30d",
      minLevel: 10,
      maxLevel: 200,
    });
    expect(getResetHeadToHeadFilters()).toEqual({
      period: "30d",
      minLevel: 1,
      maxLevel: 500,
      ph: undefined,
      matchmaking: undefined,
      search: undefined,
    });
  });

  it("builds and resets PvP filter chips", () => {
    expect(
      buildPlayerVsPlayerFilterLabels({
        period: "all",
        minLevel: 20,
        maxLevel: 300,
        ph: true,
        matchmaking: true,
        translate,
      }).map((chip) => chip.id),
    ).toEqual(["period", "ph", "matchmaking", "level"]);
    expect(
      removePlayerVsPlayerFilter(
        {
          period: "all",
          minLevel: 20,
          maxLevel: 300,
          ph: true,
          matchmaking: true,
        },
        "level",
      ),
    ).toEqual({
      period: "all",
      minLevel: 1,
      maxLevel: 500,
      ph: true,
      matchmaking: true,
    });
    expect(
      removePlayerVsPlayerFilter(
        {
          period: "all",
          minLevel: 20,
          maxLevel: 300,
          ph: true,
          matchmaking: true,
        },
        "matchmaking",
      ),
    ).toEqual({
      period: "all",
      minLevel: 20,
      maxLevel: 300,
      ph: true,
      matchmaking: undefined,
    });
    expect(getResetPlayerVsPlayerFilters()).toEqual({
      period: "30d",
      minLevel: 1,
      maxLevel: 500,
      ph: undefined,
      matchmaking: undefined,
    });
  });
});
