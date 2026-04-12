import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearch, useNavigate } from "@tanstack/react-router";
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
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { Skull } from "lucide-react";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  KillsFilters,
  type KillsFiltersState,
} from "./components/kills-filters";
import { createKillsColumns } from "./components/kills-columns";
import { useNpcKills } from "./hooks/use-npc-kills";
import type { NpcType } from "@/features/user/dashboard/hooks/use-dashboard-kill-stats";

type KillsSearchParams = {
  world?: string;
  npcType?: string;
  search?: string;
  cursor?: string;
  minLvl?: string;
  maxLvl?: string;
  sortBy?: string;
};

const ITEMS_PER_PAGE = 20;

export const KillsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as KillsSearchParams;

  const [searchInput, setSearchInput] = useState(searchParams.search ?? "");
  const debouncedSearch = useDebounce(searchInput, 500);
  const prevDebouncedSearch = useRef(debouncedSearch);

  const [minLvlInput, setMinLvlInput] = useState(searchParams.minLvl ?? "");
  const [maxLvlInput, setMaxLvlInput] = useState(searchParams.maxLvl ?? "");
  const debouncedMinLvl = useDebounce(minLvlInput, 500);
  const debouncedMaxLvl = useDebounce(maxLvlInput, 500);
  const prevDebouncedMinLvl = useRef(debouncedMinLvl);
  const prevDebouncedMaxLvl = useRef(debouncedMaxLvl);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalKills", desc: true },
  ]);

  const filters: KillsFiltersState = {
    world: searchParams.world,
    npcTypes: searchParams.npcType
      ? (searchParams.npcType.split(",") as NpcType[])
      : undefined,
    search: debouncedSearch || undefined,
    minLvl: debouncedMinLvl ? Number(debouncedMinLvl) : undefined,
    maxLvl: debouncedMaxLvl ? Number(debouncedMaxLvl) : undefined,
  };

  const cursor = searchParams.cursor ? Number(searchParams.cursor) : 0;
  const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";
  const sortBy =
    sorting[0]?.id === "npcLvl" ? "level" : ("kills" as "kills" | "level");

  const { data, isLoading } = useNpcKills({
    ...filters,
    cursor,
    limit: ITEMS_PER_PAGE,
    sortOrder,
    sortBy,
  });

  const updateSearchParams = (updates: Partial<KillsSearchParams>) => {
    const newParams = { ...searchParams, ...updates };

    const cleanParams = Object.fromEntries(
      Object.entries(newParams).filter(
        ([, value]) => value !== undefined && value !== "",
      ),
    );

    navigate({
      to: ".",
      search: cleanParams,
      replace: true,
    });
  };

  useEffect(() => {
    if (debouncedSearch !== prevDebouncedSearch.current) {
      prevDebouncedSearch.current = debouncedSearch;
      updateSearchParams({
        search: debouncedSearch || undefined,
        cursor: undefined,
      });
    }
  }, [debouncedSearch, updateSearchParams]);

  useEffect(() => {
    if (debouncedMinLvl !== prevDebouncedMinLvl.current) {
      prevDebouncedMinLvl.current = debouncedMinLvl;
      updateSearchParams({
        minLvl: debouncedMinLvl || undefined,
        cursor: undefined,
      });
    }
  }, [debouncedMinLvl, updateSearchParams]);

  useEffect(() => {
    if (debouncedMaxLvl !== prevDebouncedMaxLvl.current) {
      prevDebouncedMaxLvl.current = debouncedMaxLvl;
      updateSearchParams({
        maxLvl: debouncedMaxLvl || undefined,
        cursor: undefined,
      });
    }
  }, [debouncedMaxLvl, updateSearchParams]);

  const handleWorldChange = (world: string | undefined) => {
    updateSearchParams({ world, cursor: undefined });
  };

  const handleNpcTypeChange = (npcTypes: NpcType[] | undefined) => {
    updateSearchParams({
      npcType: npcTypes?.join(","),
      cursor: undefined,
    });
  };

  const handleSearchChange = (search: string) => {
    setSearchInput(search);
  };

  const handleMinLvlChange = (minLvl: string) => {
    setMinLvlInput(minLvl);
  };

  const handleMaxLvlChange = (maxLvl: string) => {
    setMaxLvlInput(maxLvl);
  };

  const handleNextPage = () => {
    if (data?.pagination.hasNext) {
      updateSearchParams({
        cursor: (cursor + ITEMS_PER_PAGE).toString(),
      });
    }
  };

  const handlePreviousPage = () => {
    if (cursor > 0) {
      const newCursor = Math.max(0, cursor - ITEMS_PER_PAGE);
      updateSearchParams({
        cursor: newCursor > 0 ? newCursor.toString() : undefined,
      });
    }
  };

  const columns = createKillsColumns(cursor);

  const table = useReactTable({
    data: data?.npcs || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  const hasPrev = cursor > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-xl bg-red-500/10 p-2.5 shadow-inner shadow-red-500/10">
                  <Skull className="size-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {t("kills.ranking.title")}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("kills.ranking.description")}
                  </p>
                </div>
              </div>
            </div>
            <KillsFilters
              filters={{
                ...filters,
                search: searchInput,
                minLvl: minLvlInput ? Number(minLvlInput) : undefined,
                maxLvl: maxLvlInput ? Number(maxLvlInput) : undefined,
              }}
              onWorldChange={handleWorldChange}
              onNpcTypeChange={handleNpcTypeChange}
              onSearchChange={handleSearchChange}
              onMinLvlChange={handleMinLvlChange}
              onMaxLvlChange={handleMaxLvlChange}
            />
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
            <ScrollArea className="relative flex-1 min-h-0 w-full">
              {isLoading ? (
                <div>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex h-14 items-center gap-4 border-b border-border px-4"
                    >
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : !data || data.npcs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                  <p className="text-muted-foreground">
                    {t("kills.ranking.noData")}
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
                        className="bg-background/30 border-b border-border h-14"
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
            </ScrollArea>
            <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {t("kills.ranking.total", {
                  count: data?.pagination?.total ?? 0,
                })}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={handlePreviousPage}
                      className={
                        !hasPrev
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
};
