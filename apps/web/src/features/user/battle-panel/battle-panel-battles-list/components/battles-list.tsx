import type { BattleFilters } from "../utils/battle-filter-handlers";
import type {
  BattleListParams as UseBattlesParams,
  BattleListResponse as GetBattlesResponse,
} from "@/lib/api/battlelog-types";
import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import { cn } from "cn";
import { useEffect, useRef, type ReactNode } from "react";
import { getPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { FilterChip } from "@/components/common/filter-chip-list";

type BattlesListProps = {
  activeFilterChips?: FilterChip[];
  battlesResponse?: GetBattlesResponse;
  clearFiltersLabel?: string;
  params?: UseBattlesParams;
  onCursorChange?: (cursor: string | undefined) => void;
  onClearFilters?: () => void;
  onFiltersChange?: (filters: BattleFilters) => void;
  pageIndex?: number;
  pageSize?: number;
  showPagination?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  enableScrollToTop?: boolean;
  toolbar?: ReactNode;
  toolbarEnd?: ReactNode;
};

const getCurrentFilters = (
  params: UseBattlesParams | undefined,
): BattleFilters => ({
  world: params?.world,
  type: params?.type,
  search: params?.search,
  result: params?.result,
  ph: params?.ph,
  matchmaking: params?.matchmaking,
  characterId: params?.characterId,
  minLevel: params?.minLevel,
  maxLevel: params?.maxLevel,
});

const getBattlesTableState = (
  battlesResponse: GetBattlesResponse | undefined,
  pageSize: number | undefined,
  params: UseBattlesParams | undefined,
) => ({
  battles: battlesResponse?.battles ?? [],
  hasNext: Boolean(battlesResponse?.pagination?.hasNext),
  hasPrev: Boolean(battlesResponse?.pagination?.hasPrev),
  pageSize: pageSize ?? params?.size,
  selectionLimit: params?.size,
  totalCount: battlesResponse?.pagination?.total ?? 0,
});

const getBattlesListClassName = (showPagination: boolean) =>
  cn(
    "flex min-h-0 min-w-0 flex-col overflow-hidden",
    showPagination ? "h-full flex-1" : "w-full",
  );

const EMPTY_ACTIVEFILTERCHIPS: NonNullable<
  BattlesListProps["activeFilterChips"]
> = [];

export const BattlesList = ({
  activeFilterChips = EMPTY_ACTIVEFILTERCHIPS,
  battlesResponse,
  clearFiltersLabel,
  params,
  onCursorChange,
  onClearFilters,
  onFiltersChange,
  pageIndex = 0,
  pageSize,
  showPagination = false,
  isLoading = false,
  isRefreshing = false,
  enableScrollToTop = false,
  toolbar,
  toolbarEnd,
}: BattlesListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFilters = getCurrentFilters(params);
  const tableState = getBattlesTableState(battlesResponse, pageSize, params);

  useEffect(() => {
    if (enableScrollToTop && containerRef.current) {
      const scrollViewport = containerRef.current.closest(
        '[data-slot="scroll-area-viewport"]',
      );

      if (scrollViewport) {
        scrollViewport.scrollTo({
          top: 0,
          behavior: getPrefersReducedMotion() ? "auto" : "smooth",
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
    <div ref={containerRef} className={getBattlesListClassName(showPagination)}>
      <BattlesTable
        activeFilterChips={activeFilterChips}
        battles={tableState.battles}
        pagination={
          showPagination
            ? {
                hasNext: tableState.hasNext,
                hasPrev: tableState.hasPrev,
                pageIndex,
                pageSize: tableState.pageSize ?? 20,
                totalCount: tableState.totalCount,
                onNextPage: handleNextPage,
                onPreviousPage: handlePreviousPage,
              }
            : undefined
        }
        clearFiltersLabel={clearFiltersLabel}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onClearFilters={onClearFilters}
        onMatchmakingClick={handleMatchmakingClick}
        onPhClick={handlePhClick}
        onWorldClick={handleWorldClick}
        selectionLimit={tableState.selectionLimit}
        toolbar={toolbar}
        toolbarEnd={toolbarEnd}
      />
    </div>
  );
};
