import type {
  BattleCharacter,
  BattleListParams as UseBattlesParams,
  BattleListResponse as GetBattlesResponse,
} from "@/lib/api/battlelog-types";
import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import { BattlesListFilters, type BattleFilters } from "./battles-list-filters";
import { cn } from "@lootlog/ui/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";

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
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
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
  toolbar,
  toolbarEnd,
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
      onCursorChange(battlesResponse?.pagination.previousCursor);
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
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden",
        showPagination ? "h-full flex-1" : "w-full",
        showFilters && "gap-3",
      )}
    >
      {showFilters && onFiltersChange && (
        <BattlesListFilters
          filters={currentFilters}
          onFiltersChange={onFiltersChange}
          characters={characters}
        />
      )}

      <BattlesTable
        battles={battlesResponse?.battles ?? []}
        hasNext={Boolean(battlesResponse?.pagination?.hasNext)}
        hasPrev={Boolean(battlesResponse?.pagination?.hasPrev)}
        isLoading={isLoading}
        onMatchmakingClick={handleMatchmakingClick}
        onNextPage={handleNextPage}
        onPhClick={handlePhClick}
        onPreviousPage={handlePreviousPage}
        onWorldClick={handleWorldClick}
        showPagination={showPagination}
        selectionLimit={params?.size}
        totalCount={battlesResponse?.pagination?.total ?? 0}
        toolbar={toolbar}
        toolbarEnd={toolbarEnd}
      />
    </div>
  );
};
