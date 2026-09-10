import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-definitions";
import { battlePanelSingleBattleSearchParsers } from "@/features/user/battle-panel/battle-panel-search";
import {
  getBattleLogScrollActiveTurn,
  type BattleLogTurnPosition,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-log-scroll-active-turn";
import { getBattlePanelSelectedTurn } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-state";
import { getBattleSideCardScrollHandoff } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-side-card-scroll-handoff";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
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
import { useLocalStorage, useMediaQuery } from "usehooks-ts";

const STICKY_TOP_OFFSET_PX = 12;

const STICKY_CONTENT_GAP_PX = 12;

const SIDE_CARD_BOTTOM_OFFSET_PX = 8;

const DEFAULT_CHART_HEIGHT_PX = 216;

const HIDE_ZERO_STATS_STORAGE_KEY = "lootlog-battle-hide-zero-stats-v1";

const SCROLL_AREA_VIEWPORT_SELECTOR = '[data-slot="scroll-area-viewport"]';

export type BattleDetailViewProps = {
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

  const layoutStyle: CSSProperties &
    Record<
      | "--battle-chart-height"
      | "--battle-scroll-viewport-height"
      | "--battle-side-card-height",
      string
    > = {
    "--battle-chart-height": `${chartHeight}px`,
    "--battle-scroll-viewport-height": scrollViewportHeight
      ? `${scrollViewportHeight}px`
      : "100dvh",
    "--battle-side-card-height": `max(0px, calc(var(--battle-scroll-viewport-height) - var(--battle-chart-height) - ${
      STICKY_TOP_OFFSET_PX + STICKY_CONTENT_GAP_PX + SIDE_CARD_BOTTOM_OFFSET_PX
    }px))`,
  };

  return {
    hasSideContent: Boolean(sideContent),
    hasTimeline,
    is1v1: battle?.type === "1v1",
    layoutStyle,
    shouldRenderTimelineSlot: isTimelinePending || hasTimeline,
    timelineTurns,
  };
};

export function useBattleDetailView({
  battle,
  battleId,
  isTimelinePending,
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
  const isDesktop = useMediaQuery("(min-width: 1024px)");
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
    if (
      scrollAnimationFrameRef.current !== null &&
      scrollAnimationFrameRef.current !== undefined
    ) {
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
      if (
        scrollAnimationFrameRef.current === null ||
        scrollAnimationFrameRef.current === undefined
      ) {
        return;
      }

      cancelAnimationFrame(scrollAnimationFrameRef.current);
    },
    [],
  );

  const handleTurnSelect = (turn: number) => {
    if (
      scrollAnimationFrameRef.current !== null &&
      scrollAnimationFrameRef.current !== undefined
    ) {
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

    const viewportElement = isDesktop
      ? (logViewport ?? scrollViewportRef.current)
      : scrollViewportRef.current;

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

    if (
      activeTurn === null ||
      activeTurn === undefined ||
      activeTurn === selectedTurnRef.current
    ) {
      return;
    }

    selectedTurnRef.current = activeTurn;
    setSelectedTurn(activeTurn);
    setScrollTargetTurn(null);
  };

  const handleBattleScroll = () => {
    if (
      scrollAnimationFrameRef.current !== null &&
      scrollAnimationFrameRef.current !== undefined
    ) {
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

  return {
    scrollViewportRef,
    handleBattleScroll,
    layoutStyle,
    shouldRenderTimelineSlot,
    chartWrapperRef,
    hasTimeline,
    selectedTurn,
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
  };
}
