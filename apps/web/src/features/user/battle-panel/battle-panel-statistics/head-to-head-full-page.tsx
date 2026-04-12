import type { Period } from "@/store/battle-filters.store";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { SectionHeader } from "@/components/layout/section-header";
import { useHeadToHead } from "@/hooks/api/battle-log/use-head-to-head";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Swords } from "lucide-react";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import { HeadToHeadFilters } from "./components/head-to-head-filters";
import { headToHeadColumns } from "./components/head-to-head-columns";
import { cn } from "@lootlog/ui/lib/utils";
import { useQueryStates } from "nuqs";
import {
  battlePanelHeadToHeadSearchParsers,
  getSelectedWarriorsFromSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { useTranslation } from "react-i18next";
import { getRouteErrorMessage } from "@/lib/router/route-errors";

type SortBy = "wins" | "losses" | "totalBattles" | "winRate" | "lastBattleDate";

export function HeadToHeadFullPage() {
  const { t } = useTranslation();
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

  const { data, isLoading, isError, error } = useHeadToHead({
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
  });

  const handleWarriorToggle = (warrior: Warrior) => {
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
    data: data?.records ?? [],
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <SectionHeader
            icon={Swords}
            title={t("battlePanel.statistics.directMatchups.title")}
            subtitle={t("battlePanel.statistics.directMatchups.description")}
          >
            <HeadToHeadFilters
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
          </SectionHeader>

          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
            <ScrollArea className={cn("relative flex-1 min-h-0 w-full")}>
              {isLoading ? (
                <div>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex h-14 items-center gap-4 border-b border-border px-4"
                    >
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      {Array.from({ length: 4 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-12" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16">
                  <p className="text-muted-foreground">
                    {getRouteErrorMessage(error) ??
                      t("common.routeErrors.status.500.description")}
                  </p>
                </div>
              ) : !data || data.records.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16">
                  <p className="text-muted-foreground">
                    Brak danych do wyświetlenia
                  </p>
                </div>
              ) : (
                <Table className="border-b">
                  <TableHeader className="bg-background sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        className="border-b-1! border-border"
                      >
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="whitespace-nowrap"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="bg-background/30 border-b border-border"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="whitespace-nowrap"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Łącznie:&nbsp;
                {data?.pagination?.total && (
                  <span>{data.pagination.total}</span>
                )}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={handlePreviousPage}
                      className={
                        !data?.pagination?.hasPrev
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={handleNextPage}
                      className={
                        !data?.pagination?.hasNext
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
