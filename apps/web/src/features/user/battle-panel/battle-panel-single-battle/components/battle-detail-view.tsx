import { BattleLog } from "@/components/battle";
import { BattleDetailChart } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-chart";
import {
  BATTLE_DETAIL_BATTLE_COLUMN_CLASS_NAME,
  BATTLE_DETAIL_BATTLE_CONTENT_CLASS_NAME,
  BATTLE_DETAIL_CHART_SLOT_CLASS_NAME,
  BATTLE_DETAIL_EMPTY_PIN_SLOT_CLASS_NAME,
  BATTLE_DETAIL_LOG_CAP_CLASS_NAME,
  BATTLE_DETAIL_LOG_CAP_EDGE_CLASS_NAME,
  BATTLE_DETAIL_PANELS_COLUMN_CLASS_NAME,
  BATTLE_DETAIL_PANELS_CONTENT_CLASS_NAME,
  BATTLE_DETAIL_TABS_SLOT_CLASS_NAME,
  getBattleDetailContentClassName,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-layout";
import { BattleDetailStatsPanel } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-stats-panel";
import { BattleDetailPanelTabs } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-panel-tabs";
import { BattleOverview } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-overview";
import type { Battle } from "@/lib/api/battlelog-types";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
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
    battleColumnViewportRef,
    battleColumnContentRef,
    chartSlotRef,
    logScrollViewportRef,
    handleBattleScroll,
    shouldRenderTimelineSlot,
    hasTimeline,
    selectedTurnNumber,
    handleTurnSelect,
    isGroup,
    isWide,
    panels,
    visiblePanel,
    setActivePanel,
    statsCustomization,
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

  // Rendered under the chart in the wide layout, and as a tab panel below it.
  const battleLog =
    rawBattle && battle ? (
      <div ref={battleLogWrapperRef} className="min-w-0">
        <BattleLog
          key={battleId}
          scrollViewportRef={logScrollViewportRef}
          rawBattle={rawBattle}
          warriors={battle.warriors}
          selectedTurn={selectedTurnNumber}
          scrollToSelectedTurnRequestId={getScrollToTurnRequestId(
            scrollTargetTurn,
            selectedTurnNumber,
            scrollTargetRequestId,
          )}
          onListScroll={handleBattleScroll}
          onSelectedTurnScrollCancel={handleSelectedTurnScrollComplete}
          onSelectedTurnScrollComplete={handleSelectedTurnScrollComplete}
          onTurnSelect={handleTurnSelect}
          onTurnFocus={handleTurnFocus}
        />
      </div>
    ) : null;

  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="h-full min-h-0 bg-background"
      onScroll={handleBattleScroll}
    >
      <div className={getBattleDetailContentClassName({ isGroup })}>
        <ScrollArea
          ref={battleColumnViewportRef}
          className={BATTLE_DETAIL_BATTLE_COLUMN_CLASS_NAME}
          onScroll={handleBattleScroll}
        >
          <div
            ref={battleColumnContentRef}
            className={BATTLE_DETAIL_BATTLE_CONTENT_CLASS_NAME}
          >
            {battle ? <BattleOverview battle={battle} /> : null}

            {shouldRenderTimelineSlot || isWide ? (
              <div
                ref={chartSlotRef}
                className={
                  shouldRenderTimelineSlot
                    ? BATTLE_DETAIL_CHART_SLOT_CLASS_NAME
                    : BATTLE_DETAIL_EMPTY_PIN_SLOT_CLASS_NAME
                }
              >
                {shouldRenderTimelineSlot ? (
                  <BattleDetailChart
                    characterId={getBattleCharacterId(battle)}
                    selectedTurn={selectedTurnNumber}
                    timeline={hasTimeline ? timeline : undefined}
                    onTurnSelect={handleTurnSelect}
                  />
                ) : null}
                {isWide ? (
                  <div className={BATTLE_DETAIL_LOG_CAP_CLASS_NAME} aria-hidden>
                    <div className={BATTLE_DETAIL_LOG_CAP_EDGE_CLASS_NAME} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {isWide ? battleLog : null}
          </div>
        </ScrollArea>

        <ScrollArea className={BATTLE_DETAIL_PANELS_COLUMN_CLASS_NAME}>
          <div className={BATTLE_DETAIL_PANELS_CONTENT_CLASS_NAME}>
            {panels.length > 1 ? (
              <div className={BATTLE_DETAIL_TABS_SLOT_CLASS_NAME}>
                <BattleDetailPanelTabs
                  activePanel={visiblePanel}
                  panels={panels}
                  onActivePanelChange={setActivePanel}
                />
              </div>
            ) : null}

            {battle && visiblePanel === "stats" ? (
              <BattleDetailStatsPanel
                battle={battle}
                hideZeros={hideZeros}
                setHideZeros={setHideZeros}
                statsCustomization={statsCustomization}
              />
            ) : null}

            {visiblePanel === "recent" ? sideContent : null}
            {visiblePanel === "log" ? battleLog : null}
          </div>
        </ScrollArea>
      </div>
    </ScrollArea>
  );
}
