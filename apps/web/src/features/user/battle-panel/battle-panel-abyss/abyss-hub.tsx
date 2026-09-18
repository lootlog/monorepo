import { CharacterSelector } from "@/components/filters/character-selector";
import { BattlePanelLevelRange } from "@/features/user/battle-panel/components/battle-panel-level-range";
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
import { ArrowRight, BarChart3, Swords, Trophy } from "lucide-react";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { SectionCard } from "@/components/common/section-card/section-card";
import { TableFilterToolbar } from "@/components/ui/table-filter-toolbar";
import { AbyssAnalyticsTab } from "./abyss-analytics-tab";
import { AbyssBattlesTab } from "./abyss-battles-tab";
import { getAbyssSeasonRangeLabel } from "./abyss-formatters";
import { AbyssSeasonsTable } from "./abyss-seasons-table";
import { AbyssHubSkeleton } from "./abyss-hub-skeleton";
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
    <div className="flex h-full min-h-0 flex-col bg-background pt-3">
      <ScrollArea className="min-h-0 flex-1">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-full min-w-0 flex-col gap-3 px-3 pb-3"
        >
          <h1 className="sr-only">{t("battlePanel.abyss.title")}</h1>

          <SectionCard className="shrink-0 overflow-hidden">
            {showViews && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-2">
                <TabsList
                  aria-label={t("battlePanel.abyss.title")}
                  className="h-auto w-full gap-1 bg-transparent p-0 sm:w-auto"
                >
                  {views.map((view) => (
                    <TabsTrigger
                      key={view.value}
                      value={view.value}
                      className="h-10 gap-2 rounded-xl px-4 text-muted-foreground hover:text-foreground data-active:border-primary/30 data-active:bg-primary/15 data-active:text-primary data-active:shadow-none sm:flex-none dark:data-active:border-primary/30 dark:data-active:bg-primary/15 dark:data-active:text-primary"
                    >
                      <view.icon className="size-4" aria-hidden="true" />
                      {view.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <Button
                  variant="ghost"
                  className="h-10 w-full sm:ml-auto sm:w-auto"
                  render={
                    <Link
                      to={ROUTES.user.battlePanel.matchmakingH2h}
                      search={h2hSearch}
                    >
                      {t("battlePanel.abyss.openH2h")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  }
                  nativeButton={false}
                />
              </div>
            )}

            <TableFilterToolbar
              role="group"
              aria-label={t("battlePanel.filters.title")}
              className="border-b-0"
            >
              <CharacterSelector
                characterId={currentCharacterId}
                onCharacterChange={handleCharacterChange}
                allowAllCharacters={false}
                size="default"
                className="h-10 w-full md:w-[240px]"
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
                  className="w-full min-w-0 md:w-[260px]"
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

              <BattlePanelLevelRange
                minLevel={minLevel}
                maxLevel={maxLevel}
                onMinLevelChange={handleMinLevelChange}
                onMaxLevelChange={handleMaxLevelChange}
              />
            </TableFilterToolbar>
          </SectionCard>

          {isLoadingSeasons ? (
            <AbyssSummaryCards isLoading />
          ) : selectedSeason ? (
            <>
              <AbyssSummaryCards season={selectedSeason} />

              {/* From md up the battle list fills the rest of the page and scrolls inside its card. */}
              <TabsContent
                value="battles"
                className="m-0 md:flex md:min-h-[480px] md:basis-0 md:flex-col"
              >
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

              <TabsContent value="analytics" className="m-0 flex-none">
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

              <TabsContent value="seasons" className="m-0 flex-none">
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
            <BattlePanelEmptyState
              framed
              icon={Swords}
              title={t("battlePanel.abyss.emptyTitle")}
              description={t("battlePanel.abyss.emptyDescription")}
            />
          )}
        </Tabs>
      </ScrollArea>
    </div>
  );
}
