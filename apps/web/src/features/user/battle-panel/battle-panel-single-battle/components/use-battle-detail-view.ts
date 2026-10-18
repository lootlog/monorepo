import { STAT_CATEGORIES } from "@/components/battle/one-vs-one-stats-definitions";
import { battlePanelSingleBattleSearchParsers } from "@/features/user/battle-panel/battle-panel-search";
import {
  useBattleDetailPanelStore,
  type BattleDetailPanel,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-panel.store";
import { BATTLE_DETAIL_WIDE_MEDIA_QUERY } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-layout";
import {
  getBattleLogScrollActiveTurn,
  type BattleLogTurnPosition,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-log-scroll-active-turn";
import { getBattlePanelSelectedTurn } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-state";
import { useStatsCustomization } from "@/hooks/use-stats-customization";
import {
  getPageScroller,
  useDocumentScrollListener,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";
import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
import { useQueryStates } from "nuqs";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorage, useMediaQuery } from "usehooks-ts";

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
  const activePanel = useBattleDetailPanelStore((state) => state.activePanel);

  const setActivePanel = useBattleDetailPanelStore(
    (state) => state.setActivePanel,
  );

  const isWide = useMediaQuery(BATTLE_DETAIL_WIDE_MEDIA_QUERY);
  const scrollsDocument = usePageScrollsDocument();
  const is1v1 = battle?.type === "1v1";
  const isGroup = battle !== undefined && !is1v1;
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const logColumnViewportRef = useRef<HTMLDivElement>(null);
  const mainColumnViewportRef = useRef<HTMLDivElement>(null);

  // The wide rail scrolls the log on its own; below it the whole page scrolls it.
  const logScrollViewportRef = isWide
    ? logColumnViewportRef
    : scrollViewportRef;

  const battleLogWrapperRef = useRef<HTMLDivElement>(null);
  const selectedTurnRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  const statsCustomization = useStatsCustomization(STAT_CATEGORIES);

  const timelineTurns = timeline?.timeline ?? [];
  const hasTimeline = timelineTurns.length > 0;
  const hasSideContent = Boolean(sideContent);

  const recentPanels = hasSideContent ? (["recent"] as const) : [];

  // The rail shares the log with the recent battles against the same opponent, if any.
  const panels: BattleDetailPanel[] = ["log", ...recentPanels];

  const visiblePanel = panels.includes(activePanel) ? activePanel : "log";

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

  // Only a new battle starts from the top; crossing `md` keeps the place.
  const scrollPageToTop = useEffectEvent(() =>
    getPageScroller(scrollViewportRef.current, scrollsDocument)?.scrollTo({
      top: 0,
      left: 0,
    }),
  );

  useLayoutEffect(() => {
    cancelScrollAnimationFrame();

    selectedTurnRef.current = null;
    setSelectedTurn(null);
    setScrollTargetTurn(null);
    setScrollTargetRequestId(0);

    // Walking through the recent battles keeps the reader's place in that list.
    const keptViewport =
      useBattleDetailPanelStore.getState().activePanel === "recent"
        ? logColumnViewportRef.current
        : null;

    scrollPageToTop();
    scrollViewportRef.current
      ?.querySelectorAll<HTMLElement>(SCROLL_AREA_VIEWPORT_SELECTOR)
      .forEach((scrollViewport) => {
        if (scrollViewport === keptViewport) return;

        scrollViewport.scrollTo({
          top: 0,
          left: 0,
        });
      });
  }, [battleId]);

  useEffect(() => cancelScrollAnimationFrame, []);

  // Two averaged team lines say little about a group battle, so it has no chart for now.
  const hasChartSlot = !isGroup && (isTimelinePending || hasTimeline);

  // Crossing the layout breakpoint hands the log to the other scroller, so bring it back to the
  // turn the reader was on.
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

    // The log may be behind the recent battles when the chart picks a turn.
    setActivePanel("log");
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

    const scroller = getPageScroller(
      logScrollViewportRef.current,
      scrollsDocument,
    );

    if (!battleLogWrapperRef.current || !scroller) {
      return;
    }

    const visibleBand = scroller.getVisibleBand();

    const toolbarRect = battleLogWrapperRef.current
      .querySelector("[data-battle-log-toolbar]")
      ?.getBoundingClientRect();

    // The log's search bar pins itself over the top rows of the scroller.
    const occlusionBottom =
      toolbarRect &&
      toolbarRect.bottom > visibleBand.top &&
      toolbarRect.top < visibleBand.bottom
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
      viewportTop: visibleBand.top,
      viewportBottom: visibleBand.bottom,
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

  useDocumentScrollListener(handleBattleScroll);

  return {
    scrollViewportRef,
    logColumnViewportRef,
    mainColumnViewportRef,
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
