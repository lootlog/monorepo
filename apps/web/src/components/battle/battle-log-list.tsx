import {
  useState,
  startTransition,
  useEffect,
  useRef,
  type FC,
  type RefObject,
} from "react";
import { BattleEventEntry } from "./battle-event-entry";
import { BattleHeader } from "./battle-header";
import {
  buildBattleLogRawSearchText,
  findBattleLogSearchMatches,
  normalizeBattleLogSearchText,
} from "./utils/battle-log-search";
import type {
  BattleWarrior as Warrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";

const INITIAL_RENDER_COUNT = 30;
const BATTLE_LOG_SCROLL_OFFSET_PX = 8;

export type BattleLogListProps = {
  events?: RawBattleParsedEvent[];
  characterId?: string;
  warriors: Warrior[];
  userTeam?: number;
  selectedTurn?: number | null;
  scrollToSelectedTurnRequestId?: number;
  scrollViewportRef?: RefObject<HTMLDivElement | null>;
  searchQuery?: string;
  activeSearchTurn?: number | null;
  onSearchMatchesChange?: (turns: number[]) => void;
  onSelectedTurnScrollComplete?: (turn: number) => void;
  onTurnSelect?: (turn: number) => void;
};

export const BattleLogList: FC<BattleLogListProps> = ({
  events,
  warriors,
  characterId,
  userTeam,
  selectedTurn,
  scrollToSelectedTurnRequestId = 0,
  scrollViewportRef,
  searchQuery = "",
  activeSearchTurn,
  onSearchMatchesChange,
  onSelectedTurnScrollComplete,
  onTurnSelect,
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const previousSearchMatchKeyRef = useRef("");
  const scrollCompletionFrameRef = useRef<number | null>(null);
  const [searchMatchedTurns, setSearchMatchedTurns] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(
    () => !events || events.length <= INITIAL_RENDER_COUNT,
  );

  const clearScrollCompletionFrame = () => {
    if (scrollCompletionFrameRef.current == null) {
      return;
    }

    window.cancelAnimationFrame(scrollCompletionFrameRef.current);
    scrollCompletionFrameRef.current = null;
  };

  const notifyWhenScrollSettles = ({
    scrollViewport,
    targetScrollTop,
    turn,
  }: {
    scrollViewport: HTMLElement;
    targetScrollTop: number;
    turn: number;
  }) => {
    clearScrollCompletionFrame();

    let previousScrollTop = scrollViewport.scrollTop;
    let stableFrameCount = 0;
    let frameCount = 0;

    const checkScrollPosition = () => {
      const distanceFromTarget = Math.abs(
        scrollViewport.scrollTop - targetScrollTop,
      );
      const scrollDelta = Math.abs(
        scrollViewport.scrollTop - previousScrollTop,
      );

      if (
        distanceFromTarget <= 2 ||
        (frameCount > 8 && stableFrameCount >= 4) ||
        frameCount >= 75
      ) {
        scrollCompletionFrameRef.current = null;
        onSelectedTurnScrollComplete?.(turn);
        return;
      }

      if (scrollDelta <= 0.5) {
        stableFrameCount += 1;
      } else {
        stableFrameCount = 0;
      }

      previousScrollTop = scrollViewport.scrollTop;
      frameCount += 1;
      scrollCompletionFrameRef.current =
        window.requestAnimationFrame(checkScrollPosition);
    };

    scrollCompletionFrameRef.current =
      window.requestAnimationFrame(checkScrollPosition);
  };

  const scrollTurnElementToTop = (turnElement: HTMLElement | null) => {
    if (!turnElement) {
      return;
    }

    const scrollViewport =
      scrollViewportRef?.current ?? listRef.current?.parentElement;

    if (!scrollViewport) {
      turnElement.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      return;
    }

    const viewportRect = scrollViewport.getBoundingClientRect();
    const turnRect = turnElement.getBoundingClientRect();
    const scrollTop =
      scrollViewport.scrollTop +
      turnRect.top -
      viewportRect.top -
      BATTLE_LOG_SCROLL_OFFSET_PX;

    const targetScrollTop = Math.max(0, scrollTop);

    scrollViewport.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });

    const turn = Number.parseInt(turnElement.dataset.battleTurn ?? "", 10);

    if (!Number.isNaN(turn)) {
      notifyWhenScrollSettles({
        scrollViewport,
        targetScrollTop,
        turn,
      });
    }
  };

  useEffect(
    () => () => {
      clearScrollCompletionFrame();
    },
    [],
  );

  useEffect(() => {
    if (!showAll) {
      startTransition(() => {
        setShowAll(true);
      });
    }
  }, [showAll]);

  useEffect(() => {
    const normalizedSearchQuery = normalizeBattleLogSearchText(searchQuery);

    if (normalizedSearchQuery.length > 0 && !showAll) {
      startTransition(() => {
        setShowAll(true);
      });
    }
  }, [searchQuery, showAll]);

  useEffect(() => {
    const normalizedSearchQuery = normalizeBattleLogSearchText(searchQuery);

    const notifySearchMatches = (turns: number[]) => {
      const searchMatchKey = `${searchQuery}:${turns.join(",")}`;

      if (searchMatchKey === previousSearchMatchKeyRef.current) {
        return;
      }

      previousSearchMatchKeyRef.current = searchMatchKey;
      setSearchMatchedTurns(turns);
      onSearchMatchesChange?.(turns);
    };

    if (normalizedSearchQuery.length === 0) {
      notifySearchMatches([]);
      return;
    }

    if (!showAll) {
      return;
    }

    const warriorsMapForSearch = new Map(
      warriors.map((warrior) => [warrior.originalId, warrior]),
    );
    const visibleTextByTurn = new Map<number, string>();
    listRef.current
      ?.querySelectorAll<HTMLElement>("[data-battle-turn]")
      .forEach((turnElement) => {
        const turn = Number.parseInt(turnElement.dataset.battleTurn ?? "", 10);

        if (Number.isNaN(turn)) {
          return;
        }

        visibleTextByTurn.set(turn, turnElement.textContent ?? "");
      });
    const searchEntries =
      events?.map((event, eventIndex) => {
        const turn = eventIndex + 1;
        const attacker =
          event.attackerId == null
            ? undefined
            : warriorsMapForSearch.get(event.attackerId);
        const defender =
          event.defenderId == null
            ? undefined
            : warriorsMapForSearch.get(event.defenderId);

        return {
          turn,
          rawText: buildBattleLogRawSearchText({
            event,
            attacker,
            defender,
            turn,
          }),
          visibleText: visibleTextByTurn.get(turn) ?? "",
        };
      }) ?? [];
    const matches = findBattleLogSearchMatches({
      query: searchQuery,
      entries: searchEntries,
    });

    notifySearchMatches(matches.map((match) => match.turn));
  }, [events, onSearchMatchesChange, searchQuery, showAll, warriors]);

  useEffect(() => {
    if (
      scrollToSelectedTurnRequestId <= 0 ||
      selectedTurn == null ||
      !showAll
    ) {
      return;
    }

    const turnElement = listRef.current?.querySelector<HTMLElement>(
      `[data-battle-turn="${selectedTurn}"]`,
    );
    scrollTurnElementToTop(turnElement ?? null);
  }, [scrollToSelectedTurnRequestId, selectedTurn, showAll]);

  useEffect(() => {
    if (activeSearchTurn == null || !showAll) {
      return;
    }

    const turnElement = listRef.current?.querySelector<HTMLElement>(
      `[data-battle-turn="${activeSearchTurn}"]`,
    );
    scrollTurnElementToTop(turnElement ?? null);
  }, [activeSearchTurn, showAll]);

  const warriorsMap = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior]),
  );
  const visibleEvents = showAll
    ? events
    : events?.slice(0, INITIAL_RENDER_COUNT);
  const searchMatchedTurnsSet = new Set(searchMatchedTurns);

  return (
    <ul ref={listRef} className="text-[13px] leading-[1.35]">
      <BattleHeader warriors={warriors} characterId={characterId} />
      {visibleEvents?.map((event, eventIndex) => {
        const turn = eventIndex + 1;
        const attacker =
          event.attackerId == null
            ? undefined
            : warriorsMap.get(event.attackerId);
        const defender =
          event.defenderId == null
            ? undefined
            : warriorsMap.get(event.defenderId);

        return (
          <BattleEventEntry
            key={eventIndex}
            event={event}
            attacker={attacker}
            defender={defender}
            eventIndex={eventIndex}
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
  );
};
