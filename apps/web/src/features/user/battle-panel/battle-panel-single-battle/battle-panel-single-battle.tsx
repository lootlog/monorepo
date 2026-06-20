import {
  BattleLog,
  BattleStatsTable,
  StatsCustomizationModal,
} from "@/components/battle";
import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-definitions";
import { UserHeaderActionsPortal } from "@/components/layout/user-header-actions-portal";
import { BattleOverview } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-overview";
import { BattleHpTimelineChart } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart";
import {
  getBattleLogScrollActiveTurn,
  type BattleLogTurnPosition,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-log-scroll-active-turn";
import { BattlePanelSingleBattleActions } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-actions";
import { getBattleSideCardScrollHandoff } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-side-card-scroll-handoff";
import { getRecentOpponentBattleContext } from "@/features/user/battle-panel/battle-panel-single-battle/components/recent-opponent-battle-context";
import { RecentOpponentBattlesCard } from "@/features/user/battle-panel/battle-panel-single-battle/components/recent-opponent-battles-card";
import {
  battlesControllerGetBattleTimeline,
  useBattlesControllerGetBattle,
  useBattlesControllerGetBattleRawData,
} from "@/lib/api/generated/battlelog/battles/battles";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type WheelEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

const STICKY_TOP_OFFSET_PX = 12;
const STICKY_CONTENT_GAP_PX = 12;
const SIDE_CARD_BOTTOM_OFFSET_PX = 8;
const SCROLL_AREA_VIEWPORT_SELECTOR = '[data-slot="scroll-area-viewport"]';

export const BattlePanelSingleBattle = () => {
  const { t } = useTranslation();
  const { battleId } = useParams({
    from: "/_authenticated/@me/battle-panel/battles_/$battleId",
  });
  const { data: battle } = useBattlesControllerGetBattle({ battleId });
  const { data: rawBattle } = useBattlesControllerGetBattleRawData({
    battleId,
  });
  const { data: timeline } = useQuery({
    queryKey: ["battle-timeline", battleId],
    queryFn: () => battlesControllerGetBattleTimeline({ battleId }),
    enabled: Boolean(battleId),
  });
  const [hideZeros, setHideZeros] = useState(true);
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
  const [scrollTargetTurn, setScrollTargetTurn] = useState<number | null>(null);
  const [scrollTargetRequestId, setScrollTargetRequestId] = useState(0);
  const [isChartPinned, setIsChartPinned] = useState(true);
  const [chartHeight, setChartHeight] = useState(0);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const battleLogWrapperRef = useRef<HTMLDivElement>(null);
  const selectedTurnRef = useRef<number | null>(null);
  const chartHeightRef = useRef(0);
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

  const is1v1 = battle?.type === "1v1";
  const shouldShowRecentOpponentBattles =
    getRecentOpponentBattleContext(battle) !== null;
  const selectedTurnExists = timeline?.timeline.some(
    (turn) => turn.turn === selectedTurn,
  );
  const selectedTurnNumber = selectedTurnExists
    ? selectedTurn
    : (timeline?.timeline[0]?.turn ?? null);
  const hasTimeline = Boolean(timeline?.timeline.length);
  const layoutStyle = {
    "--battle-chart-height": `${chartHeight}px`,
    "--battle-scroll-viewport-height": scrollViewportHeight
      ? `${scrollViewportHeight}px`
      : "100dvh",
    "--battle-side-card-height": `max(0px, calc(var(--battle-scroll-viewport-height) - var(--battle-chart-height) - ${
      STICKY_TOP_OFFSET_PX + STICKY_CONTENT_GAP_PX + SIDE_CARD_BOTTOM_OFFSET_PX
    }px))`,
  } as CSSProperties;

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
  }, [timeline?.timeline.length]);

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
    const chartRect = isChartPinned
      ? chartWrapperRef.current?.getBoundingClientRect()
      : null;
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

  const handleSideCardsWheelCapture = (event: WheelEvent<HTMLDivElement>) => {
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

  return (
    <>
      {battle ? (
        <UserHeaderActionsPortal>
          <BattlePanelSingleBattleActions battle={battle} />
        </UserHeaderActionsPortal>
      ) : null}
      <ScrollArea
        ref={scrollViewportRef}
        className="h-full bg-background/50"
        onScroll={handleBattleScroll}
      >
        <div className="px-3 py-3 flex flex-col gap-4" style={layoutStyle}>
          {battle && <BattleOverview battle={battle} />}

          <div
            className={cn(
              "flex flex-col gap-3",
              hasTimeline && isChartPinned && "lg:sticky lg:top-3 lg:z-20",
            )}
          >
            {timeline?.timeline.length ? (
              <div ref={chartWrapperRef} className="bg-background">
                <BattleHpTimelineChart
                  timeline={timeline.timeline}
                  warriors={timeline.warriors}
                  characterId={battle?.characterId ?? null}
                  isPinned={isChartPinned}
                  selectedTurn={selectedTurnNumber}
                  onPinnedChange={setIsChartPinned}
                  onTurnSelect={handleTurnSelect}
                />
              </div>
            ) : null}

            <div
              className={cn(
                "grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)]",
                shouldShowRecentOpponentBattles &&
                  "xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(300px,0.9fr)]",
              )}
              onWheelCapture={handleSideCardsWheelCapture}
            >
              <div className="min-w-0">
                {battle && (
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
                            onToggleCategoryVisibility={
                              toggleCategoryVisibility
                            }
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
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
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
                )}
              </div>

              <div
                ref={battleLogWrapperRef}
                className="flex min-w-0 flex-col gap-3"
              >
                {rawBattle && battle && (
                  <BattleLog
                    rawBattle={rawBattle.rawData}
                    warriors={battle.warriors}
                    showHeader={false}
                    className="lg:flex lg:h-[var(--battle-side-card-height)] lg:min-h-0 lg:w-full lg:flex-col"
                    listScrollClassName="lg:min-h-0 lg:flex-1 lg:pr-2"
                    selectedTurn={selectedTurnNumber}
                    scrollToSelectedTurnRequestId={
                      scrollTargetTurn !== null &&
                      scrollTargetTurn === selectedTurnNumber
                        ? scrollTargetRequestId
                        : 0
                    }
                    onListScroll={handleBattleScroll}
                    onSelectedTurnScrollComplete={
                      handleSelectedTurnScrollComplete
                    }
                    onTurnSelect={handleTurnSelect}
                    onTurnFocus={handleTurnFocus}
                  />
                )}
              </div>

              {shouldShowRecentOpponentBattles && (
                <div className="hidden min-w-0 xl:block xl:self-start">
                  <div>
                    <RecentOpponentBattlesCard battle={battle} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );
};
