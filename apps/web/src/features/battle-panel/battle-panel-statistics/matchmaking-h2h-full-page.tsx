import { useState, useEffect, useCallback } from "react";
import {
  useBattleFiltersStore,
  type Period,
} from "@/store/battle-filters.store";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
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
import { Spinner } from "@lootlog/ui/components/spinner";
import { Swords } from "lucide-react";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import { HeadToHeadFilters } from "./components/head-to-head-filters";
import { matchmakingH2HColumns } from "./components/matchmaking-h2h-columns";
import { cn } from "@lootlog/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";

type SortBy =
  | "wins"
  | "losses"
  | "totalBattles"
  | "winRate"
  | "lastBattleDate"
  | "totalRatingDelta"
  | "avgRatingDelta";

export function MatchmakingH2HFullPage() {
  const navigate = useNavigate();
  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );
  const setCurrentCharacterId = useBattleFiltersStore(
    (state) => state.setCurrentCharacterId,
  );

  const filterPeriod = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).period,
  );
  const minLevel = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).minLevel,
  );
  const maxLevel = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).maxLevel,
  );

  const [selectedWarriors, setSelectedWarriors] = useState<Warrior[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalBattles", desc: true },
  ]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const period = filterPeriod || "30d";

  const handleRowClick = (opponentId: string) => {
    if (!currentCharacterId) return;
    navigate({
      to: ROUTES.user.battlePanel.playerVsPlayer(
        currentCharacterId,
        opponentId,
      ),
    });
  };

  const sortBy = (sorting[0]?.id || "totalBattles") as SortBy;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  useEffect(() => {
    setCursor(undefined);
  }, [minLevel, maxLevel]);

  const { data, isLoading } = useHeadToHead({
    cursor,
    size: 20,
    sortBy,
    sortOrder,
    characterId: currentCharacterId,
    period,
    search: selectedWarriors[0]?.name,
    minLevel,
    maxLevel,
    matchmaking: true,
    includeTotal: true,
  });

  const handleWarriorToggle = (warrior: Warrior) => {
    setSelectedWarriors((prev) => {
      const isSelected = prev.some((w) => w.name === warrior.name);
      if (isSelected) {
        return prev.filter((w) => w.name !== warrior.name);
      }
      return [warrior];
    });
    setCursor(undefined);
  };

  const handleNextPage = () => {
    if (data?.pagination.nextCursor) {
      setCursor(data.pagination.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (data?.pagination.previousCursor) {
      setCursor(data.pagination.previousCursor);
    }
  };

  const handlePeriodChange = (value: Period) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { period: value });
    setCursor(undefined);
  };

  const handleCharacterChange = useCallback(
    (id: string | undefined) => {
      setCurrentCharacterId(id);
      setCursor(undefined);
    },
    [setCurrentCharacterId],
  );

  const handleMinLevelChange = useCallback((value: number | undefined) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { minLevel: value });
    setCursor(undefined);
  }, []);

  const handleMaxLevelChange = useCallback((value: number | undefined) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { maxLevel: value });
    setCursor(undefined);
  }, []);

  const table = useReactTable({
    data: data?.records || [],
    columns: matchmakingH2HColumns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setCursor(undefined);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <SectionHeader
            icon={Swords}
            title="Pełny bilans starć w Otchłani"
            subtitle="Kompletna historia walk rankingowych z konkretnymi przeciwnikami"
          >
            <HeadToHeadFilters
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
          </SectionHeader>

          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
            <ScrollArea className={cn("relative flex-1 min-h-0 w-full")}>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : !data || data.records.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
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
                        className="bg-background/30 cursor-pointer hover:bg-muted/50 border-b border-border"
                        onClick={() => handleRowClick(row.original.opponentId)}
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
