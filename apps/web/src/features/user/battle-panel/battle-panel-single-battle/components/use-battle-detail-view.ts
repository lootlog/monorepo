import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-definitions";
import { battlePanelSingleBattleSearchParsers } from "@/features/user/battle-panel/battle-panel-search";
import { BATTLE_DETAIL_WIDE_MEDIA_QUERY } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-layout";
import {
  getBattleLogScrollActiveTurn,
  type BattleLogTurnPosition,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-log-scroll-active-turn";
import { getBattlePanelSelectedTurn } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-state";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
import { useQueryStates } from "nuqs";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage, useMediaQuery } from "usehooks-ts";

const HIDE_ZERO_STATS_STORAGE_KEY = "lootlog-battle-hide-zero-stats-v1";

const SCROLL_AREA_VIEWPORT_SELECTOR = '[data-slot="scroll-area-viewport"]';

/** Below the wide layout only one of these panels is visible at a time. */
export type BattleDetailPanel = "log" | "stats" | "recent";

export type BattleDetailViewProps = {
  battle: Battle | undefined;
  battleId: string;
  isTimelinePending: boolean;
  rawBattle: RawBattle | undefined;
  sideContent?: ReactNode;
  timeline: BattleTimelineResponseDtoOutput | undefined;
};

export function useBattleDetailView({
  battle,
  battleId,
  isTimelinePending,
  sideContent,
  timeline,
}: BattleDetailViewProps) {
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
  const [activePanel, setActivePanel] = useState<BattleDetailPanel>("stats");
  const isWide = useMediaQuery(BATTLE_DETAIL_WIDE_MEDIA_QUERY);
  const is1v1 = battle?.type === "1v1";
  const isGroup = battle !== undefined && !is1v1;
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const battleColumnViewportRef = useRef<HTMLDivElement>(null);
  const battleColumnContentRef = useRef<HTMLDivElement>(null);
  const chartSlotRef = useRef<HTMLDivElement>(null);

  // The wide layout scrolls the log with its column; below it, with the whole page.
  const logScrollViewportRef = isWide
    ? battleColumnViewportRef
    : scrollViewportRef;

  const battleLogWrapperRef = useRef<HTMLDivElement>(null);
  const selectedTurnRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  const statsCustomization = useStatsCustomization(STAT_CATEGORIES);

  const timelineTurns = timeline?.timeline ?? [];
  const hasTimeline = timelineTurns.length > 0;
  const hasSideContent = Boolean(sideContent);

  // The wide layout gives the log its own column, so only the remaining panels share the tabs.
  const panels: BattleDetailPanel[] = [
    "stats",
    ...(isWide ? [] : (["log"] as const)),
    ...(hasSideContent ? (["recent"] as const) : []),
  ];

  const visiblePanel = panels.includes(activePanel) ? activePanel : "stats";

  const selectedTurnNumber = getBattlePanelSelectedTurn({
    availableTurns: timelineTurns.map((turn) => turn.turn),
    requestedTurn: queryState.turn,
    selectedTurn,
  });

  const cancelScrollAnimationFrame = () => {
    if (
      scrollAnimationFrameRef.current === null ||
      scrollAnimationFrameRef.current === undefined
    ) {
      return;
    }

    cancelAnimationFrame(scrollAnimationFrameRef.current);
    scrollAnimationFrameRef.current = null;
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
    cancelScrollAnimationFrame();

    selectedTurnRef.current = null;
    setSelectedTurn(null);
    setScrollTargetTurn(null);
    setScrollTargetRequestId(0);
    setActivePanel("stats");

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

  useEffect(() => cancelScrollAnimationFrame, []);

  // Two averaged team lines say little about a group battle, so it has no chart for now.
  const hasChartSlot = !isGroup && (isTimelinePending || hasTimeline);

  // The log's search bar sticks right under the pinned chart, whose height changes when the
  // chart is hidden or expanded.
  useLayoutEffect(() => {
    const content = battleColumnContentRef.current;
    const chartSlot = chartSlotRef.current;

    if (!content) {
      return;
    }

    const updatePinnedHeight = () => {
      content.style.setProperty(
        "--battle-log-sticky-top",
        isWide && chartSlot
          ? `${Math.ceil(chartSlot.getBoundingClientRect().height)}px`
          : "0px",
      );
    };

    updatePinnedHeight();

    if (!chartSlot || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updatePinnedHeight);
    resizeObserver.observe(chartSlot);

    return () => resizeObserver.disconnect();
  }, [hasChartSlot, isWide]);

  // Crossing the layout breakpoint remounts the log in its other slot, so bring it back to
  // the turn the reader was on.
  useEffect(() => {
    const turn = selectedTurnRef.current;

    if (turn === null) {
      return;
    }

    setScrollTargetTurn(turn);
    setScrollTargetRequestId((requestId) => requestId + 1);
  }, [isWide]);

  const handleTurnSelect = (turn: number) => {
    cancelScrollAnimationFrame();

    selectedTurnRef.current = turn;
    setSelectedTurn(turn);
    setScrollTargetTurn(turn);
    setScrollTargetRequestId((requestId) => requestId + 1);
    void setQueryState({ turn });

    // Below the wide layout the log may be behind another tab when the chart picks a turn.
    if (!isWide) setActivePanel("log");
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

    if (scrollTargetTurn !== null) {
      return;
    }

    const viewportElement = logScrollViewportRef.current;

    if (!battleLogWrapperRef.current || !viewportElement) {
      return;
    }

    const viewportRect = viewportElement.getBoundingClientRect();

    const toolbarRect = battleLogWrapperRef.current
      .querySelector("[data-battle-log-toolbar]")
      ?.getBoundingClientRect();

    // The log's search bar pins itself over the top rows of the scroller.
    const occlusionBottom =
      toolbarRect &&
      toolbarRect.bottom > viewportRect.top &&
      toolbarRect.top < viewportRect.bottom
        ? toolbarRect.bottom
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

    const activeTurn = getBattleLogScrollActiveTurn({
      turnPositions,
      viewportTop: viewportRect.top,
      viewportBottom: viewportRect.bottom,
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

  return {
    scrollViewportRef,
    battleColumnViewportRef,
    battleColumnContentRef,
    chartSlotRef,
    logScrollViewportRef,
    handleBattleScroll,
    shouldRenderTimelineSlot: hasChartSlot,
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
  };
}
