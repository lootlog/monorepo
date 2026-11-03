import type {
  BattlesControllerGetDashboardBattlesParams,
  BattlesControllerGetHeadToHeadParams,
  BattlesControllerGetPlayerVsPlayerBattlesParams,
} from "@lootlog/client/battlelog";
import type { inferParserType } from "nuqs";
import type {
  battlePanelAbyssSeasonSearchParsers,
  battlePanelBattlesSearchParsers,
  battlePanelHeadToHeadSearchParsers,
  battlePanelPlayerVsPlayerSearchParsers,
} from "./battle-panel-search";

// Each builder serves a page and its route loader alike, so the loader
// prefetches the very query key the page reads.

/** Rows on one page of every battle panel table. */
export const BATTLE_PANEL_PAGE_SIZE = 20;

export const buildDashboardBattlesParams = (
  search: inferParserType<typeof battlePanelBattlesSearchParsers>,
): BattlesControllerGetDashboardBattlesParams => ({
  cursor: search.cursor ?? undefined,
  size: BATTLE_PANEL_PAGE_SIZE,
  includeTotal: true,
  world: search.world ?? undefined,
  type: search.type ?? undefined,
  search: search.search ?? undefined,
  result: search.result ?? undefined,
  ph: search.ph ?? undefined,
  matchmaking: search.matchmaking ?? undefined,
  characterId: search.characterId ?? undefined,
  startDate: search.startDate ?? undefined,
  endDate: search.endDate ?? undefined,
  minLevel: search.minLevel,
  maxLevel: search.maxLevel,
});

/** A season's battles; the season fixes the character and dates. */
export const buildAbyssSeasonBattlesParams = (
  search: inferParserType<typeof battlePanelAbyssSeasonSearchParsers>,
  characterId: string | undefined,
  season: { startedAt: string; endedAt: string } | undefined,
): BattlesControllerGetDashboardBattlesParams => ({
  cursor: search.cursor ?? undefined,
  size: BATTLE_PANEL_PAGE_SIZE,
  includeTotal: true,
  matchmaking: true,
  characterId: characterId ? [characterId] : undefined,
  startDate: season?.startedAt,
  endDate: season?.endedAt,
});

/** Opponents of a character, or of one Abyss season when `season` is set. */
export const buildHeadToHeadParams = (
  search: inferParserType<typeof battlePanelHeadToHeadSearchParsers>,
  scope: {
    characterId: string | undefined;
    matchmaking: boolean;
    showPhFilter: boolean;
    season?: { startDate: string; endDate: string };
  },
): BattlesControllerGetHeadToHeadParams => ({
  cursor: search.cursor ?? undefined,
  size: BATTLE_PANEL_PAGE_SIZE,
  sortBy: search.sortBy,
  sortOrder: search.sortOrder,
  characterId: scope.characterId,
  period: scope.season ? "all" : search.period,
  startDate: scope.season?.startDate ?? search.startDate ?? undefined,
  endDate: scope.season?.endDate ?? search.endDate ?? undefined,
  search: search.search ?? undefined,
  minLevel: search.minLevel,
  maxLevel: search.maxLevel,
  ph: scope.showPhFilter ? (search.ph ?? undefined) : undefined,
  matchmaking: scope.matchmaking,
  includeTotal: true,
});

export const buildPlayerVsPlayerParams = (
  search: inferParserType<typeof battlePanelPlayerVsPlayerSearchParsers>,
  ids: { characterId: string | undefined; opponentId: string },
): BattlesControllerGetPlayerVsPlayerBattlesParams => ({
  cursor: search.cursor ?? undefined,
  size: BATTLE_PANEL_PAGE_SIZE,
  characterId: ids.characterId,
  opponentId: ids.opponentId,
  period: search.period,
  startDate: search.startDate ?? undefined,
  endDate: search.endDate ?? undefined,
  minLevel: search.minLevel,
  maxLevel: search.maxLevel,
  ph: search.ph ?? undefined,
  matchmaking: search.matchmaking ?? undefined,
  includeTotal: true,
});
