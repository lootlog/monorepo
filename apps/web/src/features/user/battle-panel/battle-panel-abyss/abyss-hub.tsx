import { isLevelRangeActive } from "@/features/user/battle-panel/components/battle-panel-filter-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { BarChart3, Swords, Trophy } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { AbyssAnalyticsTab } from "./abyss-analytics-tab";
import { AbyssBattlesTab } from "./abyss-battles-tab";
import { AbyssFilterToolbar } from "./abyss-filter-toolbar";
import { AbyssStackedFilters } from "./abyss-stacked-filters";
import { AbyssSeasonsTable } from "./abyss-seasons-table";
import { AbyssHubSkeleton } from "./abyss-hub-skeleton";
import { AbyssSummaryCards } from "./abyss-summary-cards";
import { useAbyssHub } from "./use-abyss-hub";

const PAGE_SIZE = 20;

export function AbyssHub() {
  const {
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
    isBattlesRefreshing,
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
  } = useAbyssHub();

  if (isLoadingCharacters) {
    return <AbyssHubSkeleton />;
  }

  // The views stay visible while seasons load; a character without Abyss battles has nothing to switch between.
  const showViews = isLoadingSeasons || Boolean(selectedSeason);

  const views = [
    {
      value: "battles",
      icon: Swords,
      label: t("battlePanel.abyss.tabs.battles"),
    },
    {
      value: "analytics",
      icon: BarChart3,
      label: t("battlePanel.abyss.tabs.analytics"),
    },
    {
      value: "seasons",
      icon: Trophy,
      label: t("battlePanel.abyss.tabs.seasons"),
    },
  ];

  const filterProps = {
    characterId: currentCharacterId,
    onCharacterChange: handleCharacterChange,
    seasons,
    selectedSeasonId: selectedSeason?.id,
    isLoadingSeasons,
    onSeasonChange: handleSeasonChange,
    minLevel,
    maxLevel,
    onMinLevelChange: handleMinLevelChange,
    onMaxLevelChange: handleMaxLevelChange,
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-w-0 flex-col gap-0"
    >
      <h1 className="sr-only">{t("battlePanel.abyss.title")}</h1>

      <ResultsSurface
        // The views are navigation, so they stay in the bar at every width.
        search={
          showViews && (
            <TabsList
              aria-label={t("battlePanel.abyss.title")}
              size="lg"
              className="w-full sm:w-auto"
            >
              {views.map((view) => (
                <TabsTrigger key={view.value} value={view.value}>
                  <view.icon aria-hidden="true" />
                  {view.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )
        }
        filters={<AbyssFilterToolbar {...filterProps} />}
        stackedFilters={<AbyssStackedFilters {...filterProps} />}
        activeFilterCount={isLevelRangeActive({ minLevel, maxLevel }) ? 1 : 0}
        filtersLabel={t("battlePanel.filters.title")}
      >
        {isLoadingSeasons ? (
          <div className="p-3">
            <AbyssSummaryCards isLoading />
          </div>
        ) : selectedSeason ? (
          <>
            <div className="p-3">
              <AbyssSummaryCards season={selectedSeason} />
            </div>

            <TabsContent value="battles" className="m-0">
              {activeTab === "battles" ? (
                <AbyssBattlesTab
                  battlesResponse={battlesResponse}
                  cursor={cursor}
                  isLoading={isBattlesLoading}
                  isRefreshing={isBattlesRefreshing}
                  onCursorChange={handleCursorChange}
                  pageIndex={pageIndex}
                  pageSize={PAGE_SIZE}
                  params={dashboardParams}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="analytics" className="m-0 px-3 pb-3">
              {activeTab === "analytics" ? (
                <AbyssAnalyticsTab
                  combatProfile={{
                    data: combatProfile,
                    isLoading: isCombatProfileLoading,
                  }}
                  duration={{
                    data: durationData,
                    isLoading: isDurationLoading,
                  }}
                  profession={{
                    data: professionData,
                    isLoading: isProfessionLoading,
                  }}
                  ratingDelta={{
                    data: ratingDeltaData,
                    isLoading: isRatingDeltaLoading,
                  }}
                  ratingGrowth={{
                    data: ratingGrowthData,
                    isLoading: isRatingGrowthLoading,
                  }}
                  search={h2hSearch}
                  streak={{ data: streakData, isLoading: isStreakLoading }}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="seasons" className="m-0 px-3 pb-3">
              {activeTab === "seasons" ? (
                <AbyssSeasonsTable
                  isLoading={isLoadingSeasons}
                  onSelect={handleSeasonSelect}
                  seasons={seasons}
                  selectedSeasonId={selectedSeason?.id}
                />
              ) : null}
            </TabsContent>
          </>
        ) : (
          <div className="p-3">
            <EmptyState
              fill
              icon={Swords}
              title={t("battlePanel.abyss.emptyTitle")}
              description={t("battlePanel.abyss.emptyDescription")}
            />
          </div>
        )}
      </ResultsSurface>
    </Tabs>
  );
}
