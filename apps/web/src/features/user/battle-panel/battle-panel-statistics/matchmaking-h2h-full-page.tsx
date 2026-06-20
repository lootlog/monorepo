import { SectionHeader } from "@/components/layout/section-header";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import {
  buildHeadToHeadFilterLabels,
  getResetHeadToHeadFilters,
  removeHeadToHeadFilter,
} from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { BattlePanelH2hCard } from "@/features/user/battle-panel/components/battle-panel-h2h-card";
import { BattlePanelMobileFiltersDrawer } from "@/features/user/battle-panel/components/battle-panel-mobile-filters-drawer";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import { getBattleResultRowClassName } from "@/features/user/battle-panel/components/battle-result-status";
import {
  battlePanelHeadToHeadSearchParsers,
  getSelectedWarriorsFromSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { useBattlesControllerGetHeadToHead } from "@/lib/api/generated/battlelog/battles/battles";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import type { Period } from "@/store/battle-filters.store";
import { Table } from "@lootlog/ui/components/table";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "@lootlog/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  getCoreRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, SearchX, Swords } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { HeadToHeadFilterToolbar } from "./components/head-to-head-filter-toolbar";
import { HeadToHeadFiltersPanel } from "./components/head-to-head-filters-panel";
import { matchmakingH2HColumns } from "./components/matchmaking-h2h-columns";

type SortBy =
  | "wins"
  | "losses"
  | "totalBattles"
  | "winRate"
  | "lastBattleDate"
  | "totalRatingDelta"
  | "avgRatingDelta";

export function MatchmakingH2HFullPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [queryState, setQueryState] = useQueryStates(
    battlePanelHeadToHeadSearchParsers,
  );
  const currentCharacterId = normalizeBattlePanelCharacterId(
    queryState.characterId,
  );
  const period = queryState.period ?? "30d";
  const minLevel = queryState.minLevel;
  const maxLevel = queryState.maxLevel;
  const cursor = queryState.cursor ?? undefined;
  const search = queryState.search ?? undefined;
  const sortBy = queryState.sortBy ?? "totalBattles";
  const sortOrder = queryState.sortOrder ?? "desc";
  const selectedWarriors = getSelectedWarriorsFromSearch(search);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const pageSize = 20;

  const handleRowClick = (opponentId: string) => {
    if (!currentCharacterId) return;

    void navigate({
      to: "/@me/battle-panel/statistics/player-vs-player/$myId/$opponentId",
      params: {
        myId: currentCharacterId,
        opponentId,
      },
      search: {
        characterId: currentCharacterId,
        period,
        minLevel,
        maxLevel,
        matchmaking: true,
      },
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    opponentId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleRowClick(opponentId);
  };

  const { data, isLoading, isError, error } = useBattlesControllerGetHeadToHead(
    {
      cursor,
      size: pageSize,
      sortBy,
      sortOrder,
      characterId: currentCharacterId,
      period,
      search,
      minLevel,
      maxLevel,
      matchmaking: true,
      includeTotal: true,
    },
  );

  const applyFilterState = ({
    characterId,
    maxLevel: nextMaxLevel,
    minLevel: nextMinLevel,
    period: nextPeriod,
    search: nextSearch,
  }: {
    characterId?: string;
    maxLevel?: number;
    minLevel?: number;
    period: Period;
    search?: string;
  }) => {
    setPageIndex(0);
    void setQueryState({
      characterId: characterId ?? null,
      period: nextPeriod,
      minLevel: nextMinLevel ?? 1,
      maxLevel: nextMaxLevel ?? 500,
      ph: null,
      matchmaking: null,
      search: nextSearch ?? null,
      cursor: null,
    });
  };

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const isSelected = selectedWarriors.some(
      (item) => item.name === warrior.name,
    );
    const nextSelectedWarriors = isSelected
      ? selectedWarriors.filter((item) => item.name !== warrior.name)
      : [warrior];

    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel,
      search:
        nextSelectedWarriors.length > 0
          ? nextSelectedWarriors.map((item) => item.name).join(",")
          : undefined,
    });
  };

  const handleNextPage = () => {
    if (data?.pagination.nextCursor) {
      setPageIndex((currentPageIndex) => currentPageIndex + 1);
      void setQueryState({ cursor: data.pagination.nextCursor });
    }
  };

  const handlePreviousPage = () => {
    if (data?.pagination.previousCursor) {
      setPageIndex((currentPageIndex) => Math.max(currentPageIndex - 1, 0));
      void setQueryState({ cursor: data.pagination.previousCursor });
    }
  };

  const handlePeriodChange = (value: Period) => {
    applyFilterState({
      characterId: currentCharacterId,
      period: value,
      minLevel,
      maxLevel,
      search,
    });
  };

  const handleCharacterChange = (id: string | undefined) => {
    applyFilterState({
      characterId: id,
      period,
      minLevel,
      maxLevel,
      search,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel: value,
      maxLevel,
      search,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel: value,
      search,
    });
  };

  const handleClearFilters = () => {
    applyFilterState(getResetHeadToHeadFilters());
  };

  const table = useReactTable({
    data: data?.records ?? [],
    columns: matchmakingH2HColumns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      const nextSort = nextSorting[0];

      setPageIndex(0);
      void setQueryState({
        sortBy: (nextSort?.id as SortBy | undefined) ?? "totalBattles",
        sortOrder: nextSort?.desc ? "desc" : "asc",
        cursor: null,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  const filterState = {
    characterId: currentCharacterId,
    period,
    minLevel,
    maxLevel,
    search,
  };
  const activeFilterChips = buildHeadToHeadFilterLabels({
    ...filterState,
    selectedWarriorsCount: selectedWarriors.length,
    translate: t,
  }).map((chip) => ({
    ...chip,
    onRemove: () =>
      applyFilterState(removeHeadToHeadFilter(filterState, chip.id)),
  }));

  const filtersContent = (
    <HeadToHeadFiltersPanel
      characterId={currentCharacterId}
      period={period}
      minLevel={minLevel}
      maxLevel={maxLevel}
      ph={false}
      matchmaking
      selectedWarriors={selectedWarriors}
      showPhFilter={false}
      showMatchmakingFilter={false}
      onCharacterChange={handleCharacterChange}
      onPeriodChange={handlePeriodChange}
      onMinLevelChange={handleMinLevelChange}
      onMaxLevelChange={handleMaxLevelChange}
      onPhChange={() => {}}
      onMatchmakingChange={() => {}}
      onWarriorToggle={handleWarriorToggle}
    />
  );
  const toolbar = (
    <HeadToHeadFilterToolbar
      characterId={currentCharacterId}
      isMobile={isMobile}
      maxLevel={maxLevel}
      minLevel={minLevel}
      onCharacterChange={handleCharacterChange}
      onMatchmakingChange={() => {}}
      onMaxLevelChange={handleMaxLevelChange}
      onMinLevelChange={handleMinLevelChange}
      onMobileFiltersOpen={() => setIsMobileFiltersOpen(true)}
      onPeriodChange={handlePeriodChange}
      onPhChange={() => {}}
      onWarriorToggle={handleWarriorToggle}
      period={period}
      selectedWarriors={selectedWarriors}
      showMatchmakingFilter={false}
      showPhFilter={false}
    />
  );
  const paginationFooter = (
    <BattlePanelPaginationFooter
      hasPrev={Boolean(data?.pagination?.hasPrev)}
      hasNext={Boolean(data?.pagination?.hasNext)}
      label={(range) => t("battlePanel.statistics.showingRecords", range)}
      onPreviousPage={handlePreviousPage}
      onNextPage={handleNextPage}
      pageIndex={pageIndex}
      pageSize={pageSize}
      totalCount={data?.pagination?.total ?? 0}
      visibleCount={data?.records.length ?? 0}
    />
  );

  return (
    <>
      {isMobile && (
        <BattlePanelMobileFiltersDrawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          contentClassName="p-0"
          title={t("battlePanel.filters.headToHeadTitle")}
        >
          {filtersContent}
        </BattlePanelMobileFiltersDrawer>
      )}

      <div className="flex h-full w-full flex-col overflow-hidden bg-background/50">
        <div className="px-3 pb-0 pt-3">
          <SectionHeader
            icon={Swords}
            title={t("battlePanel.statistics.matchmaking.fullTitle")}
            subtitle={t("battlePanel.statistics.matchmaking.fullDescription")}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <BattlePanelResultsSurface
            chips={activeFilterChips}
            clearFiltersLabel={t("battlePanel.filters.clear")}
            footer={paginationFooter}
            onClearFilters={handleClearFilters}
            toolbar={toolbar}
            withHorizontalScroll={!isMobile}
          >
            {isLoading ? (
              <TableRowsSkeleton trailingColumns={3} />
            ) : isError ? (
              <BattlePanelEmptyState
                icon={AlertCircle}
                title={t("battlePanel.statistics.empty.errorTitle")}
                description={
                  getRouteErrorMessage(error) ??
                  t("common.routeErrors.status.500.description")
                }
              />
            ) : !data || data.records.length === 0 ? (
              <BattlePanelEmptyState
                icon={SearchX}
                title={t("battlePanel.statistics.matchmaking.emptyTitle")}
                description={t(
                  "battlePanel.statistics.matchmaking.emptyDescription",
                )}
              />
            ) : isMobile ? (
              <div className="grid gap-2 p-3">
                {data.records.map((record) => (
                  <BattlePanelH2hCard
                    key={record.opponentId}
                    record={record}
                    showRatingDelta
                    onOpen={handleRowClick}
                  />
                ))}
              </div>
            ) : (
              <Table className="border-b">
                <TanStackTableHeader
                  table={table}
                  className="sticky top-0 z-10 bg-background"
                  rowClassName="border-b-1! border-border"
                  headClassName="whitespace-nowrap"
                />
                <TanStackTableBody
                  table={table}
                  cellClassName="whitespace-nowrap"
                  getRowProps={(row) => ({
                    className: cn(
                      "h-14 cursor-pointer border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      getBattleResultRowClassName(
                        row.original.lastBattleResult,
                      ),
                    ),
                    onClick: () => handleRowClick(row.original.opponentId),
                    onKeyDown: (event) =>
                      handleRowKeyDown(event, row.original.opponentId),
                    role: "link",
                    tabIndex: 0,
                  })}
                />
              </Table>
            )}
          </BattlePanelResultsSurface>
        </div>
      </div>
    </>
  );
}
