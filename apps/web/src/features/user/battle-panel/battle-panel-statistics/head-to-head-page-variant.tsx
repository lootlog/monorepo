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
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import { getBattleResultRowClassName } from "@/features/user/battle-panel/components/battle-result-status";
import {
  battlePanelHeadToHeadSearchParsers,
  getBattlePanelPageIndex,
  getNextBattlePanelPage,
  getPreviousBattlePanelPage,
  getSelectedWarriorsFromSearch,
  normalizeBattlePanelCharacterId,
  resetBattlePanelCursorPagination,
  type HeadToHeadSortBy,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import { useBattlesControllerGetHeadToHead } from "@lootlog/api-client/react-query/battlelog/battles";
import type {
  HeadToHeadRecord,
  SearchWarrior,
} from "@/lib/api/battlelog-types";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { Table } from "@lootlog/ui/components/table";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "@lootlog/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  getCoreRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, SearchX, Swords } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { HeadToHeadFilterToolbar } from "./components/head-to-head-filter-toolbar";
import { HeadToHeadFiltersPanel } from "./components/head-to-head-filters-panel";

type HeadToHeadPageVariantProps = {
  columns: ColumnDef<HeadToHeadRecord>[];
  emptyDescriptionKey: string;
  emptyTitleKey: string;
  matchmaking: boolean;
  showPhFilter: boolean;
  showRatingDelta?: boolean;
  subtitleKey: string;
  titleKey: string;
  trailingSkeletonColumns?: number;
};

type HeadToHeadFilterPatch = {
  characterId?: string;
  maxLevel?: number;
  minLevel?: number;
  period: Period;
  ph?: boolean;
  search?: string;
};

export function HeadToHeadPageVariant({
  columns,
  emptyDescriptionKey,
  emptyTitleKey,
  matchmaking,
  showPhFilter,
  showRatingDelta = false,
  subtitleKey,
  titleKey,
  trailingSkeletonColumns,
}: HeadToHeadPageVariantProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [queryState, setQueryState] = useQueryStates(
    battlePanelHeadToHeadSearchParsers,
  );
  const resolvePageState = () => ({
    pageIndex: getBattlePanelPageIndex(queryState.page),
    currentCharacterId: normalizeBattlePanelCharacterId(queryState.characterId),
    period: queryState.period ?? "30d",
    minLevel: queryState.minLevel,
    maxLevel: queryState.maxLevel,
    startDate: queryState.startDate ?? undefined,
    endDate: queryState.endDate ?? undefined,
    ph: showPhFilter ? (queryState.ph ?? undefined) : undefined,
    cursor: queryState.cursor ?? undefined,
    search: queryState.search ?? undefined,
    sortBy: queryState.sortBy ?? "totalBattles",
    sortOrder: queryState.sortOrder ?? "desc",
  });
  const {
    pageIndex,
    currentCharacterId,
    period,
    minLevel,
    maxLevel,
    startDate,
    endDate,
    ph,
    cursor,
    search,
    sortBy,
    sortOrder,
  } = resolvePageState();
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
        startDate,
        endDate,
        ph,
        matchmaking,
      },
    });
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    opponentId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== "") {
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
      startDate,
      endDate,
      search,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
      includeTotal: true,
    },
  );

  const applyFilterState = ({
    characterId,
    maxLevel: nextMaxLevel,
    minLevel: nextMinLevel,
    period: nextPeriod,
    ph: nextPh,
    search: nextSearch,
  }: HeadToHeadFilterPatch) => {
    void setQueryState({
      ...resetBattlePanelCursorPagination(),
      characterId: characterId ?? null,
      period: nextPeriod,
      minLevel: nextMinLevel ?? 1,
      maxLevel: nextMaxLevel ?? 500,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      ph: showPhFilter ? (nextPh ?? null) : null,
      matchmaking: null,
      search: nextSearch ?? null,
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
      ph,
      search:
        nextSelectedWarriors.length > 0
          ? nextSelectedWarriors.map((item) => item.name).join(",")
          : undefined,
    });
  };

  const handleNextPage = () => {
    if (data?.pagination.nextCursor) {
      void setQueryState({
        cursor: data.pagination.nextCursor,
        page: getNextBattlePanelPage(queryState.page),
      });
    }
  };

  const handlePreviousPage = () => {
    if (data?.pagination.previousCursor) {
      void setQueryState({
        cursor: data.pagination.previousCursor,
        page: getPreviousBattlePanelPage(queryState.page),
      });
    }
  };

  const handlePeriodChange = (value: Period) => {
    applyFilterState({
      characterId: currentCharacterId,
      period: value,
      minLevel,
      maxLevel,
      ph,
      search,
    });
  };

  const handleCharacterChange = (id: string | undefined) => {
    applyFilterState({
      characterId: id,
      period,
      minLevel,
      maxLevel,
      ph,
      search,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel: value,
      maxLevel,
      ph,
      search,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel: value,
      ph,
      search,
    });
  };

  const handlePhChange = (value: boolean) => {
    applyFilterState({
      characterId: currentCharacterId,
      period,
      minLevel,
      maxLevel,
      ph: value ? true : undefined,
      search,
    });
  };

  const table = useReactTable({
    data: data?.records ?? [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      const nextSort = nextSorting[0];

      void setQueryState({
        ...resetBattlePanelCursorPagination(),
        sortBy:
          (nextSort?.id as HeadToHeadSortBy | undefined) ?? "totalBattles",
        sortOrder: nextSort?.desc ? "desc" : "asc",
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
    startDate,
    endDate,
    ph,
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
      ph={ph ?? false}
      matchmaking={matchmaking}
      selectedWarriors={selectedWarriors}
      showPhFilter={showPhFilter}
      showMatchmakingFilter={false}
      onCharacterChange={handleCharacterChange}
      onPeriodChange={handlePeriodChange}
      onMinLevelChange={handleMinLevelChange}
      onMaxLevelChange={handleMaxLevelChange}
      onPhChange={showPhFilter ? handlePhChange : () => undefined}
      onMatchmakingChange={() => undefined}
      onWarriorToggle={handleWarriorToggle}
    />
  );
  const toolbar = (
    <HeadToHeadFilterToolbar
      characterId={currentCharacterId}
      isMobile={isMobile}
      matchmaking={matchmaking}
      maxLevel={maxLevel}
      minLevel={minLevel}
      onCharacterChange={handleCharacterChange}
      onMatchmakingChange={() => undefined}
      onMaxLevelChange={handleMaxLevelChange}
      onMinLevelChange={handleMinLevelChange}
      onMobileFiltersOpen={() => setIsMobileFiltersOpen(true)}
      onPeriodChange={handlePeriodChange}
      onPhChange={showPhFilter ? handlePhChange : () => undefined}
      onWarriorToggle={handleWarriorToggle}
      period={period}
      ph={ph}
      selectedWarriors={selectedWarriors}
      showMatchmakingFilter={false}
      showPhFilter={showPhFilter}
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

  const renderResults = () => {
    if (isLoading) {
      return <TableRowsSkeleton trailingColumns={trailingSkeletonColumns} />;
    }
    if (isError) {
      return (
        <BattlePanelEmptyState
          icon={AlertCircle}
          title={t("battlePanel.statistics.empty.errorTitle")}
          description={
            getRouteErrorMessage(error) ??
            t("common.routeErrors.status.500.description")
          }
        />
      );
    }
    if (!data || data.records.length === 0) {
      return (
        <BattlePanelEmptyState
          icon={SearchX}
          title={t(emptyTitleKey)}
          description={t(emptyDescriptionKey)}
        />
      );
    }
    if (isMobile) {
      return (
        <div className="grid gap-2 p-3">
          {data.records.map((record) => (
            <BattlePanelH2hCard
              key={record.opponentId}
              record={record}
              showRatingDelta={showRatingDelta}
              onOpen={handleRowClick}
            />
          ))}
        </div>
      );
    }
    return (
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
              getBattleResultRowClassName(row.original.lastBattleResult),
            ),
            onClick: () => handleRowClick(row.original.opponentId),
            onKeyDown: (event) =>
              handleRowKeyDown(event, row.original.opponentId),
            role: "link",
            tabIndex: 0,
          })}
        />
      </Table>
    );
  };

  return (
    <>
      {isMobile && (
        <MobileFiltersDrawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          trigger={null}
          childrenClassName="p-0"
          title={t("battlePanel.filters.headToHeadTitle")}
        >
          {filtersContent}
        </MobileFiltersDrawer>
      )}

      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="px-3 pb-0 pt-3">
          <SectionHeader
            icon={Swords}
            title={t(titleKey)}
            subtitle={t(subtitleKey)}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <BattlePanelResultsSurface
            chips={activeFilterChips}
            clearFiltersLabel={t("battlePanel.filters.clear")}
            footer={paginationFooter}
            onClearFilters={() => applyFilterState(getResetHeadToHeadFilters())}
            toolbar={toolbar}
            withHorizontalScroll={!isMobile}
          >
            {renderResults()}
          </BattlePanelResultsSurface>
        </div>
      </div>
    </>
  );
}
