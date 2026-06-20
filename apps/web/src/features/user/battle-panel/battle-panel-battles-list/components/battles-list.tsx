import type {
  BattleCharacter,
  BattleListParams as UseBattlesParams,
  BattleListResponse as GetBattlesResponse,
} from "@/lib/api/battlelog-types";
import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import { BattlesListFilters, type BattleFilters } from "./battles-list-filters";
import { cn } from "@lootlog/ui/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";
import type { BattlePanelFilterChip } from "@/features/user/battle-panel/components/battle-panel-filter-chip-list";

type BattlesListProps = {
  activeFilterChips?: BattlePanelFilterChip[];
  battlesResponse?: GetBattlesResponse;
  clearFiltersLabel?: string;
  characters?: BattleCharacter[];
  params?: UseBattlesParams;
  onCursorChange?: (cursor: string | undefined) => void;
  onClearFilters?: () => void;
  onFiltersChange?: (filters: BattleFilters) => void;
  pageIndex?: number;
  pageSize?: number;
  showPagination?: boolean;
  showFilters?: boolean;
  isLoading?: boolean;
  enableScrollToTop?: boolean;
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
};

export const BattlesList = ({
  activeFilterChips = [],
  battlesResponse,
  clearFiltersLabel,
  characters,
  params,
  onCursorChange,
  onClearFilters,
  onFiltersChange,
  pageIndex = 0,
  pageSize,
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
        activeFilterChips={activeFilterChips}
        battles={battlesResponse?.battles ?? []}
        clearFiltersLabel={clearFiltersLabel}
        hasNext={Boolean(battlesResponse?.pagination?.hasNext)}
        hasPrev={Boolean(battlesResponse?.pagination?.hasPrev)}
        isLoading={isLoading}
        onClearFilters={onClearFilters}
        onMatchmakingClick={handleMatchmakingClick}
        onNextPage={handleNextPage}
        onPhClick={handlePhClick}
        onPreviousPage={handlePreviousPage}
        onWorldClick={handleWorldClick}
        pageIndex={pageIndex}
        pageSize={pageSize ?? params?.size}
        showPagination={showPagination}
        selectionLimit={params?.size}
        totalCount={battlesResponse?.pagination?.total ?? 0}
        toolbar={toolbar}
        toolbarEnd={toolbarEnd}
      />
    </div>
  );
};
