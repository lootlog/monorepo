import { BattleLog } from "@/components/battle";
import { BattleMetadata } from "@/components/battle/battle-metadata";
import { BattleTeamsOverview } from "@/components/battle/battle-teams-overview";
import { DetailBar } from "@/components/common/detail-bar";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { BattleDetailChart } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-chart";
import { BattleDetailStatsPanel } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-stats-panel";
import { BattleDetailPanelTabs } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-panel-tabs";
import type { Battle } from "@/lib/api/battlelog-types";
import { getBattleLabel } from "@/lib/battle/battle-route-label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BATTLE_DETAIL_COLUMN_CLASS_NAME,
  BATTLE_DETAIL_COLUMNS_CLASS_NAME,
  BATTLE_DETAIL_CONTENT_CLASS_NAME,
  BATTLE_DETAIL_PANELS_UNDER_TABS_CLASS_NAME,
  BATTLE_DETAIL_RAIL_CLASS_NAME,
} from "./battle-detail-layout";
import { BattleDetailSummary } from "./battle-detail-summary";
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

type BattleDetailViewLayoutProps = BattleDetailViewProps & {
  /** Controls at the end of the details bar, such as sharing and deleting. */
  actions?: ReactNode;
};

/**
 * The battle's teams, chart and statistics in the main column, with the log, and the recent
 * battles against the same opponent behind a tab, in a rail beside it that scrolls on its own,
 * as the event overview keeps its ranking. Narrower pages read the rail last.
 */
export function BattleDetailView({
  actions,
  battle,
  battleId,
  isTimelinePending,
  rawBattle,
  sideContent,
  timeline,
}: BattleDetailViewLayoutProps) {
  const { t } = useTranslation();

  const {
    scrollViewportRef,
    logColumnViewportRef,
    mainColumnViewportRef,
    logScrollViewportRef,
    handleBattleScroll,
    shouldRenderTimelineSlot,
    hasTimeline,
    selectedTurnNumber,
    handleTurnSelect,
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

  const hasRailTabs = panels.length > 1;

  return (
    <ScrollArea
      data-under-top-bar
      ref={scrollViewportRef}
      className="h-full min-h-0"
      onScroll={handleBattleScroll}
    >
      <div className={BATTLE_DETAIL_CONTENT_CLASS_NAME}>
        <h1 className="sr-only">{getBattleLabel(battle, battleId, t)}</h1>
        {battle ? (
          <DetailBar
            meta={<BattleMetadata battle={battle} />}
            actions={actions}
          />
        ) : null}

        <div className={BATTLE_DETAIL_COLUMNS_CLASS_NAME}>
          <ScrollArea
            ref={mainColumnViewportRef}
            className={cn("@container", BATTLE_DETAIL_COLUMN_CLASS_NAME)}
          >
            {battle ? (
              <BattleTeamsOverview
                battle={battle}
                cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
              />
            ) : null}
            {shouldRenderTimelineSlot ? (
              <BattleDetailChart
                characterId={getBattleCharacterId(battle)}
                selectedTurn={selectedTurnNumber}
                timeline={hasTimeline ? timeline : undefined}
                onTurnSelect={handleTurnSelect}
              />
            ) : null}
            {battle ? (
              <>
                <BattleDetailSummary battle={battle} />
                <BattleDetailStatsPanel
                  battle={battle}
                  hideZeros={hideZeros}
                  setHideZeros={setHideZeros}
                  statsCustomization={statsCustomization}
                />
              </>
            ) : null}
          </ScrollArea>

          <ScrollArea
            ref={logColumnViewportRef}
            className={BATTLE_DETAIL_RAIL_CLASS_NAME}
            onScroll={handleBattleScroll}
          >
            <div
              className={cn(
                hasRailTabs && BATTLE_DETAIL_PANELS_UNDER_TABS_CLASS_NAME,
              )}
            >
              {hasRailTabs ? (
                <BattleDetailPanelTabs
                  activePanel={visiblePanel}
                  panels={panels}
                  onActivePanelChange={setActivePanel}
                />
              ) : null}
              {visiblePanel === "recent" ? sideContent : null}
              {visiblePanel === "log" && rawBattle && battle ? (
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
                    onSelectedTurnScrollCancel={
                      handleSelectedTurnScrollComplete
                    }
                    onSelectedTurnScrollComplete={
                      handleSelectedTurnScrollComplete
                    }
                    onTurnSelect={handleTurnSelect}
                    onTurnFocus={handleTurnFocus}
                  />
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </div>
    </ScrollArea>
  );
}
