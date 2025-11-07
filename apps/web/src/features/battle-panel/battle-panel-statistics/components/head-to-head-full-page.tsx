import { useState } from "react";
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
import { Card, CardContent } from "@lootlog/ui/components/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Input } from "@lootlog/ui/components/input";
import { Button } from "@lootlog/ui/components/button";
import { Search, ArrowUpDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { getProfessionName } from "@/lib/utils/professions";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import {
  useHeadToHead,
  type HeadToHeadRecord,
} from "@/hooks/api/battle-log/use-head-to-head";
import { Spinner } from "@lootlog/ui/components/spinner";

type Period = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d" | "all";
type SortBy = "wins" | "losses" | "totalBattles" | "winRate" | "lastBattleDate";

export function HeadToHeadFullPage() {
  const [characterId, setCharacterId] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<Period>("30d");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalBattles", desc: true },
  ]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: characters } = useBattleCharacters();

  const sortBy = (sorting[0]?.id || "totalBattles") as SortBy;
  const sortOrder = sorting[0]?.desc ? "desc" : "asc";

  const { data, isLoading } = useHeadToHead({
    cursor,
    size: 20,
    sortBy,
    sortOrder,
    characterId,
    period,
    search: search || undefined,
    includeTotal: true,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setCursor(undefined);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleNextPage = () => {
    if (data?.pagination.nextCursor) {
      setCursor(data.pagination.nextCursor);
    }
  };

  const handlePreviousPage = () => {
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
    <div className="p-4 h-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Pełny bilans bezpośrednich starć</h1>
        <p className="text-muted-foreground">
          Kompletna historia walk z konkretnymi przeciwnikami
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="flex gap-2">
            <Input
              placeholder="Szukaj przeciwnika..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <Button onClick={handleSearch} variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Select
          value={characterId || "all"}
          onValueChange={(value) => {
            setCharacterId(value === "all" ? undefined : value);
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-full md:w-[240px]">
            <SelectValue placeholder="Wszystkie postacie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie postacie</SelectItem>
            {characters?.map((char) => (
              <SelectItem key={char.id} value={char.id}>
                {char.name} ({char.world})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={period}
          onValueChange={(value) => {
            setPeriod(value as Period);
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Ostatnie 24h</SelectItem>
            <SelectItem value="3d">Ostatnie 3 dni</SelectItem>
            <SelectItem value="7d">Ostatnie 7 dni</SelectItem>
            <SelectItem value="14d">Ostatnie 14 dni</SelectItem>
            <SelectItem value="30d">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90d">Ostatnie 90 dni</SelectItem>
            <SelectItem value="180d">Ostatnie 180 dni</SelectItem>
            <SelectItem value="all">Cały czas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0 h-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
              <Spinner className="size-8" />
              <p className="text-sm text-muted-foreground">
                Ładowanie danych...
              </p>
            </div>
          ) : !data || data.records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
              <p className="text-muted-foreground">
                Brak danych do wyświetlenia
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto min-h-0">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
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
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
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
              </div>

              {data.pagination &&
                (data.pagination.hasNext || data.pagination.hasPrev) && (
                  <div className="sticky bottom-0 bg-background border-t py-4 flex items-center justify-between px-4">
                    <div className="text-sm text-muted-foreground">
                      {data.pagination.total && (
                        <span>Łącznie rekordów: {data.pagination.total}</span>
                      )}
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={handlePreviousPage}
                            className={
                              !data.pagination.hasPrev
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handleNextPage}
                            className={
                              !data.pagination.hasNext
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
