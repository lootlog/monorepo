import { CharacterSelector } from "@/components/filters/character-selector";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { SectionHeader } from "@/components/layout/section-header";
import { ROUTES } from "@/config/routes";
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
import { BattlePanelStatisticsSkeleton } from "../battle-panel-statistics/battle-panel-statistics-skeleton";
import { AbyssAnalyticsTab } from "./abyss-analytics-tab";
import { AbyssBattlesTab } from "./abyss-battles-tab";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";
import { AbyssSeasonsTable } from "./abyss-seasons-table";
import { AbyssSummaryCards } from "./abyss-summary-cards";
import { useAbyssHub } from "./use-abyss-hub";

const PAGE_SIZE = 20;

const NO_SEASON_VALUE = "no-season";

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
