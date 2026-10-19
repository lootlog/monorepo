import { BattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-list";
import {
  battlePanelAbyssSeasonSearchParsers,
  getBattlePanelCursorPaginationForCursor,
  getBattlePanelPageIndex,
  resetBattlePanelCursorPagination,
} from "@/features/user/battle-panel/battle-panel-search";
import { useResetRejectedBattlePanelCursor } from "@/features/user/battle-panel/components/use-reset-rejected-battle-panel-cursor";
import { useBattlesControllerGetDashboardBattles } from "@lootlog/client/battlelog";
import { useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { useAbyssSeason } from "./use-abyss-season";

export const ABYSS_SEASON_PAGE_SIZE = 20;

/** The season's battles, newest first, a page at a time. */
export function AbyssSeasonBattles() {
  const { t } = useTranslation();
  const { characterId, season } = useAbyssSeason();

  const [queryState, setQueryState] = useQueryStates(
    battlePanelAbyssSeasonSearchParsers,
  );

  const params = {
    cursor: queryState.cursor ?? undefined,
    size: ABYSS_SEASON_PAGE_SIZE,
    includeTotal: true,
    matchmaking: true,
    characterId: characterId ? [characterId] : undefined,
    startDate: season?.startedAt,
    endDate: season?.endedAt,
  };

  const {
    data: battlesResponse,
    error,
    isLoading,
    isPlaceholderData: isRefreshing,
  } = useBattlesControllerGetDashboardBattles(params, {
    query: { enabled: Boolean(characterId && season) },
  });

  useResetRejectedBattlePanelCursor({
    cursor: queryState.cursor,
    error,
    reset: () => void setQueryState(resetBattlePanelCursorPagination()),
  });

  return (
    <BattlesList
      battlesResponse={battlesResponse}
      clearFiltersLabel={t("battlePanel.filters.clear")}
      params={params}
      onCursorChange={(cursor) =>
        void setQueryState(
          getBattlePanelCursorPaginationForCursor({
            currentPage: queryState.page,
            nextCursor: battlesResponse?.pagination.nextCursor,
            previousCursor: battlesResponse?.pagination.previousCursor,
            targetCursor: cursor,
          }),
        )
      }
      pageIndex={getBattlePanelPageIndex(queryState.page)}
      pageSize={ABYSS_SEASON_PAGE_SIZE}
      showPagination
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      enableScrollToTop
    />
  );
}
