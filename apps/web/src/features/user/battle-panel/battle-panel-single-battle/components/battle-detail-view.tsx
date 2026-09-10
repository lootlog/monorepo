import {
  BattleLog,
  BattleStatsTable,
  StatsCustomizationModal,
} from "@/components/battle";
import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-definitions";
import { BattleHpTimelineChart } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart";
import { BattleHpTimelineChartSkeleton } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart-skeleton";
import { BattleOverview } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-overview";
import type { Battle } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";
import {
  useBattleDetailView,
  type BattleDetailViewProps,
} from "./use-battle-detail-view";

const getScrollToTurnRequestId = (
  scrollTargetTurn: number | null,
  selectedTurnNumber: number | null,
  requestId: number,
) => {
  if (scrollTargetTurn === null || scrollTargetTurn !== selectedTurnNumber) {
    return 0;
  }
  return requestId;
};

const getBattleCharacterId = (battle: Battle | undefined) =>
  battle?.characterId ?? null;

export function BattleDetailView({
  battle,
  battleId,
  isTimelinePending,
  rawBattle,
  sideContent,
  timeline,
}: BattleDetailViewProps) {
  const {
    scrollViewportRef,
    handleBattleScroll,
    layoutStyle,
    shouldRenderTimelineSlot,
    chartWrapperRef,
    hasTimeline,
    selectedTurnNumber,
    handleTurnSelect,
    sideCardsGridRef,
    hasSideContent,
    t,
    is1v1,
    config,
    updateCategoryOrder,
    toggleCategoryVisibility,
    updateCategoryName,
    updateStatOrder,
    addStatToCategory,
    removeStatFromCategory,
    addCategory,
    removeCategory,
    resetToDefaults,
    setHideZeros,
    hideZeros,
    battleLogWrapperRef,
    scrollTargetTurn,
    scrollTargetRequestId,
    handleSelectedTurnScrollComplete,
    handleTurnFocus,
  } = useBattleDetailView({
    battle,
    battleId,
    isTimelinePending,
    rawBattle,
    sideContent,
    timeline,
  });
  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="h-full min-h-0 bg-background"
      onScroll={handleBattleScroll}
    >
      <div className="px-3 py-3 flex flex-col gap-4" style={layoutStyle}>
        {battle ? <BattleOverview battle={battle} /> : null}

        <div
          className={cn(
            "flex flex-col gap-3",
            shouldRenderTimelineSlot && "lg:sticky lg:top-3 lg:z-20",
          )}
        >
          {shouldRenderTimelineSlot ? (
            <div ref={chartWrapperRef} className="bg-background">
              {hasTimeline && timeline ? (
                <BattleHpTimelineChart
                  timeline={timeline.timeline}
                  warriors={timeline.warriors}
                  characterId={getBattleCharacterId(battle)}
                  selectedTurn={selectedTurnNumber}
                  onTurnSelect={handleTurnSelect}
                />
              ) : (
                <BattleHpTimelineChartSkeleton />
              )}
            </div>
          ) : null}

          <div
            ref={sideCardsGridRef}
            className={cn(
              "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)]",
              hasSideContent &&
                "xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(300px,0.9fr)]",
            )}
          >
            <div className="min-w-0">
              {battle ? (
                <BattleStatsTable
                  battle={battle}
                  cardClassName="lg:h-[var(--battle-side-card-height)] lg:min-h-0"
                  compact
                  scrollClassName="lg:min-h-0 lg:flex-1 lg:pr-2"
                  headerTitle={t("battlePanel.single.statistics.title")}
                  headerActions={
                    is1v1 ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <StatsCustomizationModal
                          config={config}
                          defaultCategories={STAT_CATEGORIES}
                          onUpdateCategoryOrder={updateCategoryOrder}
                          onToggleCategoryVisibility={toggleCategoryVisibility}
                          onUpdateCategoryName={updateCategoryName}
                          onUpdateStatOrder={updateStatOrder}
                          onAddStatToCategory={addStatToCategory}
                          onRemoveStatFromCategory={removeStatFromCategory}
                          onAddCategory={addCategory}
                          onRemoveCategory={removeCategory}
                          onResetToDefaults={resetToDefaults}
                          compactTrigger
                        />
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setHideZeros(!hideZeros)}
                                aria-label={
                                  hideZeros
                                    ? t("battlePanel.single.statistics.showAll")
                                    : t(
                                        "battlePanel.single.statistics.hideZeros",
                                      )
                                }
                                className="size-8"
                              >
                                {hideZeros ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                            }
                          />
                          <TooltipContent>
                            {hideZeros
                              ? t("battlePanel.single.statistics.showAll")
                              : t("battlePanel.single.statistics.hideZeros")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : undefined
                  }
                  hideZeros={is1v1 ? hideZeros : undefined}
                  onHideZerosChange={is1v1 ? setHideZeros : undefined}
                  statsCustomizationConfig={is1v1 ? config : undefined}
                />
              ) : null}
            </div>

            <div
              ref={battleLogWrapperRef}
              className="flex min-w-0 flex-col gap-3"
            >
              {rawBattle && battle ? (
                <BattleLog
                  key={battleId}
                  outerScrollViewportRef={scrollViewportRef}
                  stickyContentRef={chartWrapperRef}
                  rawBattle={rawBattle}
                  warriors={battle.warriors}
                  showHeader={false}
                  className="lg:flex lg:h-[var(--battle-side-card-height)] lg:min-h-0 lg:w-full lg:flex-col"
                  listScrollClassName="lg:min-h-0 lg:flex-1 lg:pr-2"
                  selectedTurn={selectedTurnNumber}
                  scrollToSelectedTurnRequestId={getScrollToTurnRequestId(
                    scrollTargetTurn,
                    selectedTurnNumber,
                    scrollTargetRequestId,
                  )}
                  onListScroll={handleBattleScroll}
                  onSelectedTurnScrollCancel={handleSelectedTurnScrollComplete}
                  onSelectedTurnScrollComplete={
                    handleSelectedTurnScrollComplete
                  }
                  onTurnSelect={handleTurnSelect}
                  onTurnFocus={handleTurnFocus}
                />
              ) : null}
            </div>

            {hasSideContent ? (
              <div className="hidden min-w-0 xl:block xl:self-start">
                <div>{sideContent}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
