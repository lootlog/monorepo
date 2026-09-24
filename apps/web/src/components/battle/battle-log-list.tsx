import {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  type FC,
  type RefObject,
} from "react";
import { defaultRangeExtractor } from "@tanstack/react-virtual";
import {
  getPageScroller,
  usePageScrollsDocument,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
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
  /** The scroller the log lives in; the log has no scroll container of its own. */
  scrollViewportRef: RefObject<HTMLDivElement | null>;
  /** Content pinned to the top of that scroller, which covers the first visible rows. */
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
  stickyContentRef,
  searchMatchedTurns = [],
  activeSearchTurn,
  onSelectedTurnScrollComplete,
  onSelectedTurnScrollCancel,
  onTurnSelect,
  onVisibleTurnsChange,
}) => {
  "use no memo"; // Reads a virtualizer that mutates in place; see usePageVirtualizer.

  const listRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const scrollsDocument = usePageScrollsDocument();

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    setScrollElement(scrollViewportRef.current);
  }, [scrollViewportRef]);

  const virtualizer = usePageVirtualizer<HTMLLIElement>({
    count: events?.length ?? 0,
    scrollElement,
    listRef,
    estimateSize: () => 72,
    overscan: 8,
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

  const warriorsMap = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior]),
  );

  const searchMatchedTurnsSet = new Set(searchMatchedTurns);

  const virtualItems = virtualizer.getVirtualItems();
  const { scrollMargin } = virtualizer.options;

  const visibleRangeKey = virtualItems
    .map((item) => `${item.index}:${item.size}`)
    .join(",");

  const notifyVisibleTurns = useEffectEvent(() => onVisibleTurnsChange?.());
  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-prop-callback-in-effect -- Reports completed virtualizer layout so the owner can synchronize its DOM scroll overlay.
    notifyVisibleTurns();
  }, [visibleRangeKey]);

  let requestedTurn: number | null | undefined = null;

  if (activeSearchTurn !== null && activeSearchTurn !== undefined)
    requestedTurn = activeSearchTurn;
  else if (scrollToSelectedTurnRequestId > 0) requestedTurn = selectedTurn;

  const notifyScrollComplete = useEffectEvent((turn: number) =>
    onSelectedTurnScrollComplete?.(turn),
  );

  const notifyScrollCancel = useEffectEvent((turn: number) =>
    onSelectedTurnScrollCancel?.(turn),
  );

  useEffect(() => {
    if (requestedTurn === null || requestedTurn === undefined) return;

    if (requestedTurn < 1 || requestedTurn > (events?.length ?? 0)) {
      // eslint-disable-next-line react-doctor/no-pass-live-state-to-parent, react-doctor/no-prop-callback-in-effect -- Owns an imperative scroll request: completion/cancellation notifications follow DOM measurements and user interruption, not mirrored parent state.
      notifyScrollCancel(requestedTurn);

      return;
    }

    const scroller = getPageScroller(scrollElement, scrollsDocument);

    if (!scroller) return;
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
        const band = scroller.getVisibleBand();
        const stickyRect = stickyContentRef?.current?.getBoundingClientRect();

        // Content pinned over the top of the scroller hides rows, so align below it.
        const visibleTop =
          stickyRect &&
          stickyRect.bottom > band.top &&
          stickyRect.top < band.bottom
            ? Math.max(band.top, stickyRect.bottom)
            : band.top;

        const scrollTop = scroller.getScrollTop();

        const target = Math.max(
          0,
          Math.min(
            scroller.getMaxScrollTop(),
            scrollTop +
              row.getBoundingClientRect().top -
              visibleTop -
              BATTLE_LOG_SCROLL_OFFSET_PX,
          ),
        );

        const settled = Math.abs(scrollTop - target) <= 1;
        stableFrames = settled ? stableFrames + 1 : 0;

        if (!settled) scroller.scrollTo({ top: target, behavior: "instant" });

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

    const { eventTarget } = scroller;
    eventTarget.addEventListener("wheel", cancelFromUserInput, {
      passive: true,
    });
    eventTarget.addEventListener("touchstart", cancelFromUserInput, {
      passive: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      eventTarget.removeEventListener("wheel", cancelFromUserInput);
      eventTarget.removeEventListener("touchstart", cancelFromUserInput);
    };
  }, [
    requestedTurn,
    scrollToSelectedTurnRequestId,
    scrollElement,
    scrollsDocument,
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
                event.attackerId === null || event.attackerId === undefined
                  ? undefined
                  : warriorsMap.get(event.attackerId)
              }
              defender={
                event.defenderId === null || event.defenderId === undefined
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
