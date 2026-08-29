import { CharacterSelector } from "@/components/filters/character-selector";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { SectionHeader } from "@/components/layout/section-header";
import { ROUTES } from "@/config/routes";
import {
  battlePanelAbyssSearchParsers,
  getBattlePanelCursorPaginationForCursor,
  getBattlePanelPageIndex,
  normalizeBattlePanelCharacterId,
  resetBattlePanelCursorPagination,
  type Period,
  type AbyssTab,
} from "@/features/user/battle-panel/battle-panel-search";
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
} from "@lootlog/api-client/react-query/battlelog/battles";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { Link } from "@tanstack/react-router";
import { BarChart3, List, Swords, Trophy } from "lucide-react";
import { useQueryStates } from "nuqs";
import { startTransition, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AbyssAnalyticsTab } from "./abyss-analytics-tab";
import { AbyssBattlesTab } from "./abyss-battles-tab";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";
import { AbyssSeasonsTable } from "./abyss-seasons-table";
import { AbyssSummaryCards } from "./abyss-summary-cards";
import { BattlePanelStatisticsSkeleton } from "../battle-panel-statistics/battle-panel-statistics-skeleton";

const ABYSS_PERIOD: Period = "all";
const PAGE_SIZE = 20;
const NO_SEASON_VALUE = "no-season";

const isAbyssTab = (value: string): value is AbyssTab =>
  value === "battles" || value === "analytics" || value === "seasons";

const getCharacterFilter = (characterId: string | undefined) =>
  characterId ? [characterId] : undefined;

const getSeasonLabel = (
  season: AbyssSeason,
  index: number,
  latestSeasonLabel: string,
) => (index === 0 ? latestSeasonLabel : getAbyssSeasonRangeLabel(season));

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

export function AbyssHub() {
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

  if (isLoadingCharacters) {
    return <BattlePanelStatisticsSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col gap-4 px-3 py-3">
          <SectionHeader
            icon={Swords}
            title={t("battlePanel.abyss.title")}
            subtitle={t("battlePanel.abyss.subtitle")}
          >
            <div className="flex min-w-0 max-w-full flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
              <CharacterSelector
                characterId={currentCharacterId}
                onCharacterChange={handleCharacterChange}
                allowAllCharacters={false}
                size="default"
                className="h-10 w-full min-w-0 lg:w-auto"
              />

              <Select
                value={selectedSeason?.id ?? NO_SEASON_VALUE}
                onValueChange={handleSeasonChange}
                disabled={isLoadingSeasons || seasons.length === 0}
                items={[
                  {
                    value: null,
                    label: <>{t("battlePanel.abyss.selectSeason")}</>,
                  },
                  {
                    value: NO_SEASON_VALUE,
                    label: <>{t("battlePanel.abyss.noSeason")}</>,
                  },
                  ...seasons.map((season, index) => ({
                    value: season.id,
                    label: (
                      <>
                        {getSeasonLabel(
                          season,
                          index,
                          t("battlePanel.abyss.latestSeason"),
                        )}
                      </>
                    ),
                  })),
                ]}
              >
                <SelectTrigger
                  size="lg"
                  className="w-full min-w-0 lg:w-[260px]"
                >
                  <SelectValue
                    placeholder={t("battlePanel.abyss.selectSeason")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {seasons.length === 0 ? (
                    <SelectItem value={NO_SEASON_VALUE} disabled>
                      {t("battlePanel.abyss.noSeason")}
                    </SelectItem>
                  ) : (
                    seasons.map((season, index) => (
                      <SelectItem key={season.id} value={season.id}>
                        {getSeasonLabel(
                          season,
                          index,
                          t("battlePanel.abyss.latestSeason"),
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <div className="flex min-w-0 items-center gap-2">
                <LevelRangeFilter
                  minLevel={minLevel}
                  maxLevel={maxLevel}
                  onMinLevelChange={handleMinLevelChange}
                  onMaxLevelChange={handleMaxLevelChange}
                  minLevelPlaceholder={t("battlePanel.filters.minPlaceholder")}
                  maxLevelPlaceholder={t("battlePanel.filters.maxPlaceholder")}
                />
              </div>

              <Button
                variant="outline"
                className="h-10 w-full min-w-0 lg:w-auto"
                render={
                  <Link
                    to={ROUTES.user.battlePanel.matchmakingH2h}
                    search={h2hSearch}
                  >
                    <List className="size-4" />
                    {t("battlePanel.abyss.openH2h")}
                  </Link>
                }
                nativeButton={false}
              />
            </div>
          </SectionHeader>

          <AbyssSummaryCards season={selectedSeason} />

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="min-w-0 gap-4"
          >
            <TabsList className="grid h-auto w-full min-w-0 grid-cols-3 bg-muted/50 p-1 sm:w-fit">
              <TabsTrigger
                value="battles"
                className="min-h-9 gap-2 text-xs sm:text-sm"
              >
                <Swords className="size-3.5" />
                {t("battlePanel.abyss.tabs.battles")}
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="min-h-9 gap-2 text-xs sm:text-sm"
              >
                <BarChart3 className="size-3.5" />
                {t("battlePanel.abyss.tabs.analytics")}
              </TabsTrigger>
              <TabsTrigger
                value="seasons"
                className="min-h-9 gap-2 text-xs sm:text-sm"
              >
                <Trophy className="size-3.5" />
                {t("battlePanel.abyss.tabs.seasons")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="battles" className="m-0">
              {activeTab === "battles" ? (
                <AbyssBattlesTab
                  battlesResponse={battlesResponse}
                  cursor={cursor}
                  isLoading={isBattlesLoading}
                  onCursorChange={handleCursorChange}
                  pageIndex={pageIndex}
                  pageSize={PAGE_SIZE}
                  params={dashboardParams}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="analytics" className="m-0">
              {activeTab === "analytics" ? (
                <AbyssAnalyticsTab
                  combatProfile={combatProfile}
                  durationData={durationData}
                  isCombatProfileLoading={isCombatProfileLoading}
                  isDurationLoading={isDurationLoading}
                  isProfessionLoading={isProfessionLoading}
                  isRatingDeltaLoading={isRatingDeltaLoading}
                  isRatingGrowthLoading={isRatingGrowthLoading}
                  isStreakLoading={isStreakLoading}
                  professionData={professionData}
                  ratingDeltaData={ratingDeltaData}
                  ratingGrowthData={ratingGrowthData}
                  search={h2hSearch}
                  streakData={streakData}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="seasons" className="m-0">
              {activeTab === "seasons" ? (
                <AbyssSeasonsTable
                  isLoading={isLoadingSeasons}
                  onSelect={handleSeasonSelect}
                  seasons={seasons}
                  selectedSeasonId={selectedSeason?.id}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
