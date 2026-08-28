import {
  BattleLog,
  BattleStatsTable,
  StatsCustomizationModal,
} from "@/components/battle";
import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-definitions";
import { BattleHpTimelineChart } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart";
import { BattleHpTimelineChartSkeleton } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart-skeleton";
import {
  getBattleLogScrollActiveTurn,
  type BattleLogTurnPosition,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-log-scroll-active-turn";
import { BattleOverview } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-overview";
import { getBattlePanelSelectedTurn } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-state";
import { getBattleSideCardScrollHandoff } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-side-card-scroll-handoff";
import { battlePanelSingleBattleSearchParsers } from "@/features/user/battle-panel/battle-panel-search";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/api-client/models/battlelog/battle-timeline-response-dto-output";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";

const STICKY_TOP_OFFSET_PX = 12;
const STICKY_CONTENT_GAP_PX = 12;
const SIDE_CARD_BOTTOM_OFFSET_PX = 8;
const DEFAULT_CHART_HEIGHT_PX = 216;
const HIDE_ZERO_STATS_STORAGE_KEY = "lootlog-battle-hide-zero-stats-v1";
const SCROLL_AREA_VIEWPORT_SELECTOR = '[data-slot="scroll-area-viewport"]';

type BattleDetailViewProps = {
  battle: Battle | undefined;
  battleId: string;
  isTimelinePending: boolean;
  rawBattle: RawBattle | undefined;
  sideContent?: ReactNode;
  timeline: BattleTimelineResponseDtoOutput | undefined;
};

const getBattleDetailLayoutState = ({
  battle,
  chartHeight,
  isTimelinePending,
  scrollViewportHeight,
  sideContent,
  timeline,
}: Pick<
  BattleDetailViewProps,
  "battle" | "isTimelinePending" | "sideContent" | "timeline"
> & {
  chartHeight: number;
  scrollViewportHeight: number;
}) => {
  const timelineTurns = timeline?.timeline ?? [];
  const hasTimeline = timelineTurns.length > 0;
  return {
    hasSideContent: Boolean(sideContent),
    hasTimeline,
    is1v1: battle?.type === "1v1",
    layoutStyle: {
      "--battle-chart-height": `${chartHeight}px`,
      "--battle-scroll-viewport-height": scrollViewportHeight
        ? `${scrollViewportHeight}px`
        : "100dvh",
      "--battle-side-card-height": `max(0px, calc(var(--battle-scroll-viewport-height) - var(--battle-chart-height) - ${
        STICKY_TOP_OFFSET_PX +
        STICKY_CONTENT_GAP_PX +
        SIDE_CARD_BOTTOM_OFFSET_PX
      }px))`,
    } as CSSProperties,
    shouldRenderTimelineSlot: isTimelinePending || hasTimeline,
    timelineTurns,
  };
};

const getBattleCharacterId = (battle: Battle | undefined) =>
  battle?.characterId ?? null;

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

export function BattleDetailView({
  battle,
  battleId,
  isTimelinePending,
  rawBattle,
  sideContent,
  timeline,
}: BattleDetailViewProps) {
  const { t } = useTranslation();
  const [queryState, setQueryState] = useQueryStates(
    battlePanelSingleBattleSearchParsers,
  );
  const [hideZeros, setHideZeros] = useLocalStorage(
    HIDE_ZERO_STATS_STORAGE_KEY,
    true,
  );
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
  const [scrollTargetTurn, setScrollTargetTurn] = useState<number | null>(null);
  const [scrollTargetRequestId, setScrollTargetRequestId] = useState(0);
  const [chartHeight, setChartHeight] = useState(DEFAULT_CHART_HEIGHT_PX);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const sideCardsGridRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const battleLogWrapperRef = useRef<HTMLDivElement>(null);
  const selectedTurnRef = useRef<number | null>(null);
  const sideCardsWheelHandlerRef = useRef<(event: WheelEvent) => void>(
    () => undefined,
  );
  const chartHeightRef = useRef(DEFAULT_CHART_HEIGHT_PX);
  const scrollViewportHeightRef = useRef(0);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  const {
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
  } = useStatsCustomization(STAT_CATEGORIES);

  const {
    hasSideContent,
    hasTimeline,
    is1v1,
    layoutStyle,
    shouldRenderTimelineSlot,
    timelineTurns,
  } = getBattleDetailLayoutState({
    battle,
    chartHeight,
    isTimelinePending,
    scrollViewportHeight,
    sideContent,
    timeline,
  });
  const selectedTurnNumber = getBattlePanelSelectedTurn({
    availableTurns: timelineTurns.map((turn) => turn.turn),
    requestedTurn: queryState.turn,
    selectedTurn,
  });

  const setMeasuredChartHeight = (value: number) => {
    if (chartHeightRef.current === value) {
      return;
    }

    chartHeightRef.current = value;
    setChartHeight(value);
  };

  const setMeasuredScrollViewportHeight = (value: number) => {
    if (scrollViewportHeightRef.current === value) {
      return;
    }

    scrollViewportHeightRef.current = value;
    setScrollViewportHeight(value);
  };

  const updateStickyMeasurements = () => {
    const chartElement = chartWrapperRef.current;
    const scrollElement = scrollViewportRef.current;

    setMeasuredChartHeight(
      chartElement ? Math.ceil(chartElement.getBoundingClientRect().height) : 0,
    );
    setMeasuredScrollViewportHeight(scrollElement?.clientHeight ?? 0);
  };

  useEffect(() => {
    selectedTurnRef.current = selectedTurn;
  }, [selectedTurn]);

  useEffect(() => {
    const requestedTurn = queryState.turn;
    if (requestedTurn === null) {
      return;
    }

    selectedTurnRef.current = requestedTurn;
    setSelectedTurn(requestedTurn);
    setScrollTargetTurn(requestedTurn);
    setScrollTargetRequestId((requestId) => requestId + 1);
  }, [battleId, queryState.turn]);

  useLayoutEffect(() => {
    if (scrollAnimationFrameRef.current != null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }

    selectedTurnRef.current = null;
    setSelectedTurn(null);
    setScrollTargetTurn(null);
    setScrollTargetRequestId(0);

    scrollViewportRef.current?.scrollTo({
      top: 0,
      left: 0,
    });
    scrollViewportRef.current
      ?.querySelectorAll<HTMLElement>(SCROLL_AREA_VIEWPORT_SELECTOR)
      .forEach((scrollViewport) => {
        scrollViewport.scrollTo({
          top: 0,
          left: 0,
        });
      });
  }, [battleId]);

  useLayoutEffect(() => {
    const chartElement = chartWrapperRef.current;

    if (!chartElement) {
      setMeasuredChartHeight(0);
      setMeasuredScrollViewportHeight(
        scrollViewportRef.current?.clientHeight ?? 0,
      );
      return;
    }

    updateStickyMeasurements();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateStickyMeasurements);
    resizeObserver.observe(chartElement);
    resizeObserver.observe(scrollViewportRef.current ?? chartElement);

    const handleWindowResize = () => {
      updateStickyMeasurements();
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [shouldRenderTimelineSlot, timelineTurns.length]);

  useEffect(
    () => () => {
      if (scrollAnimationFrameRef.current == null) {
        return;
      }

      cancelAnimationFrame(scrollAnimationFrameRef.current);
    },
    [],
  );

  const handleTurnSelect = (turn: number) => {
    if (scrollAnimationFrameRef.current != null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }

    selectedTurnRef.current = turn;
    setSelectedTurn(turn);
    setScrollTargetTurn(turn);
    setScrollTargetRequestId((requestId) => requestId + 1);
    void setQueryState({ turn });
  };

  const handleTurnFocus = (turn: number) => {
    selectedTurnRef.current = turn;
    setSelectedTurn(turn);
    setScrollTargetTurn(null);
  };

  const handleSelectedTurnScrollComplete = (turn: number) => {
    setScrollTargetTurn((currentTurn) =>
      currentTurn === turn ? null : currentTurn,
    );
  };

  const updateSelectedTurnFromScroll = () => {
    scrollAnimationFrameRef.current = null;
    updateStickyMeasurements();

    if (scrollTargetTurn !== null) {
      return;
    }

    if (!battleLogWrapperRef.current || !scrollViewportRef.current) {
      return;
    }

    const logViewport = battleLogWrapperRef.current.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    const viewportElement = logViewport ?? scrollViewportRef.current;
    const viewportRect = viewportElement.getBoundingClientRect();
    const pageViewportRect = scrollViewportRef.current.getBoundingClientRect();
    const chartRect = chartWrapperRef.current?.getBoundingClientRect();
    const occlusionBottom =
      chartRect &&
      chartRect.bottom > viewportRect.top &&
      chartRect.top < viewportRect.bottom
        ? chartRect.bottom
        : null;
    const turnPositions: BattleLogTurnPosition[] = Array.from(
      battleLogWrapperRef.current.querySelectorAll<HTMLElement>(
        "[data-battle-turn]",
      ),
    ).flatMap((turnElement) => {
      const turn = Number.parseInt(turnElement.dataset.battleTurn ?? "", 10);

      if (Number.isNaN(turn)) {
        return [];
      }

      const turnRect = turnElement.getBoundingClientRect();

      return [
        {
          turn,
          top: turnRect.top,
          bottom: turnRect.bottom,
        },
      ];
    });
    const viewportTop = Math.max(viewportRect.top, pageViewportRect.top);
    const viewportBottom = Math.min(
      viewportRect.bottom,
      pageViewportRect.bottom,
    );
    const activeTurn = getBattleLogScrollActiveTurn({
      turnPositions,
      viewportTop,
      viewportBottom,
      occlusionBottom,
    });

    if (activeTurn == null || activeTurn === selectedTurnRef.current) {
      return;
    }

    selectedTurnRef.current = activeTurn;
    setSelectedTurn(activeTurn);
    setScrollTargetTurn(null);
  };

  const handleBattleScroll = () => {
    if (scrollAnimationFrameRef.current != null) {
      return;
    }

    scrollAnimationFrameRef.current = requestAnimationFrame(
      updateSelectedTurnFromScroll,
    );
  };

  const handleSideCardsWheelCapture = (event: WheelEvent) => {
    const outerViewport = scrollViewportRef.current;

    if (!outerViewport) {
      return;
    }

    const handoff = getBattleSideCardScrollHandoff({
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      metaKey: event.metaKey,
      outerClientHeight: outerViewport.clientHeight,
      outerScrollHeight: outerViewport.scrollHeight,
      outerScrollTop: outerViewport.scrollTop,
      shiftKey: event.shiftKey,
    });

    if (!handoff.shouldCapture) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    outerViewport.scrollTop += handoff.outerScrollDelta;

    if (handoff.innerScrollDelta <= 0) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    const innerViewport = event.target.closest<HTMLElement>(
      SCROLL_AREA_VIEWPORT_SELECTOR,
    );

    if (!innerViewport || innerViewport === outerViewport) {
      return;
    }

    innerViewport.scrollTop += handoff.innerScrollDelta;
  };

  useEffect(() => {
    sideCardsWheelHandlerRef.current = handleSideCardsWheelCapture;
  });

  useEffect(() => {
    const sideCardsGrid = sideCardsGridRef.current;

    if (!sideCardsGrid) {
      return;
    }

    const handleWheelCapture = (event: WheelEvent) => {
      sideCardsWheelHandlerRef.current(event);
    };

    sideCardsGrid.addEventListener("wheel", handleWheelCapture, {
      capture: true,
      passive: false,
    });

    return () => {
      sideCardsGrid.removeEventListener("wheel", handleWheelCapture, {
        capture: true,
      });
    };
  }, []);

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
