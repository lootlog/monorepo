import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { SectionHeader } from "@/components/layout/section-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { getResetHeadToHeadFilters } from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { BattlePanelH2hCard } from "@/features/user/battle-panel/components/battle-panel-h2h-card";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import { getBattleResultRowClassName } from "@/features/user/battle-panel/components/battle-result-row-class-name";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { Table } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { AlertCircle, SearchX, Swords } from "lucide-react";
import { HeadToHeadFilterToolbar } from "./components/head-to-head-filter-toolbar";
import { HeadToHeadFiltersPanel } from "./components/head-to-head-filters-panel";
import {
  useHeadToHeadPage,
  type HeadToHeadPageVariantProps,
} from "./use-head-to-head-page";

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
  const {
    currentCharacterId,
    period,
    minLevel,
    maxLevel,
    ph,
    selectedWarriors,
    handleCharacterChange,
    handlePeriodChange,
    handleMinLevelChange,
    handleMaxLevelChange,
    handlePhChange,
    handleWarriorToggle,
    isMobile,
    setIsMobileFiltersOpen,
    data,
    t,
    handlePreviousPage,
    handleNextPage,
    pageIndex,
    pageSize,
    isLoading,
    isError,
    error,
    handleRowClick,
    table,
    handleRowKeyDown,
    isMobileFiltersOpen,
    activeFilterChips,
    applyFilterState,
  } = useHeadToHeadPage({ columns, matchmaking, showPhFilter });
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
            title={t(titleKey)}
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
