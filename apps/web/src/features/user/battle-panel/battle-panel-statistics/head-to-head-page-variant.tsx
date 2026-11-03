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
import { AlertCircle, SearchX, Swords } from "lucide-react";
import { StatisticsFilterToolbar } from "./components/statistics-filter-toolbar";
import { StatisticsStackedFilters } from "./components/statistics-stacked-filters";
import {
  useHeadToHeadPage,
  type HeadToHeadPageVariantProps,
} from "./use-head-to-head-page";
import { RetryButton } from "@/components/common/retry-button";
import { TableRowLinkCell } from "@/components/common/table-row-link-cell";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";

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
    isFetching,
    refetch,
    getOpponentLink,
    table,
    activeFilterChips,
    applyFilterState,
  } = useHeadToHeadPage({ columns, matchmaking, showPhFilter, season });

  const clearFilters = () => applyFilterState(getResetHeadToHeadFilters());

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
          rows={pageSize}
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
            action={
              <RetryButton onRetry={() => refetch()} isRetrying={isFetching} />
            }
          />
        </div>
      );
    }

    if (!data || data.records.length === 0) {
      return (
        <div className="p-3">
          {activeFilterChips.length > 0 ? (
            <EmptyState
              fill
              icon={SearchX}
              title={t("battlePanel.statistics.noResults")}
              description={t("battlePanel.statistics.noResultsDescription")}
              action={<ClearFiltersButton onClear={clearFilters} />}
            />
          ) : (
            <EmptyState
              fill
              icon={Swords}
              title={t(emptyTitleKey)}
              description={t(emptyDescriptionKey)}
            />
          )}
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
              link={getOpponentLink(record.opponentId)}
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
          rowClassName="h-14 border-b border-border hover:bg-muted/40"
          cellClassName="relative whitespace-nowrap"
          renderCellContent={(cell, content) => {
            const link = getOpponentLink(cell.row.original.opponentId);

            return link ? (
              <TableRowLinkCell
                link={link}
                primary={cell.column.id === "opponentName"}
              >
                {content}
              </TableRowLinkCell>
            ) : (
              content
            );
          }}
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
            {/* Rows open one character's head-to-head, so one is always picked. */}
            {!season && (
              <BattleCharacterSelect
                characterId={currentCharacterId}
                onCharacterChange={handleCharacterChange}
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
        onClearFilters={clearFilters}
        scrollResetKey={pageIndex}
        footer={paginationFooter}
      >
        {renderResults()}
      </ResultsSurface>
    </>
  );
}
