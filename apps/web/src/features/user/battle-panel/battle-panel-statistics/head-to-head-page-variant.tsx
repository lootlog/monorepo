import {
  FILTERED_TABLE_HEADER_CLASS,
  RESULTS_TABLE_MEDIA_QUERY,
} from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import { BattleCharacterSelect } from "@/features/user/battle-panel/components/battle-character-select";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { getResetHeadToHeadFilters } from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { BattlePanelH2hCard } from "@/features/user/battle-panel/components/battle-panel-h2h-card";
import { BattlePanelH2hCardSkeleton } from "@/features/user/battle-panel/components/battle-panel-h2h-card-skeleton";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { ResultsSurface } from "@/components/common/results-surface";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { Table } from "@lootlog/ui/components/table";
import { AlertCircle, SearchX } from "lucide-react";
import { StatisticsFilterToolbar } from "./components/statistics-filter-toolbar";
import { StatisticsStackedFilters } from "./components/statistics-stacked-filters";
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
  titleKey,
  trailingSkeletonColumns,
  season,
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
    activeFilterChips,
    applyFilterState,
  } = useHeadToHeadPage({ columns, matchmaking, showPhFilter, season });

  const filterProps = {
    period,
    onPeriodChange: handlePeriodChange,
    minLevel,
    maxLevel,
    onMinLevelChange: handleMinLevelChange,
    onMaxLevelChange: handleMaxLevelChange,
    ph,
    onPhChange: showPhFilter ? handlePhChange : undefined,
  };

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

  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  const renderResults = () => {
    if (isLoading) {
      return (
        <TableRowsSkeleton
          withHeader
          trailingColumns={trailingSkeletonColumns}
          rowContent="text"
          mobileList={
            <CardListSkeleton
              card={
                <BattlePanelH2hCardSkeleton withRatingDelta={showRatingDelta} />
              }
            />
          }
        />
      );
    }

    if (isError) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={AlertCircle}
            title={t("battlePanel.statistics.empty.errorTitle")}
            description={
              getRouteErrorMessage(error) ??
              t("common.routeErrors.status.500.description")
            }
          />
        </div>
      );
    }

    if (!data || data.records.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={SearchX}
            title={t(emptyTitleKey)}
            description={t(emptyDescriptionKey)}
          />
        </div>
      );
    }

    if (!usesTable) {
      return (
        <div>
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
          className={FILTERED_TABLE_HEADER_CLASS}
          rowClassName="border-b-1! border-border"
          headClassName="whitespace-nowrap"
        />
        <TanStackTableBody
          table={table}
          cellClassName="whitespace-nowrap"
          getRowProps={(row) => ({
            className:
              "h-14 cursor-pointer border-b border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
      {/* A season's page is named after the season. */}
      {!season && <h1 className="sr-only">{t(titleKey)}</h1>}
      <ResultsSurface
        search={
          // As on the kill statistics: the search, then the character.
          <>
            <WarriorSearchFilter
              selectedWarriors={selectedWarriors}
              onWarriorToggle={handleWarriorToggle}
              placeholder={t("battlePanel.filters.searchOpponent")}
            />
            {!season && (
              <BattleCharacterSelect
                characterId={currentCharacterId}
                onCharacterChange={handleCharacterChange}
                allowAllCharacters
              />
            )}
          </>
        }
        // A season has no filters beyond the opponent search.
        filters={!season && <StatisticsFilterToolbar {...filterProps} />}
        stackedFilters={
          season ? undefined : <StatisticsStackedFilters {...filterProps} />
        }
        filtersLabel={t("battlePanel.filters.title")}
        chips={activeFilterChips}
        clearFiltersLabel={t("battlePanel.filters.clear")}
        onClearFilters={() => applyFilterState(getResetHeadToHeadFilters())}
        scrollResetKey={pageIndex}
        footer={paginationFooter}
      >
        {renderResults()}
      </ResultsSurface>
    </>
  );
}
