import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { buildBattleLogVisibleText } from "./utils/battle-log-visible-text";
import type {
  BattleWarrior as Warrior,
  RawBattle,
} from "@/lib/api/battlelog-types";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { BattleLogList } from "./battle-log-list";
import { BattleLogSearchToolbar } from "./battle-log-search-toolbar";
import { Sword } from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FC,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  getNextBattleLogSearchIndex,
  buildBattleLogRawSearchText,
  normalizeBattleLogSearchText,
} from "./utils/battle-log-search";
import { getDisplayBattleEvents } from "./utils/raw-battle-events";

export type BattleLogProps = {
  outerScrollViewportRef: RefObject<HTMLDivElement | null>;
  stickyContentRef?: RefObject<HTMLDivElement | null>;
  rawBattle: RawBattle;
  warriors: Warrior[];
  showHeader?: boolean;
  className?: string;
  listScrollClassName?: string;
  selectedTurn?: number | null;
  scrollToSelectedTurnRequestId?: number;
  onListScroll?: () => void;
  onSelectedTurnScrollComplete?: (turn: number) => void;
  onSelectedTurnScrollCancel?: (turn: number) => void;
  onTurnSelect?: (turn: number) => void;
  onTurnFocus?: (turn: number) => void;
};

export const BattleLog: FC<BattleLogProps> = ({
  rawBattle,
  outerScrollViewportRef,
  stickyContentRef,
  warriors,
  showHeader = true,
  className,
  listScrollClassName,
  selectedTurn,
  scrollToSelectedTurnRequestId = 0,
  onListScroll,
  onSelectedTurnScrollComplete,
  onSelectedTurnScrollCancel,
  onTurnSelect,
  onTurnFocus,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const listViewportRef = useRef<HTMLDivElement>(null);
  const turnFocusHandlerRef = useRef(onTurnFocus ?? onTurnSelect);
  const userTeam = warriors.find(
    (warrior) => warrior.originalId === rawBattle.characterId,
  )?.team;
  const events = getDisplayBattleEvents(rawBattle);
  // Keep the index outside the virtualizer component: its mutable API opts that
  // component out of React Compiler caching.
  const warriorsMap = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior]),
  );
  const normalizedQuery = normalizeBattleLogSearchText(deferredQuery);
  const hasSearch = normalizedQuery.length > 0;
  const searchEntries = hasSearch
    ? events.map((event, eventIndex) => {
        const turn = eventIndex + 1;
        const attacker =
          event.attackerId == null
            ? undefined
            : warriorsMap.get(event.attackerId);
        const defender =
          event.defenderId == null
            ? undefined
            : warriorsMap.get(event.defenderId);
        return {
          turn,
          rawText: normalizeBattleLogSearchText(
            buildBattleLogRawSearchText({ event, attacker, defender, turn }),
          ),
          visibleText: normalizeBattleLogSearchText(
            buildBattleLogVisibleText({ event, attacker, defender, turn, t }),
          ),
        };
      })
    : [];
  const deferredMatches = normalizedQuery
    ? searchEntries
        .filter(
          (entry) =>
            entry.rawText.includes(normalizedQuery) ||
            entry.visibleText.includes(normalizedQuery),
        )
        .map((entry) => entry.turn)
    : [];
  const searchMatchTurns = deferredQuery === searchQuery ? deferredMatches : [];
  const currentMatchIndex =
    searchMatchTurns.length > 0
      ? Math.max(
          0,
          Math.min(activeSearchMatchIndex, searchMatchTurns.length - 1),
        )
      : -1;
  const activeSearchTurn = searchMatchTurns[currentMatchIndex] ?? null;

  useEffect(() => {
    turnFocusHandlerRef.current = onTurnFocus ?? onTurnSelect;
  }, [onTurnFocus, onTurnSelect]);

  useEffect(() => {
    if (activeSearchTurn == null) {
      return;
    }

    turnFocusHandlerRef.current?.(activeSearchTurn);
  }, [activeSearchTurn]);

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setActiveSearchMatchIndex(-1);
  };

  const handlePreviousSearchMatch = () => {
    setActiveSearchMatchIndex(
      getNextBattleLogSearchIndex({
        currentIndex: currentMatchIndex,
        total: searchMatchTurns.length,
        direction: "previous",
      }),
    );
  };

  const handleNextSearchMatch = () => {
    setActiveSearchMatchIndex(
      getNextBattleLogSearchIndex({
        currentIndex: currentMatchIndex,
        total: searchMatchTurns.length,
        direction: "next",
      }),
    );
  };
  const battleLogList = (
    <BattleLogList
      events={events}
      characterId={rawBattle.characterId}
      userTeam={userTeam}
      warriors={warriors}
      selectedTurn={selectedTurn}
      scrollToSelectedTurnRequestId={scrollToSelectedTurnRequestId}
      scrollViewportRef={listViewportRef}
      outerScrollViewportRef={outerScrollViewportRef}
      stickyContentRef={stickyContentRef}
      onVisibleTurnsChange={onListScroll}
      searchMatchedTurns={searchMatchTurns}
      activeSearchTurn={activeSearchTurn}
      onSelectedTurnScrollComplete={onSelectedTurnScrollComplete}
      onSelectedTurnScrollCancel={onSelectedTurnScrollCancel}
      onTurnSelect={onTurnSelect}
    />
  );

  return (
    <Card
      className={cn(
        "border-border bg-card overflow-hidden gap-0 p-0",
        className,
      )}
    >
      {showHeader && (
        <SectionCardHeader
          className="sticky top-0 z-8 bg-card"
          title={t("battlePanel.single.log.title")}
          icon={Sword}
        />
      )}
      <BattleLogSearchToolbar
        query={searchQuery}
        currentIndex={currentMatchIndex}
        totalMatches={searchMatchTurns.length}
        onQueryChange={handleSearchQueryChange}
        onPrevious={handlePreviousSearchMatch}
        onNext={handleNextSearchMatch}
      />
      {listScrollClassName || onListScroll ? (
        <ScrollArea
          ref={listViewportRef}
          className={cn("min-h-0", listScrollClassName)}
          onScroll={onListScroll}
        >
          {battleLogList}
        </ScrollArea>
      ) : (
        battleLogList
      )}
    </Card>
  );
};
