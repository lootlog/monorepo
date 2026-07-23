import { PlayerTile } from "@/components/battle";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { PeriodSelector } from "@/components/filters/period-selector";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import {
  buildPlayerVsPlayerFilterLabels,
  getResetPlayerVsPlayerFilters,
  removePlayerVsPlayerFilter,
} from "@/features/user/battle-panel/components/battle-panel-active-filter-helpers";
import { getPlayerVsPlayerBattleResult } from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { BattlePanelMobileFiltersDrawer } from "@/features/user/battle-panel/components/battle-panel-mobile-filters-drawer";
import { BattlePanelPaginationFooter } from "@/features/user/battle-panel/components/battle-panel-pagination-footer";
import { BattlePanelPvpBattleCard } from "@/features/user/battle-panel/components/battle-panel-pvp-battle-card";
import { BattlePanelResultsSurface } from "@/features/user/battle-panel/components/battle-panel-results-surface";
import { getBattleResultRowClassName } from "@/features/user/battle-panel/components/battle-result-status";
import {
  battlePanelPlayerVsPlayerSearchParsers,
  getBattlePanelPageIndex,
  getNextBattlePanelPage,
  getPreviousBattlePanelPage,
  normalizeBattlePanelCharacterId,
  resetBattlePanelCursorPagination,
  type Period,
} from "@/features/user/battle-panel/battle-panel-search";
import { useBattlesControllerGetPlayerVsPlayerBattles } from "@lootlog/api-client/react-query/battlelog/battles";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { Card } from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import { Separator } from "@lootlog/ui/components/separator";
import { Table } from "@lootlog/ui/components/table";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { cn } from "@lootlog/ui/lib/utils";
import { useNavigate, useParams } from "@tanstack/react-router";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AlertCircle, ArrowRight, SearchX, Swords } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { playerVsPlayerColumns } from "./components/player-vs-player-columns";
import { PlayerVsPlayerFilterToolbar } from "./components/player-vs-player-filter-toolbar";

export function PlayerVsPlayerFullPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const params = useParams({ strict: false }) as {
    myId?: string;
    opponentId?: string;
  };

  const opponentId = params.opponentId ?? params.myId;
  const [queryState, setQueryState] = useQueryStates(
    battlePanelPlayerVsPlayerSearchParsers,
  );
  const pageIndex = getBattlePanelPageIndex(queryState.page);
  const currentCharacterId =
    normalizeBattlePanelCharacterId(queryState.characterId) ?? params.myId;
  const period = queryState.period ?? "30d";
  const minLevel = queryState.minLevel;
  const maxLevel = queryState.maxLevel;
  const startDate = queryState.startDate ?? undefined;
  const endDate = queryState.endDate ?? undefined;
  const ph = queryState.ph ?? undefined;
  const matchmaking = queryState.matchmaking ?? undefined;
  const cursor = queryState.cursor ?? undefined;
  const pageSize = 20;

  const applyFilterState = ({
    matchmaking: nextMatchmaking,
    maxLevel: nextMaxLevel,
    minLevel: nextMinLevel,
    period: nextPeriod,
    ph: nextPh,
  }: {
    matchmaking?: boolean;
    maxLevel?: number;
    minLevel?: number;
    period: Period;
    ph?: boolean;
  }) => {
    void setQueryState({
      ...resetBattlePanelCursorPagination(),
      period: nextPeriod,
      minLevel: nextMinLevel ?? 1,
      maxLevel: nextMaxLevel ?? 500,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      ph: nextPh ?? null,
      matchmaking: nextMatchmaking ?? null,
    });
  };

  const handlePeriodChange = (newPeriod: Period) => {
    applyFilterState({
      period: newPeriod,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    applyFilterState({
      period,
      minLevel: value,
      maxLevel,
      ph,
      matchmaking,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    applyFilterState({
      period,
      minLevel,
      maxLevel: value,
      ph,
      matchmaking,
    });
  };

  const { data, isLoading, isError, error } =
    useBattlesControllerGetPlayerVsPlayerBattles({
      cursor,
      size: pageSize,
      characterId: currentCharacterId ?? params.myId,
      period,
      startDate,
      endDate,
      opponentId: opponentId ?? "",
      minLevel,
      maxLevel,
      ph,
      matchmaking,
      includeTotal: true,
    });

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

  const handleBattleOpen = (battleId: string) => {
    void navigate({
      to: "/@me/battle-panel/battles/$battleId",
      params: { battleId },
    });
  };

  const handleBattleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    battleId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleBattleOpen(battleId);
  };

  const opponentName =
    data?.battles[0]?.opponentWarrior.name ??
    t("battlePanel.statistics.playerVsPlayer.opponentFallback");
  const myCharacter = data?.battles[0]?.userWarrior;

  const table = useReactTable({
    data: data?.battles ?? [],
    columns: playerVsPlayerColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const filterState = {
    period,
    minLevel,
    maxLevel,
    ph,
    matchmaking,
  };
  const activeFilterChips = buildPlayerVsPlayerFilterLabels({
    ...filterState,
    translate: t,
  }).map((chip) => ({
    ...chip,
    onRemove: () =>
      applyFilterState(removePlayerVsPlayerFilter(filterState, chip.id)),
  }));

  const handleClearFilters = () => {
    applyFilterState(getResetPlayerVsPlayerFilters());
  };

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
            separator={
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            }
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
      totalCount={data?.pagination?.total ?? 0}
      visibleCount={data?.battles.length ?? 0}
    />
  );

  return (
    <>
      {isMobile && (
        <BattlePanelMobileFiltersDrawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          contentClassName="p-0"
          title={t("battlePanel.filters.title")}
        >
          {filtersContent}
        </BattlePanelMobileFiltersDrawer>
      )}

      <div className="flex h-full w-full flex-col overflow-hidden bg-background/50">
        <div className="px-3 pb-0 pt-3">
          <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {myCharacter ? (
                <PlayerTile
                  player={{
                    name: myCharacter.name,
                    lvl: myCharacter.lvl,
                    prof: myCharacter.prof,
                    icon: myCharacter.icon,
                  }}
                />
              ) : (
                <div className="rounded-lg bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                  <Swords className="size-4 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-tight">
                  {myCharacter?.name ??
                    t(
                      "battlePanel.statistics.playerVsPlayer.characterFallback",
                    )}{" "}
                  {t("battleUi.overview.vs")} {opponentName}
                </h2>
                {myCharacter && (
                  <p className="text-xs text-muted-foreground">
                    {t("battlePanel.statistics.playerVsPlayer.subtitle", {
                      level: myCharacter.lvl,
                    })}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
            <BattlePanelResultsSurface
              chips={activeFilterChips}
              clearFiltersLabel={t("battlePanel.filters.clear")}
              footer={paginationFooter}
              onClearFilters={handleClearFilters}
              toolbar={toolbar}
              withHorizontalScroll={!isMobile}
            >
              {isLoading ? (
                <TableRowsSkeleton />
              ) : isError ? (
                <BattlePanelEmptyState
                  icon={AlertCircle}
                  title={t("battlePanel.statistics.empty.errorTitle")}
                  description={
                    getRouteErrorMessage(error) ??
                    t("common.routeErrors.status.500.description")
                  }
                />
              ) : !data || data.battles.length === 0 ? (
                <BattlePanelEmptyState
                  icon={SearchX}
                  title={t("battlePanel.statistics.playerVsPlayer.emptyTitle")}
                  description={t(
                    "battlePanel.statistics.playerVsPlayer.emptyDescription",
                  )}
                />
              ) : isMobile ? (
                <div className="grid gap-2 p-3">
                  {data.battles.map((battle) => (
                    <BattlePanelPvpBattleCard
                      key={battle.battleId}
                      battle={battle}
                      onBattleClick={handleBattleOpen}
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
              )}
            </BattlePanelResultsSurface>
          </div>
        </div>
      </div>
    </>
  );
}
