import { CharacterSelector } from "@/components/filters/character-selector";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { ROUTES } from "@/config/routes";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { Link } from "@tanstack/react-router";
import { BarChart3, Swords, Trophy } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { AbyssAnalyticsTab } from "./abyss-analytics-tab";
import { AbyssBattlesTab } from "./abyss-battles-tab";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";
import { AbyssSeasonsTable } from "./abyss-seasons-table";
import { AbyssHubSkeleton } from "./abyss-hub-skeleton";
import { AbyssSummaryCards } from "./abyss-summary-cards";
import { useAbyssHub } from "./use-abyss-hub";

const PAGE_SIZE = 20;

const getSeasonLabel = (
  season: AbyssSeason,
  index: number,
  latestSeasonLabel: string,
) => (index === 0 ? latestSeasonLabel : getAbyssSeasonRangeLabel(season));

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

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-w-0 flex-col gap-0"
    >
      <h1 className="sr-only">{t("battlePanel.abyss.title")}</h1>

      <ResultsSurface
        filters={
          <>
            {showViews && (
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
            )}

            <CharacterSelector
              characterId={currentCharacterId}
              onCharacterChange={handleCharacterChange}
              allowAllCharacters={false}
              className="w-full md:w-[240px]"
            />

            <FilterPopover
              icon={Trophy}
              showSearch={false}
              options={seasons.map((season, index) => ({
                value: season.id,
                label: getSeasonLabel(
                  season,
                  index,
                  t("battlePanel.abyss.latestSeason"),
                ),
              }))}
              value={selectedSeason?.id}
              onValueChange={handleSeasonChange}
              disabled={isLoadingSeasons || seasons.length === 0}
              placeholder={
                seasons.length === 0 && !isLoadingSeasons
                  ? t("battlePanel.abyss.noSeason")
                  : t("battlePanel.abyss.selectSeason")
              }
              emptyMessage={t("battlePanel.abyss.noSeason")}
              width="w-full md:w-[260px]"
              triggerClassName="min-w-0"
              contentClassName="w-[260px]"
            />

            <LevelRangeFilter
              layout="inline"
              minLevel={minLevel}
              maxLevel={maxLevel}
              onMinLevelChange={handleMinLevelChange}
              onMaxLevelChange={handleMaxLevelChange}
            />

            {showViews && (
              <ChevronLink
                className="px-1 sm:ml-auto"
                render=<Link
                  to={ROUTES.user.battlePanel.matchmakingH2h}
                  search={h2hSearch}
                />
              >
                {t("battlePanel.abyss.openH2h")}
              </ChevronLink>
            )}
          </>
        }
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
              framed
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
