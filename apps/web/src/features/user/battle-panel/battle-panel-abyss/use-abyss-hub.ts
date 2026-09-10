import {
  battlePanelAbyssSearchParsers,
  getBattlePanelCursorPaginationForCursor,
  getBattlePanelPageIndex,
  normalizeBattlePanelCharacterId,
  resetBattlePanelCursorPagination,
  type AbyssTab,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import {
  getBattlesControllerGetAbyssSeasonsQueryKey,
  getBattlesControllerGetBattleDurationQueryKey,
  getBattlesControllerGetCombatProfileQueryKey,
  getBattlesControllerGetCurrentStreakQueryKey,
  getBattlesControllerGetDashboardBattlesQueryKey,
  getBattlesControllerGetProfessionWinRateQueryKey,
  getBattlesControllerGetRatingDeltaByOpponentQueryKey,
  getBattlesControllerGetRatingGrowthQueryKey,
  useBattlesControllerGetAbyssSeasons,
  useBattlesControllerGetBattleDuration,
  useBattlesControllerGetCombatProfile,
  useBattlesControllerGetCurrentStreak,
  useBattlesControllerGetDashboardBattles,
  useBattlesControllerGetProfessionWinRate,
  useBattlesControllerGetRatingDeltaByOpponent,
  useBattlesControllerGetRatingGrowth,
  useBattlesControllerGetUserCharacters,
} from "@lootlog/client/battlelog";
import { useQueryStates } from "nuqs";
import { startTransition, useEffect } from "react";
import { useTranslation } from "react-i18next";

const ABYSS_PERIOD: Period = "all";
const PAGE_SIZE = 20;

const isAbyssTab = (value: string): value is AbyssTab =>
  value === "battles" || value === "analytics" || value === "seasons";

const getCharacterFilter = (characterId: string | undefined) =>
  characterId ? [characterId] : undefined;

const getAbyssSeasonSelection = ({
  seasons,
  seasonId,
  startDate,
  endDate,
}: {
  seasons: AbyssSeason[];
  seasonId: string | null;
  startDate: string | null;
  endDate: string | null;
}) => {
  const selectedSeason =
    seasons.find((season) => season.id === seasonId) ?? seasons[0];
  return {
    selectedSeason,
    startDate: startDate ?? selectedSeason?.startedAt,
    endDate: endDate ?? selectedSeason?.endedAt,
  };
};

export function useAbyssHub() {
  const { t } = useTranslation();
  const { data: charactersResponse, isLoading: isLoadingCharacters } =
    useBattlesControllerGetUserCharacters();
  const characters = charactersResponse?.characters;
  const [queryState, setQueryState] = useQueryStates(
    battlePanelAbyssSearchParsers,
  );
  const resolvePageState = () => {
    const currentCharacterId = normalizeBattlePanelCharacterId(
      queryState.characterId,
    );
    return {
      pageIndex: getBattlePanelPageIndex(queryState.page),
      activeTab: queryState.tab,
      currentCharacterId,
      selectedCharacterId: currentCharacterId ?? characters?.[0]?.id,
      minLevel: queryState.minLevel,
      maxLevel: queryState.maxLevel,
      cursor: queryState.cursor ?? undefined,
    };
  };
  const {
    pageIndex,
    activeTab,
    currentCharacterId,
    selectedCharacterId,
    minLevel,
    maxLevel,
    cursor,
  } = resolvePageState();

  useEffect(() => {
    if (!isLoadingCharacters && characters?.length && !currentCharacterId) {
      const firstCharacterId = characters[0]?.id;
      if (firstCharacterId) {
        void setQueryState({
          characterId: firstCharacterId,
        });
      }
    }
  }, [characters, currentCharacterId, isLoadingCharacters, setQueryState]);

  const { data: seasons = [], isLoading: isLoadingSeasons } =
    useBattlesControllerGetAbyssSeasons(
      {
        characterId: selectedCharacterId ?? "",
      },
      {
        query: {
          enabled: Boolean(selectedCharacterId),
          queryKey: getBattlesControllerGetAbyssSeasonsQueryKey({
            characterId: selectedCharacterId ?? "",
          }),
        },
      },
    );

  const { selectedSeason, startDate, endDate } = getAbyssSeasonSelection({
    seasons,
    seasonId: queryState.seasonId,
    startDate: queryState.startDate,
    endDate: queryState.endDate,
  });
  const isStatsEnabled = Boolean(selectedCharacterId);
  const isBattlesTab = activeTab === "battles";
  const isAnalyticsTab = activeTab === "analytics";
  const enableAnalyticsQueries = isStatsEnabled && isAnalyticsTab;
  const enableBattlesQuery = isStatsEnabled && isBattlesTab;
  const abyssStatsParams = {
    characterId: selectedCharacterId,
    period: ABYSS_PERIOD,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    matchmaking: true,
  };
  const dashboardParams = {
    cursor,
    size: PAGE_SIZE,
    includeTotal: true,
    matchmaking: true,
    characterId: getCharacterFilter(selectedCharacterId),
    startDate,
    endDate,
    minLevel,
    maxLevel,
  };

  const { data: professionData, isLoading: isProfessionLoading } =
    useBattlesControllerGetProfessionWinRate(abyssStatsParams, {
      query: {
        enabled: enableAnalyticsQueries,
        queryKey:
          getBattlesControllerGetProfessionWinRateQueryKey(abyssStatsParams),
      },
    });
  const { data: streakData, isLoading: isStreakLoading } =
    useBattlesControllerGetCurrentStreak(abyssStatsParams, {
      query: {
        enabled: enableAnalyticsQueries,
        queryKey:
          getBattlesControllerGetCurrentStreakQueryKey(abyssStatsParams),
      },
    });
  const { data: durationData, isLoading: isDurationLoading } =
    useBattlesControllerGetBattleDuration(abyssStatsParams, {
      query: {
        enabled: enableAnalyticsQueries,
        queryKey:
          getBattlesControllerGetBattleDurationQueryKey(abyssStatsParams),
      },
    });
  const { data: combatProfile, isLoading: isCombatProfileLoading } =
    useBattlesControllerGetCombatProfile(abyssStatsParams, {
      query: {
        enabled: enableAnalyticsQueries,
        queryKey:
          getBattlesControllerGetCombatProfileQueryKey(abyssStatsParams),
      },
    });
  const { data: ratingGrowthData, isLoading: isRatingGrowthLoading } =
    useBattlesControllerGetRatingGrowth(abyssStatsParams, {
      query: {
        enabled: enableAnalyticsQueries,
        queryKey: getBattlesControllerGetRatingGrowthQueryKey(abyssStatsParams),
      },
    });
  const { data: ratingDeltaData, isLoading: isRatingDeltaLoading } =
    useBattlesControllerGetRatingDeltaByOpponent(abyssStatsParams, {
      query: {
        enabled: enableAnalyticsQueries,
        queryKey:
          getBattlesControllerGetRatingDeltaByOpponentQueryKey(
            abyssStatsParams,
          ),
      },
    });
  const { data: battlesResponse, isLoading: isBattlesLoading } =
    useBattlesControllerGetDashboardBattles(dashboardParams, {
      query: {
        enabled: enableBattlesQuery,
        queryKey:
          getBattlesControllerGetDashboardBattlesQueryKey(dashboardParams),
      },
    });

  const handleCharacterChange = (characterId: string | undefined) => {
    startTransition(() => {
      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        characterId: characterId ?? null,
        seasonId: null,
        startDate: null,
        endDate: null,
      });
    });
  };

  const handleSeasonChange = (seasonId: string | null) => {
    if (seasonId === null) return;
    const nextSeason = seasons.find((season) => season.id === seasonId);
    if (!nextSeason) {
      return;
    }

    startTransition(() => {
      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        seasonId: nextSeason.id,
        startDate: nextSeason.startedAt,
        endDate: nextSeason.endedAt,
      });
    });
  };

  const handleSeasonSelect = (season: AbyssSeason) => {
    handleSeasonChange(season.id);
  };

  const handleTabChange = (value: string) => {
    if (!isAbyssTab(value)) {
      return;
    }

    startTransition(() => {
      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        tab: value,
      });
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    startTransition(() => {
      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        minLevel: value ?? 1,
      });
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    startTransition(() => {
      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        maxLevel: value ?? 500,
      });
    });
  };

  const handleCursorChange = (nextCursor: string | undefined) => {
    void setQueryState(
      getBattlePanelCursorPaginationForCursor({
        currentPage: queryState.page,
        nextCursor: battlesResponse?.pagination.nextCursor,
        previousCursor: battlesResponse?.pagination.previousCursor,
        targetCursor: nextCursor,
      }),
    );
  };

  const h2hSearch = {
    characterId: selectedCharacterId,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    matchmaking: true,
  };

  return {
    isLoadingCharacters,
    t,
    currentCharacterId,
    handleCharacterChange,
    selectedSeason,
    handleSeasonChange,
    isLoadingSeasons,
    seasons,
    minLevel,
    maxLevel,
    handleMinLevelChange,
    handleMaxLevelChange,
    h2hSearch,
    activeTab,
    handleTabChange,
    battlesResponse,
    cursor,
    isBattlesLoading,
    handleCursorChange,
    pageIndex,
    dashboardParams,
    combatProfile,
    durationData,
    isCombatProfileLoading,
    isDurationLoading,
    isProfessionLoading,
    isRatingDeltaLoading,
    isRatingGrowthLoading,
    isStreakLoading,
    professionData,
    ratingDeltaData,
    ratingGrowthData,
    streakData,
    handleSeasonSelect,
  };
}
