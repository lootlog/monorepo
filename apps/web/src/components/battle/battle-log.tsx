import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { buildBattleLogVisibleText } from "./utils/battle-log-visible-text";
import type {
  BattleWarrior as Warrior,
  RawBattle,
} from "@/lib/api/battlelog-types";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
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
  /** The scroller the log lives in; the log has no scroll container of its own. */
  scrollViewportRef: RefObject<HTMLDivElement | null>;
  rawBattle: RawBattle;
  warriors: Warrior[];
  showHeader?: boolean;
  className?: string;
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
  scrollViewportRef,
  warriors,
  showHeader = true,
  className,
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
  // The search bar pins itself over the top of the log, so rows are aligned below it.
  const toolbarRef = useRef<HTMLDivElement>(null);
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
          event.attackerId === null || event.attackerId === undefined
            ? undefined
            : warriorsMap.get(event.attackerId);

        const defender =
          event.defenderId === null || event.defenderId === undefined
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
    ? searchEntries.flatMap((entry) =>
        entry.rawText.includes(normalizedQuery) ||
        entry.visibleText.includes(normalizedQuery)
          ? [entry.turn]
          : [],
      )
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
    if (activeSearchTurn === null || activeSearchTurn === undefined) {
      return;
    }

    // eslint-disable-next-line react-doctor/no-pass-live-state-to-parent, react-doctor/no-prop-callback-in-effect -- The log owns deferred search; a completed match publishes a focus request to the separate timeline, including deferred results that are unavailable in the input event.
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
      scrollViewportRef={scrollViewportRef}
      stickyContentRef={toolbarRef}
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
        // `overflow-clip` rounds the corners without becoming a scroll container, so the search
        // bar can stick to the scroller the log lives in.
        "isolate border-border bg-card overflow-clip gap-0 p-0",
        className,
      )}
    >
      {showHeader && (
        <SectionCardHeader
          className="shrink-0"
          title={t("battlePanel.single.log.title")}
          icon={Sword}
          actions={
            selectedTurn === null || selectedTurn === undefined ? undefined : (
              <span className="text-xs tabular-nums text-muted-foreground">
                {t("battlePanel.single.log.turnPosition", {
                  current: selectedTurn,
                  total: events.length,
                })}
              </span>
            )
          }
        />
      )}
      <BattleLogSearchToolbar
        ref={toolbarRef}
        query={searchQuery}
        currentIndex={currentMatchIndex}
        totalMatches={searchMatchTurns.length}
        onQueryChange={handleSearchQueryChange}
        onPrevious={handlePreviousSearchMatch}
        onNext={handleNextSearchMatch}
      />
      {battleLogList}
    </Card>
  );
};
