import { describe, expect, it } from "vitest";
import {
  BATTLE_PANEL_FIRST_PAGE,
  battlePanelBattlesSearchSchema,
  getBattlePanelCursorPaginationForCursor,
  getBattlePanelPageIndex,
  getNextBattlePanelPage,
  getPreviousBattlePanelPage,
  loadBattlePanelAbyssSearch,
  loadBattlePanelBattlesSearch,
  loadBattlePanelHeadToHeadSearch,
  loadBattlePanelPlayerVsPlayerSearch,
  loadBattlePanelSingleBattleSearch,
  loadBattlePanelStatisticsSearch,
  resetBattlePanelCursorPagination,
} from "./battle-panel-search";

describe("battle panel search params", () => {
  it("parses battle list filters and keeps page with cursor", () => {
    const result = loadBattlePanelBattlesSearch(
      "?world=aldous&type=solo,group&result=won,flee&search=foo&ph=true&characterId=char-1,char-2&startDate=2025-01-01&endDate=2025-01-02&minLevel=40&maxLevel=300&cursor=abc&page=3&matchmaking=true",
    );

    expect(result).toEqual({
      cursor: "abc",
      page: 3,
      world: "aldous",
      type: ["solo", "group"],
      search: "foo",
      result: ["won", "flee"],
      ph: true,
      startDate: "2025-01-01",
      endDate: "2025-01-02",
      characterId: ["char-1", "char-2"],
      minLevel: 40,
      maxLevel: 300,
    });
  });

  it("uses battle list defaults and ignores invalid values", () => {
    const result = loadBattlePanelBattlesSearch(
      "?type=raid&result=draw&page=oops&minLevel=oops&maxLevel=oops",
    );

    expect(result).toEqual({
      cursor: null,
      page: BATTLE_PANEL_FIRST_PAGE,
      world: null,
      type: [],
      search: null,
      result: [],
      ph: null,
      startDate: null,
      endDate: null,
      characterId: null,
      minLevel: 1,
      maxLevel: 500,
    });
  });

  it("parses statistics defaults and filters", () => {
    expect(
      loadBattlePanelStatisticsSearch(
        "?characterId=char-1&period=90d&minLevel=20&maxLevel=250&ph=true&matchmaking=false",
      ),
    ).toEqual({
      characterId: "char-1",
      period: "90d",
      minLevel: 20,
      maxLevel: 250,
      startDate: null,
      endDate: null,
      ph: true,
      matchmaking: false,
    });

    expect(loadBattlePanelStatisticsSearch("?period=invalid")).toEqual({
      characterId: null,
      period: "30d",
      minLevel: 1,
      maxLevel: 500,
      startDate: null,
      endDate: null,
      ph: null,
      matchmaking: null,
    });
  });

  it("parses H2H pagination, search and sorting defaults", () => {
    expect(
      loadBattlePanelHeadToHeadSearch(
        "?cursor=abc&page=2&search=Opponent&sortBy=winRate&sortOrder=asc",
      ),
    ).toEqual({
      characterId: null,
      period: "30d",
      minLevel: 1,
      maxLevel: 500,
      startDate: null,
      endDate: null,
      ph: null,
      matchmaking: null,
      cursor: "abc",
      page: 2,
      search: "Opponent",
      sortBy: "winRate",
      sortOrder: "asc",
    });
  });

  it("parses PvP pagination filters", () => {
    expect(loadBattlePanelPlayerVsPlayerSearch("?cursor=abc&page=4")).toEqual({
      characterId: null,
      period: "30d",
      minLevel: 1,
      maxLevel: 500,
      startDate: null,
      endDate: null,
      ph: null,
      matchmaking: null,
      cursor: "abc",
      page: 4,
    });
  });

  it("parses selected abyss season and date range", () => {
    const result = loadBattlePanelAbyssSearch(
      "?characterId=char-1&tab=analytics&seasonId=abyss-1&startDate=2025-01-28T18%3A00%3A00.000Z&endDate=2025-02-09T20%3A00%3A00.000Z&minLevel=40&maxLevel=300&cursor=abc&page=2",
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
      page: 2,
    });
  });

  it("parses single battle turn without defaulting missing values", () => {
    expect(loadBattlePanelSingleBattleSearch("?turn=12")).toEqual({
      turn: 12,
    });
    expect(loadBattlePanelSingleBattleSearch("?turn=bad")).toEqual({
      turn: null,
    });
  });
});

describe("battle panel battle list route search schema", () => {
  it("normalizes scalar battle result values from route validation input", () => {
    const result = battlePanelBattlesSearchSchema["~standard"].validate({
      result: "lost",
    });

    expect(result).toEqual({
      value: {
        result: ["lost"],
      },
    });
  });

  it("normalizes comma separated and repeated array params", () => {
    const result = battlePanelBattlesSearchSchema["~standard"].validate({
      type: "solo,group",
      result: ["lost,flee", "won"],
      characterId: "char-1,char-2",
    });

    expect(result).toEqual({
      value: {
        type: ["solo", "group"],
        result: ["lost", "flee", "won"],
        characterId: ["char-1", "char-2"],
      },
    });
  });

  it("omits invalid battle list values during route validation", () => {
    const result = battlePanelBattlesSearchSchema["~standard"].validate({
      type: "raid",
      result: "draw",
      page: "oops",
    });

    expect(result).toEqual({
      value: {},
    });
  });
});

describe("battle panel cursor pagination helpers", () => {
  it("resets cursor pagination to the first page", () => {
    expect(resetBattlePanelCursorPagination()).toEqual({
      cursor: null,
      page: BATTLE_PANEL_FIRST_PAGE,
    });
  });

  it("converts URL pages into zero-based page indexes for table footers", () => {
    expect(getBattlePanelPageIndex(1)).toBe(0);
    expect(getBattlePanelPageIndex(3)).toBe(2);
    expect(getBattlePanelPageIndex(-5)).toBe(0);
  });

  it("moves page values forward and backward within valid bounds", () => {
    expect(getNextBattlePanelPage(1)).toBe(2);
    expect(getPreviousBattlePanelPage(3)).toBe(2);
    expect(getPreviousBattlePanelPage(1)).toBe(1);
  });

  it("updates page based on cursor direction", () => {
    expect(
      getBattlePanelCursorPaginationForCursor({
        currentPage: 2,
        nextCursor: "next",
        previousCursor: "prev",
        targetCursor: "next",
      }),
    ).toEqual({ cursor: "next", page: 3 });

    expect(
      getBattlePanelCursorPaginationForCursor({
        currentPage: 2,
        nextCursor: "next",
        previousCursor: "prev",
        targetCursor: "prev",
      }),
    ).toEqual({ cursor: "prev", page: 1 });

    expect(
      getBattlePanelCursorPaginationForCursor({
        currentPage: 2,
        nextCursor: "next",
        previousCursor: "prev",
        targetCursor: undefined,
      }),
    ).toEqual({ cursor: null, page: 1 });
  });
});
