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
import { useHeadToHead } from "@/hooks/api/battle-log/use-head-to-head";
import { Spinner } from "@lootlog/ui/components/spinner";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import { HeadToHeadFilters } from "./head-to-head-filters";
import { headToHeadColumns } from "./head-to-head-columns";
import { cn } from "@lootlog/ui/lib/utils";

type SortBy = "wins" | "losses" | "totalBattles" | "winRate" | "lastBattleDate";

export function HeadToHeadFullPage() {
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
  const ph = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).ph,
  );
  const matchmaking = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).matchmaking,
  );

  const [period, setPeriod] = useState<Period>(filterPeriod || "30d");
  const [selectedWarriors, setSelectedWarriors] = useState<Warrior[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalBattles", desc: true },
  ]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const sortBy = (sorting[0]?.id || "totalBattles") as SortBy;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  useEffect(() => {
    setPeriod(filterPeriod || "30d");
  }, [currentCharacterId, filterPeriod]);

  useEffect(() => {
    setCursor(undefined);
  }, [minLevel, maxLevel, ph, matchmaking]);

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
    ph,
    matchmaking,
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
    setPeriod(value);
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

  const handlePhChange = useCallback((value: boolean) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore.getState().updateFilters(currentId, { ph: value });
    setCursor(undefined);
  }, []);

  const handleMatchmakingChange = useCallback((value: boolean) => {
    const currentId = useBattleFiltersStore.getState().currentCharacterId;
    useBattleFiltersStore
      .getState()
      .updateFilters(currentId, { matchmaking: value });
    setCursor(undefined);
  }, []);

  const table = useReactTable({
    data: data?.records || [],
    columns: headToHeadColumns,
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
    <div className="h-full flex flex-col">
      <div className="p-4 pb-0 bg-background">
        <h1 className="text-xl font-bold">Pełny bilans bezpośrednich starć</h1>
        <p className="text-muted-foreground">
          Kompletna historia walk z konkretnymi przeciwnikami
        </p>
      </div>

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

      <ScrollArea className={cn("max-w-full flex-1 w-full")}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">Ładowanie danych...</p>
          </div>
        ) : !data || data.records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
            <p className="text-muted-foreground">Brak danych do wyświetlenia</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
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
                <TableRow key={row.id} className="bg-background/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
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

      <div className="h-14 shrink-0 bg-background border-t py-4 flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Łącznie:&nbsp;
          {data?.pagination?.total && <span>{data.pagination.total}</span>}
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
    </div>
  );
}
