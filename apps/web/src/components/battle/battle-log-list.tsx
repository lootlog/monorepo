import {
  useState,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type FC,
  type RefObject,
} from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useMediaQuery } from "usehooks-ts";
import { BattleEventEntry } from "./battle-event-entry";
import { BattleHeader } from "./battle-header";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

const BATTLE_LOG_SCROLL_OFFSET_PX = 8;

export type BattleLogListProps = {
  events?: RawBattleParsedEvent[];
  characterId?: string;
  warriors: Warrior[];
  userTeam?: number;
  selectedTurn?: number | null;
  scrollToSelectedTurnRequestId?: number;
  scrollViewportRef: RefObject<HTMLDivElement | null>;
  outerScrollViewportRef: RefObject<HTMLDivElement | null>;
  stickyContentRef?: RefObject<HTMLDivElement | null>;
  searchMatchedTurns?: number[];
  activeSearchTurn?: number | null;
  onSelectedTurnScrollComplete?: (turn: number) => void;
  onSelectedTurnScrollCancel?: (turn: number) => void;
  onTurnSelect?: (turn: number) => void;
  onVisibleTurnsChange?: () => void;
};

export const BattleLogList: FC<BattleLogListProps> = ({
  events,
  warriors,
  characterId,
  userTeam,
  selectedTurn,
  scrollToSelectedTurnRequestId = 0,
  scrollViewportRef,
  outerScrollViewportRef,
  stickyContentRef,
  searchMatchedTurns = [],
  activeSearchTurn,
  onSelectedTurnScrollComplete,
  onSelectedTurnScrollCancel,
  onTurnSelect,
  onVisibleTurnsChange,
}) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const listRef = useRef<HTMLUListElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [resizedTurn, setResizedTurn] = useState<number | null>(null);
  const previousDesktop = useRef(isDesktop);
  const rememberSelectedTurn = useEffectEvent(() =>
    setResizedTurn(selectedTurn ?? null),
  );
  useEffect(() => {
    if (previousDesktop.current !== isDesktop) rememberSelectedTurn();
    previousDesktop.current = isDesktop;
  }, [isDesktop]);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  useEffect(() => {
    setScrollElement(
      isDesktop ? scrollViewportRef.current : outerScrollViewportRef.current,
    );
  }, [isDesktop, scrollViewportRef, outerScrollViewportRef]);
  const virtualizer = useVirtualizer({
    count: events?.length ?? 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => 72,
    overscan: 8,
    scrollMargin,
    useAnimationFrameWithResizeObserver: true,
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range);
      if (
        focusedIndex !== null &&
        focusedIndex < range.count &&
        !indexes.includes(focusedIndex)
      ) {
        indexes.push(focusedIndex);
        indexes.sort((a, b) => a - b);
      }
      return indexes;
    },
  });

  useLayoutEffect(() => {
    const viewport = scrollElement;
    const list = listRef.current;
    if (!viewport || !list) return;
    const updateMargin = () => {
      setScrollMargin(
        list.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top +
          viewport.scrollTop,
      );
    };
    updateMargin();
    const observer = new ResizeObserver(updateMargin);
    observer.observe(viewport);
    // The wrapping detail content also changes when a timeline or overview loads.
    if (list.parentElement) observer.observe(list.parentElement);
    if (outerScrollViewportRef.current?.firstElementChild)
      observer.observe(outerScrollViewportRef.current.firstElementChild);
    window.addEventListener("resize", updateMargin);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMargin);
    };
  }, [scrollElement, outerScrollViewportRef]);

  const warriorsMap = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior]),
  );
  const searchMatchedTurnsSet = new Set(searchMatchedTurns);

  const virtualItems = virtualizer.getVirtualItems();
  const visibleRangeKey = virtualItems
    .map((item) => `${item.index}:${item.size}`)
    .join(",");
  const notifyVisibleTurns = useEffectEvent(() => onVisibleTurnsChange?.());
  useEffect(() => {
    notifyVisibleTurns();
  }, [visibleRangeKey, isDesktop]);

  let requestedTurn: number | null | undefined = resizedTurn;
  if (activeSearchTurn != null) requestedTurn = activeSearchTurn;
  else if (scrollToSelectedTurnRequestId > 0) requestedTurn = selectedTurn;
  const notifyScrollComplete = useEffectEvent((turn: number) => {
    setResizedTurn(null);
    onSelectedTurnScrollComplete?.(turn);
  });
  const notifyScrollCancel = useEffectEvent((turn: number) => {
    setResizedTurn(null);
    onSelectedTurnScrollCancel?.(turn);
  });
  useEffect(() => {
    if (requestedTurn == null) return;
    if (requestedTurn < 1 || requestedTurn > (events?.length ?? 0)) {
      notifyScrollCancel(requestedTurn);
      return;
    }
    const viewport = scrollElement;
    if (!viewport) return;
    let frame = 0;
    let stableFrames = 0;
    let attempts = 0;
    let finished = false;
    // Estimated heights make smooth jumps unreliable. Measure the destination first.
    virtualizer.scrollToIndex(requestedTurn - 1, {
      align: "start",
      behavior: "auto",
    });
    const alignMeasuredRow = () => {
      const row = listRef.current?.querySelector<HTMLElement>(
        `[data-battle-turn="${requestedTurn}"]`,
      );
      if (row) {
        const viewportRect = viewport.getBoundingClientRect();
        const stickyRect = stickyContentRef?.current?.getBoundingClientRect();
        const stickyBottom =
          isDesktop &&
          stickyRect &&
          stickyRect.bottom > viewportRect.top &&
          stickyRect.top < viewportRect.bottom
            ? stickyRect.bottom
            : viewportRect.top;
        const target = Math.max(
          0,
          Math.min(
            viewport.scrollHeight - viewport.clientHeight,
            viewport.scrollTop +
              row.getBoundingClientRect().top -
              Math.max(viewportRect.top, stickyBottom) -
              BATTLE_LOG_SCROLL_OFFSET_PX,
          ),
        );
        const settled = Math.abs(viewport.scrollTop - target) <= 1;
        stableFrames = settled ? stableFrames + 1 : 0;
        if (!settled) viewport.scrollTo({ top: target, behavior: "instant" });
        if (stableFrames >= 3) {
          finished = true;
          notifyScrollComplete(requestedTurn);
          return;
        }
      }
      attempts += 1;
      if (attempts < 75) frame = requestAnimationFrame(alignMeasuredRow);
      else {
        finished = true;
        notifyScrollCancel(requestedTurn);
      }
    };
    frame = requestAnimationFrame(alignMeasuredRow);
    const cancelFromUserInput = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      notifyScrollCancel(requestedTurn);
    };
    viewport.addEventListener("wheel", cancelFromUserInput, { passive: true });
    viewport.addEventListener("touchstart", cancelFromUserInput, {
      passive: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("wheel", cancelFromUserInput);
      viewport.removeEventListener("touchstart", cancelFromUserInput);
    };
  }, [
    requestedTurn,
    scrollToSelectedTurnRequestId,
    isDesktop,
    scrollElement,
    scrollMargin,
    events?.length,
    virtualizer,
    stickyContentRef,
  ]);

  return (
    <div className="text-[13px] leading-[1.35]">
      <ul>
        <BattleHeader warriors={warriors} characterId={characterId} />
      </ul>
      <ul
        ref={listRef}
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualItems.map((item) => {
          const event = events?.[item.index];
          if (!event) return null;
          const turn = item.index + 1;
          return (
            <BattleEventEntry
              key={item.key}
              rowRef={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${item.start - scrollMargin}px)`,
              }}
              onFocus={() => setFocusedIndex(item.index)}
              onBlur={() => setFocusedIndex(null)}
              event={event}
              attacker={
                event.attackerId == null
                  ? undefined
                  : warriorsMap.get(event.attackerId)
              }
              defender={
                event.defenderId == null
                  ? undefined
                  : warriorsMap.get(event.defenderId)
              }
              eventIndex={item.index}
              turn={turn}
              userTeam={userTeam}
              selected={selectedTurn === turn}
              searchMatched={searchMatchedTurnsSet.has(turn)}
              activeSearchMatch={activeSearchTurn === turn}
              onSelect={onTurnSelect ? () => onTurnSelect(turn) : undefined}
            />
          );
        })}
      </ul>
    </div>
  );
};
