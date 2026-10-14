import { DetailPage } from "@/components/common/detail-page";
import { FILTERED_TABLE_HEADER_CLASS } from "@/components/common/page-sticky-table-header";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { PeriodSelector } from "@/components/filters/period-selector";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { EmptyState } from "@/components/common/empty-state";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelPvpBattleCard } from "@/features/user/battle-panel/components/battle-panel-pvp-battle-card";
import { BattlePanelPvpBattleCardSkeleton } from "@/features/user/battle-panel/components/battle-panel-pvp-battle-card-skeleton";
import { ResultsSurface } from "@/components/common/results-surface";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { Label } from "@lootlog/ui/components/label";
import { Separator } from "@lootlog/ui/components/separator";
import { Table } from "@lootlog/ui/components/table";
import { AlertCircle, SearchX } from "lucide-react";
import { usePlayerVsPlayerPage } from "./use-player-vs-player-page";

import { PlayerVsPlayerFilterToolbar } from "./components/player-vs-player-filter-toolbar";

export function PlayerVsPlayerFullPage() {
  const {
    t,
    period,
    handlePeriodChange,
    minLevel,
    maxLevel,
    handleMinLevelChange,
    handleMaxLevelChange,
    isMobile,
    setIsMobileFiltersOpen,
    data,
    handlePreviousPage,
    handleNextPage,
    pageIndex,
    pageSize,
    totalCount,
    visibleCount,
    isLoading,
    isError,
    error,
    handleBattleOpen,
    table,
    handleBattleRowKeyDown,
    isMobileFiltersOpen,
    myCharacter,
    opponentName,
    activeFilterChips,
    handleClearFilters,
  } = usePlayerVsPlayerPage();

  const filtersContent = (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.period")}
        </Label>
        <PeriodSelector
          value={period}
          onValueChange={handlePeriodChange}
          width="w-full"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.levelRange")}
        </Label>
        <LevelRangeFilter
          minLevel={minLevel}
          maxLevel={maxLevel}
          onMinLevelChange={handleMinLevelChange}
          onMaxLevelChange={handleMaxLevelChange}
        />
      </div>
    </div>
  );

  const toolbar = (
    <PlayerVsPlayerFilterToolbar
      isMobile={isMobile}
      maxLevel={maxLevel}
      minLevel={minLevel}
      onMaxLevelChange={handleMaxLevelChange}
      onMinLevelChange={handleMinLevelChange}
      onMobileFiltersOpen={() => setIsMobileFiltersOpen(true)}
      onPeriodChange={handlePeriodChange}
      period={period}
    />
  );

  const paginationFooter = (
    <BattlePanelPaginationFooter
      hasPrev={Boolean(data?.pagination?.hasPrev)}
      hasNext={Boolean(data?.pagination?.hasNext)}
      label={(range) => t("battlePanel.list.showingBattles", range)}
      onPreviousPage={handlePreviousPage}
      onNextPage={handleNextPage}
      pageIndex={pageIndex}
      pageSize={pageSize}
      totalCount={totalCount}
      visibleCount={visibleCount}
    />
  );

  const renderResults = () => {
    if (isLoading) {
      return (
        <TableRowsSkeleton
          withHeader
          rowContent="text"
          mobileList={
            <CardListSkeleton card={<BattlePanelPvpBattleCardSkeleton />} />
          }
        />
      );
    }

    if (isError) {
      return (
        <div className="p-3">
          <EmptyState
            framed
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

    if (!data || data.battles.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            framed
            icon={SearchX}
            title={t("battlePanel.statistics.playerVsPlayer.emptyTitle")}
            description={t(
              "battlePanel.statistics.playerVsPlayer.emptyDescription",
            )}
          />
        </div>
      );
    }

    if (isMobile) {
      return (
        <div>
          {data.battles.map((battle) => (
            <BattlePanelPvpBattleCard
              key={battle.battleId}
              battle={battle}
              onBattleClick={handleBattleOpen}
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
          cellClassName="whitespace-nowrap align-middle"
          getRowProps={(row) => ({
            className:
              "h-14 cursor-pointer border-b border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
            onClick: () => handleBattleOpen(row.original.battleId),
            onKeyDown: (event) =>
              handleBattleRowKeyDown(event, row.original.battleId),
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
          title={t("battlePanel.filters.title")}
        >
          {filtersContent}
        </MobileFiltersDrawer>
      )}

      <DetailPage
        name={`${myCharacter?.name ?? t("battlePanel.statistics.playerVsPlayer.characterFallback")} ${t("battleUi.overview.vs")} ${opponentName}`}
        meta={
          <span className="text-xs leading-tight text-muted-foreground">
            {isLoading ? (
              <SkeletonLine className="h-3 w-40" />
            ) : (
              myCharacter &&
              t("battlePanel.statistics.playerVsPlayer.subtitle", {
                level: myCharacter.lvl,
              })
            )}
          </span>
        }
      >
        <ResultsSurface
          filters={toolbar}
          filtersLabel={t("battlePanel.filters.title")}
          chips={activeFilterChips}
          clearFiltersLabel={t("battlePanel.filters.clear")}
          onClearFilters={handleClearFilters}
          scrollResetKey={pageIndex}
          footer={paginationFooter}
        >
          {renderResults()}
        </ResultsSurface>
      </DetailPage>
    </>
  );
}
