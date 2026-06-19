import { useState, type KeyboardEvent } from "react";
import type { Period } from "@/store/battle-filters.store";
import {
  useReactTable,
  getCoreRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { SectionHeader } from "@/components/layout/section-header";
import { useBattlesControllerGetHeadToHead } from "@/lib/api/generated/battlelog/battles/battles";
import { AlertCircle, Filter, SearchX, Swords } from "lucide-react";
import type { SearchWarrior } from "@/lib/api/battlelog-types";
import { HeadToHeadFiltersPanel } from "./components/head-to-head-filters-panel";
import { headToHeadColumns } from "./components/head-to-head-columns";
import { useQueryStates } from "nuqs";
import {
  battlePanelHeadToHeadSearchParsers,
  getSelectedWarriorsFromSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { useTranslation } from "react-i18next";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { useNavigate } from "@tanstack/react-router";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";

type SortBy = "wins" | "losses" | "totalBattles" | "winRate" | "lastBattleDate";

const H2H_FILTERS_OPEN_KEY = "h2h-filters-open";

export function HeadToHeadFullPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    H2H_FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [queryState, setQueryState] = useQueryStates(
    battlePanelHeadToHeadSearchParsers,
  );
  const currentCharacterId = normalizeBattlePanelCharacterId(
    queryState.characterId,
  );
  const period = queryState.period ?? "30d";
  const minLevel = queryState.minLevel;
  const maxLevel = queryState.maxLevel;
  const ph = queryState.ph ?? undefined;
  const matchmaking = queryState.matchmaking ?? undefined;
  const cursor = queryState.cursor ?? undefined;
  const search = queryState.search ?? undefined;
  const sortBy = queryState.sortBy ?? "totalBattles";
  const sortOrder = queryState.sortOrder ?? "desc";
  const selectedWarriors = getSelectedWarriorsFromSearch(search);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

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
        ph,
        matchmaking,
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
      size: 20,
      sortBy,
      sortOrder,
      characterId: currentCharacterId,
      period,
      search,
      minLevel,
      maxLevel,
      ph,
      matchmaking,
      includeTotal: true,
    },
  );

  const handleWarriorToggle = (warrior: SearchWarrior) => {
    const isSelected = selectedWarriors.some(
      (item) => item.name === warrior.name,
    );
    const nextSelectedWarriors = isSelected
      ? selectedWarriors.filter((item) => item.name !== warrior.name)
      : [warrior];

    void setQueryState({
      search:
        nextSelectedWarriors.length > 0
          ? nextSelectedWarriors.map((item) => item.name).join(",")
          : null,
      cursor: null,
    });
  };

  const handleNextPage = () => {
    if (data?.pagination.nextCursor) {
      void setQueryState({ cursor: data.pagination.nextCursor });
    }
  };

  const handlePreviousPage = () => {
    if (data?.pagination.previousCursor) {
      void setQueryState({ cursor: data.pagination.previousCursor });
    }
  };

  const handlePeriodChange = (value: Period) => {
    void setQueryState({
      period: value,
      cursor: null,
    });
  };

  const handleCharacterChange = (id: string | undefined) => {
    void setQueryState({
      characterId: id ?? null,
      cursor: null,
    });
  };

  const handleMinLevelChange = (value: number | undefined) => {
    void setQueryState({
      minLevel: value ?? 1,
      cursor: null,
    });
  };

  const handleMaxLevelChange = (value: number | undefined) => {
    void setQueryState({
      maxLevel: value ?? 500,
      cursor: null,
    });
  };

  const handlePhChange = (value: boolean) => {
    void setQueryState({
      ph: value ? true : null,
      cursor: null,
    });
  };

  const handleMatchmakingChange = (value: boolean) => {
    void setQueryState({
      matchmaking: value ? true : null,
      cursor: null,
    });
  };

  const table = useReactTable({
    data: data?.records || [],
    columns: headToHeadColumns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      const nextSort = nextSorting[0];

      void setQueryState({
        sortBy: (nextSort?.id as SortBy | undefined) ?? "totalBattles",
        sortOrder: nextSort?.desc ? "desc" : "asc",
        cursor: null,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  const filtersContent = (
    <HeadToHeadFiltersPanel
      characterId={currentCharacterId}
      period={period}
      minLevel={minLevel}
      maxLevel={maxLevel}
      ph={ph}
      matchmaking={matchmaking}
      selectedWarriors={selectedWarriors}
      onCharacterChange={handleCharacterChange}
      onPeriodChange={handlePeriodChange}
      onMinLevelChange={handleMinLevelChange}
      onMaxLevelChange={handleMaxLevelChange}
      onPhChange={handlePhChange}
      onMatchmakingChange={handleMatchmakingChange}
      onWarriorToggle={handleWarriorToggle}
    />
  );

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileFiltersOpen}
          onOpenChange={setIsMobileFiltersOpen}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <DrawerTitle>
                {t("battlePanel.filters.headToHeadTitle")}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">{filtersContent}</ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden bg-background/50">
        <div className="px-3 pt-3 pb-0">
          <SectionHeader
            icon={Swords}
            title={t("battlePanel.statistics.directMatchups.title")}
            subtitle={t(
              "battlePanel.statistics.directMatchups.fullDescription",
            )}
            actions={
              !isMobile && (
                <Button
                  aria-label={t("battlePanel.filters.title")}
                  onClick={() => setIsFiltersOpen((prev) => !prev)}
                  variant={isFiltersOpen ? "default" : "outline"}
                  size="icon"
                  className="relative shrink-0"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )
            }
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-3">
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm gap-0">
              <ScrollArea className="relative flex-1 min-h-0 w-full">
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
                ) : !data || data.records.length === 0 ? (
                  <BattlePanelEmptyState
                    icon={SearchX}
                    title={t(
                      "battlePanel.statistics.directMatchups.emptyTitle",
                    )}
                    description={t(
                      "battlePanel.statistics.directMatchups.emptyDescription",
                    )}
                  />
                ) : (
                  <Table className="border-b">
                    <TanStackTableHeader
                      table={table}
                      className="bg-background sticky top-0 z-10"
                      rowClassName="border-b-1! border-border"
                      headClassName="whitespace-nowrap"
                    />
                    <TanStackTableBody
                      table={table}
                      cellClassName="whitespace-nowrap"
                      getRowProps={(row) => ({
                        className:
                          "bg-background/30 cursor-pointer hover:bg-muted/50 border-b border-border focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        onClick: () => handleRowClick(row.original.opponentId),
                        onKeyDown: (event) =>
                          handleRowKeyDown(event, row.original.opponentId),
                        role: "link",
                        tabIndex: 0,
                      })}
                    />
                  </Table>
                )}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TablePaginationFooter
                totalLabel={t("battlePanel.statistics.total", {
                  count: data?.pagination?.total ?? 0,
                })}
                hasPrev={Boolean(data?.pagination?.hasPrev)}
                hasNext={Boolean(data?.pagination?.hasNext)}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
              />
            </Card>
          </div>

          {!isMobile && isFiltersOpen && (
            <div className="overflow-hidden h-full shrink-0 w-[320px]">
              <div className="w-[320px] h-full flex flex-col shrink-0 bg-background/50 py-3 pr-3">
                <Card className="flex-1 flex flex-col min-h-0 bg-filters-sidebar border-border backdrop-blur-sm p-0">
                  <ScrollArea className="h-full">{filtersContent}</ScrollArea>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <Button
          aria-label={t("battlePanel.filters.title")}
          onClick={() => setIsMobileFiltersOpen(true)}
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20"
        >
          <Filter className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
