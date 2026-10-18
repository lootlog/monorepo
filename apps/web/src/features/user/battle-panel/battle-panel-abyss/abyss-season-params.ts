import {
  BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  BATTLE_PANEL_DEFAULT_MIN_LEVEL,
} from "@/features/user/battle-panel/components/battle-panel-filter-state";
import type { BattleAnalyticsParams } from "@/features/user/battle-panel/battle-panel-statistics/components/battle-analytics-overview";

type AbyssSeasonScope = {
  characterId: string;
  startDate: string;
  endDate: string;
};

/**
 * The analytics of a season's battles. The page and its loader build the same
 * params, so the loader's prefetch fills the page's queries.
 */
export const getAbyssSeasonAnalyticsParams = (
  scope: AbyssSeasonScope,
): BattleAnalyticsParams => ({
  ...scope,
  period: "all",
  // A season shows all its battles; it has no level filter.
  minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
  maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  matchmaking: true,
});
