import type {
  BattleWarrior as Warrior,
  RawBattle,
} from "@/lib/api/battlelog-types";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import { BattleLogList } from "./battle-log-list";
import { BattleLogSearchToolbar } from "./battle-log-search-toolbar";
import { Sword } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  getNextBattleLogSearchIndex,
  normalizeBattleLogSearchText,
} from "./utils/battle-log-search";
import { getDisplayBattleEvents } from "./utils/raw-battle-events";

export type BattleLogProps = {
  rawBattle: RawBattle;
  warriors: Warrior[];
  showHeader?: boolean;
  className?: string;
  listScrollClassName?: string;
  selectedTurn?: number | null;
  scrollToSelectedTurnRequestId?: number;
  onListScroll?: () => void;
  onSelectedTurnScrollComplete?: (turn: number) => void;
  onTurnSelect?: (turn: number) => void;
  onTurnFocus?: (turn: number) => void;
};

export const BattleLog: FC<BattleLogProps> = ({
  rawBattle,
  warriors,
  showHeader = true,
  className,
  listScrollClassName,
  selectedTurn,
  scrollToSelectedTurnRequestId = 0,
  onListScroll,
  onSelectedTurnScrollComplete,
  onTurnSelect,
  onTurnFocus,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchTurns, setSearchMatchTurns] = useState<number[]>([]);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const listViewportRef = useRef<HTMLDivElement>(null);
  const turnFocusHandlerRef = useRef(onTurnFocus ?? onTurnSelect);
  const userTeam = warriors.find(
    (warrior) => warrior.originalId === rawBattle.characterId,
  )?.team;
  const events = getDisplayBattleEvents(rawBattle);
  const activeSearchTurn =
    activeSearchMatchIndex >= 0
      ? (searchMatchTurns[activeSearchMatchIndex] ?? null)
      : null;

  useEffect(() => {
    turnFocusHandlerRef.current = onTurnFocus ?? onTurnSelect;
  }, [onTurnFocus, onTurnSelect]);

  useEffect(() => {
    const hasQuery = normalizeBattleLogSearchText(searchQuery).length > 0;

    if (!hasQuery || searchMatchTurns.length === 0) {
      if (activeSearchMatchIndex !== -1) {
        setActiveSearchMatchIndex(-1);
      }

      return;
    }

    if (
      activeSearchMatchIndex >= 0 &&
      activeSearchMatchIndex < searchMatchTurns.length
    ) {
      return;
    }

    setActiveSearchMatchIndex(0);
  }, [activeSearchMatchIndex, searchMatchTurns, searchQuery]);

  useEffect(() => {
    if (activeSearchTurn == null) {
      return;
    }

    turnFocusHandlerRef.current?.(activeSearchTurn);
  }, [activeSearchTurn]);

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    setSearchMatchTurns([]);
    setActiveSearchMatchIndex(-1);
  };

  const handlePreviousSearchMatch = () => {
    setActiveSearchMatchIndex((currentIndex) =>
      getNextBattleLogSearchIndex({
        currentIndex,
        total: searchMatchTurns.length,
        direction: "previous",
      }),
    );
  };

  const handleNextSearchMatch = () => {
    setActiveSearchMatchIndex((currentIndex) =>
      getNextBattleLogSearchIndex({
        currentIndex,
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
      searchQuery={searchQuery}
      activeSearchTurn={activeSearchTurn}
      onSearchMatchesChange={setSearchMatchTurns}
      onSelectedTurnScrollComplete={onSelectedTurnScrollComplete}
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
        <div className="sticky top-0 z-8 bg-background border-b">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Sword className="h-5 w-5" />
                {t("battlePanel.single.log.title")}
              </div>
            </div>
          </div>
        </div>
      )}
      <BattleLogSearchToolbar
        query={searchQuery}
        currentIndex={activeSearchMatchIndex}
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
