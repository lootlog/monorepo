import { PlayerTile } from "@/components/battle";
import { PageHeader } from "@/components/common/page-header";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { PeriodSelector } from "@/components/filters/period-selector";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { getPlayerVsPlayerBattleResult } from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelPvpBattleCard } from "@/features/user/battle-panel/components/battle-panel-pvp-battle-card";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import { getBattleResultRowClassName } from "@/features/user/battle-panel/components/battle-result-row-class-name";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { Label } from "@lootlog/ui/components/label";
import { Separator } from "@lootlog/ui/components/separator";
import { Table } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { AlertCircle, ArrowRight, SearchX, Swords } from "lucide-react";
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
        <div className="flex items-center gap-2">
          <LevelRangeFilter
            minLevel={minLevel}
            maxLevel={maxLevel}
            onMinLevelChange={handleMinLevelChange}
            onMaxLevelChange={handleMaxLevelChange}
            inputClassName="w-full"
            containerClassName="flex-1"
            separator=<ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          />
        </div>
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
      return <TableRowsSkeleton />;
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
    if (!data || data.battles.length === 0) {
      return (
        <BattlePanelEmptyState
          icon={SearchX}
          title={t("battlePanel.statistics.playerVsPlayer.emptyTitle")}
          description={t(
            "battlePanel.statistics.playerVsPlayer.emptyDescription",
          )}
        />
      );
    }
    if (isMobile) {
      return (
        <div className="grid gap-2 p-3">
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
          className="sticky top-0 z-10 bg-background"
          rowClassName="border-b-1! border-border"
          headClassName="whitespace-nowrap"
        />
        <TanStackTableBody
          table={table}
          cellClassName="whitespace-nowrap align-middle"
          getRowProps={(row) => ({
            className: cn(
              "h-14 cursor-pointer border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
              getBattleResultRowClassName(
                getPlayerVsPlayerBattleResult(row.original),
              ),
            ),
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

      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="px-3 pb-0 pt-3">
          <PageHeader
            icon={Swords}
            title={
              <>
                {myCharacter?.name ??
                  t(
                    "battlePanel.statistics.playerVsPlayer.characterFallback",
                  )}{" "}
                {t("battleUi.overview.vs")} {opponentName}
              </>
            }
            description={
              myCharacter
                ? t("battlePanel.statistics.playerVsPlayer.subtitle", {
                    level: myCharacter.lvl,
                  })
                : undefined
            }
            metadata={
              myCharacter ? (
                <PlayerTile
                  player={{
                    name: myCharacter.name,
                    lvl: myCharacter.lvl,
                    prof: myCharacter.prof,
                    icon: myCharacter.icon,
                  }}
                />
              ) : undefined
            }
          />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
            <BattlePanelResultsSurface
              title={t("battlePanel.navigation.battles")}
              chips={activeFilterChips}
              clearFiltersLabel={t("battlePanel.filters.clear")}
              footer={paginationFooter}
              onClearFilters={handleClearFilters}
              toolbar={toolbar}
              withHorizontalScroll={!isMobile}
            >
              {renderResults()}
            </BattlePanelResultsSurface>
          </div>
        </div>
      </div>
    </>
  );
}
