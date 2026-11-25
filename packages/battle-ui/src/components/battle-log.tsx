import { ListGroupHeading } from "@lootlog/ui/components/list-group-heading";
import { LIST_BAND_HEADING_CLASS } from "@lootlog/ui/lib/list-tile";
import { buildBattleLogVisibleText } from "../lib/battle-log-visible-text";
import type { BattleWarrior as Warrior, RawBattle } from "../lib/battle-types";
import { BattleLogList } from "./battle-log-list";
import { BattleLogSearchToolbar } from "./battle-log-search-toolbar";
import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import {
  getNextBattleLogSearchIndex,
  buildBattleLogRawSearchText,
  findBattleLogSearchMatches,
} from "../lib/battle-log-search";

export type BattleLogProps = {
  scrollViewportRef: RefObject<HTMLDivElement | null>;
  rawBattle: RawBattle;
  warriors: Warrior[];
  selectedTurn?: number | null;
  scrollToSelectedTurnRequestId?: number;
  onListScroll?: () => void;
  onSelectedTurnScrollComplete?: (turn: number) => void;
  onSelectedTurnScrollCancel?: (turn: number) => void;
  onTurnSelect?: (turn: number) => void;
  onTurnFocus?: (turn: number) => void;
  hideHeading?: boolean;
};

export const BattleLog: FC<BattleLogProps> = ({
  rawBattle,
  scrollViewportRef,
  warriors,
  selectedTurn,
  scrollToSelectedTurnRequestId = 0,
  onListScroll,
  onSelectedTurnScrollComplete,
  onSelectedTurnScrollCancel,
  onTurnSelect,
  onTurnFocus,
  hideHeading = false,
}) => {
  const { t } = useTranslation();
  const headingId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const turnFocusHandlerRef = useRef(onTurnFocus ?? onTurnSelect);

  const { events } = rawBattle;

  const warriorsMap = new Map(
    warriors.map((warrior) => [warrior.originalId, warrior]),
  );

  const hasSearch = deferredQuery.trim().length > 0;

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
          rawText: buildBattleLogRawSearchText({
            event,
            attacker,
            defender,
            turn,
          }),
          visibleText: buildBattleLogVisibleText({
            event,
            attacker,
            defender,
            turn,
            t,
          }),
        };
      })
    : [];

  const deferredMatches = findBattleLogSearchMatches({
    query: deferredQuery,
    entries: searchEntries,
  });

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

    // oxlint-disable-next-line react-doctor/no-pass-live-state-to-parent, react-doctor/no-prop-callback-in-effect -- The log owns deferred search; a completed match publishes a focus request to the separate timeline, including deferred results that are unavailable in the input event.
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
    <section aria-labelledby={headingId}>
      {hideHeading ? (
        <h2 id={headingId} className="sr-only">
          {t("battleUi.log.title")}
        </h2>
      ) : (
        <ListGroupHeading
          id={headingId}
          className={LIST_BAND_HEADING_CLASS}
          trailing={
            selectedTurn === null || selectedTurn === undefined ? undefined : (
              <span className="font-normal tabular-nums text-muted-foreground">
                {t("battleUi.log.turnPosition", {
                  current: selectedTurn,
                  total: events.length,
                })}
              </span>
            )
          }
        >
          {t("battleUi.log.title")}
        </ListGroupHeading>
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
    </section>
  );
};
