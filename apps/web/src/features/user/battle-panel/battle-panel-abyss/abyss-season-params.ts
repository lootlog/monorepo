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

export const getAbyssSeasonAnalyticsParams = (
  scope: AbyssSeasonScope,
): BattleAnalyticsParams => ({
  ...scope,
  period: "all",
  minLevel: BATTLE_PANEL_DEFAULT_MIN_LEVEL,
  maxLevel: BATTLE_PANEL_DEFAULT_MAX_LEVEL,
  matchmaking: true,
});
