import type {
  GetBattlesResponse,
  UseBattlesParams,
} from "@/hooks/api/battle-log/use-battles";
import type { BattleCharacter } from "@/hooks/api/battle-log/use-battle-characters";
import { BattlesListEntry } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list-entry";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import { BattlesListFilters, type BattleFilters } from "./battles-list-filters";
import { Swords } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useEffect, useRef } from "react";

type BattlesListProps = {
  battlesResponse?: GetBattlesResponse;
  characters?: BattleCharacter[];
  params?: UseBattlesParams;
  onCursorChange?: (cursor: string | undefined) => void;
  onFiltersChange?: (filters: BattleFilters) => void;
  showPagination?: boolean;
  showFilters?: boolean;
  isLoading?: boolean;
  enableScrollToTop?: boolean;
};

export const BattlesList = ({
  battlesResponse,
  characters,
  params,
  onCursorChange,
  onFiltersChange,
  showPagination = false,
  showFilters = false,
  isLoading = false,
  enableScrollToTop = false,
}: BattlesListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFilters: BattleFilters = {
    world: params?.world,
    type: params?.type,
    search: params?.search,
    result: params?.result,
    ph: params?.ph,
    matchmaking: params?.matchmaking,
    characterId: params?.characterId,
    minLevel: params?.minLevel,
    maxLevel: params?.maxLevel,
  };

  useEffect(() => {
    if (enableScrollToTop && containerRef.current) {
      const scrollViewport = containerRef.current.closest(
        '[data-slot="scroll-area-viewport"]',
      ) as HTMLElement | null;

      if (scrollViewport) {
        scrollViewport.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }
  }, [params?.cursor, enableScrollToTop]);

  const handleNextPage = () => {
    if (onCursorChange && battlesResponse?.pagination.nextCursor) {
      onCursorChange(battlesResponse.pagination.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (onCursorChange) {
      onCursorChange(undefined);
    }
  };

  const handleResultClick = (result: "won" | "lost" | "flee") => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        result: [result],
      });
    }
  };

  const handleWorldClick = (world: string) => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        world,
      });
    }
  };

  const handlePhClick = () => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        ph: true,
      });
    }
  };

  const handleMatchmakingClick = () => {
    if (onFiltersChange) {
      onFiltersChange({
        ...currentFilters,
        matchmaking: true,
      });
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {showFilters && onFiltersChange && (
        <BattlesListFilters
          filters={currentFilters}
          onFiltersChange={onFiltersChange}
          characters={characters}
        />
      )}

      <div
        className={cn("flex-1", {
          "flex items-center justify-center min-h-[70vh]":
            isLoading || battlesResponse?.battles.length === 0,
        })}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">Ładowanie walk...</p>
          </div>
        ) : battlesResponse?.battles.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Swords />
              </EmptyMedia>
              <EmptyTitle>Brak walk</EmptyTitle>
              <EmptyDescription>
                Nie znaleziono żadnych walk spełniających kryteria wyszukiwania
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          battlesResponse?.battles.map((battle) => (
            <BattlesListEntry
              key={battle.id}
              battle={battle}
              onResultClick={handleResultClick}
              onWorldClick={handleWorldClick}
              onPhClick={handlePhClick}
              onMatchmakingClick={handleMatchmakingClick}
            />
          ))
        )}
      </div>

      {showPagination &&
        battlesResponse?.pagination &&
        (battlesResponse.pagination.hasNext ||
          battlesResponse.pagination.hasPrev) && (
          <div className="sticky h-14 bottom-0 bg-background border-t flex items-center justify-center px-4 relative">
            <div className="absolute left-4 text-sm text-muted-foreground max-w-[30%]">
              {battlesResponse.pagination.total && (
                <span>Łącznie walk: {battlesResponse.pagination.total}</span>
              )}
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={handlePreviousPage}
                    className={
                      !battlesResponse.pagination.hasPrev
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    onClick={handleNextPage}
                    className={
                      !battlesResponse.pagination.hasNext
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
    </div>
  );
};
