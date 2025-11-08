import { useState, useEffect } from "react";
import {
  useBattleFiltersStore,
  type Period,
} from "@/store/battle-filters.store";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
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
import { Button } from "@lootlog/ui/components/button";
import { ArrowUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { getProfessionName } from "@/lib/utils/professions";
import {
  useHeadToHead,
  type HeadToHeadRecord,
} from "@/hooks/api/battle-log/use-head-to-head";
import { Spinner } from "@lootlog/ui/components/spinner";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import { HeadToHeadFilters } from "./head-to-head-filters";

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

  const columns: ColumnDef<HeadToHeadRecord>[] = [
    {
      id: "avatar",
      header: "",
      cell: ({ row }) => (
        <PlayerTile
          player={{
            name: row.original.opponentName,
            lvl: row.original.opponentLvl,
            prof: row.original.opponentProf,
            icon: row.original.opponentIcon,
          }}
          className="scale-75"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "opponentName",
      header: "Nazwa",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.opponentName}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "opponentLvl",
      header: () => <div className="text-center">Poziom</div>,
      cell: ({ row }) => (
        <div className="text-center">{row.original.opponentLvl}</div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "opponentProf",
      header: () => <div className="text-center">Profesja</div>,
      cell: ({ row }) => (
        <div className="text-center">
          {getProfessionName(row.original.opponentProf)}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "wins",
      header: ({ column }) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            Wygrane
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-green-600 font-medium">
            {row.original.wins}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "losses",
      header: ({ column }) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            Przegrane
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-red-600 font-medium">
            {row.original.losses}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "totalBattles",
      header: ({ column }) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            Łącznie
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.original.totalBattles}
        </div>
      ),
    },
    {
      accessorKey: "winRate",
      header: ({ column }) => (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            Win %
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={
              row.original.winRate >= 50
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }
          >
            {row.original.winRate.toFixed(1)}%
          </span>
        </div>
      ),
    },
    {
      accessorKey: "lastBattleDate",
      header: ({ column }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8"
          >
            Ostatnia walka
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.lastBattleDate), {
            addSuffix: true,
            locale: pl,
          })}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.records || [],
    columns,
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
        selectedWarriors={selectedWarriors}
        onCharacterChange={(id) => {
          setCurrentCharacterId(id);
          setCursor(undefined);
        }}
        onPeriodChange={handlePeriodChange}
        onMinLevelChange={(value) => {
          const currentId = useBattleFiltersStore.getState().currentCharacterId;
          useBattleFiltersStore
            .getState()
            .updateFilters(currentId, { minLevel: value });
          setCursor(undefined);
        }}
        onMaxLevelChange={(value) => {
          const currentId = useBattleFiltersStore.getState().currentCharacterId;
          useBattleFiltersStore
            .getState()
            .updateFilters(currentId, { maxLevel: value });
          setCursor(undefined);
        }}
        onWarriorToggle={handleWarriorToggle}
      />

      <div className="flex-1 overflow-auto min-h-0">
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
      </div>

      <div className="h-14 shrink-0 bg-background border-t py-4 flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground">
          {data?.pagination?.total && (
            <span>Łącznie rekordów: {data.pagination.total}</span>
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
    </div>
  );
}
