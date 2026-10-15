import type { BattleFilters } from "../utils/battle-filter-handlers";
import type {
  BattleListParams as UseBattlesParams,
  BattleListResponse as GetBattlesResponse,
} from "@/lib/api/battlelog-types";
import { BattlesTable } from "@/features/user/battle-panel/battle-panel-battles-list/components/battles-table";
import type { ReactNode } from "react";
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
  search?: ReactNode;
  toolbar?: ReactNode;
  stackedFilters?: ReactNode;
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
  search,
  toolbar,
  stackedFilters,
}: BattlesListProps) => {
  const currentFilters = getCurrentFilters(params);
  const tableState = getBattlesTableState(battlesResponse, pageSize, params);

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
      search={search}
      toolbar={toolbar}
      stackedFilters={stackedFilters}
      scrollResetKey={enableScrollToTop ? (params?.cursor ?? "") : undefined}
    />
  );
};
