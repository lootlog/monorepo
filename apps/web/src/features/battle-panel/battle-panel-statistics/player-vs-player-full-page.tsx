import { useState } from "react";
import type { Period } from "@/store/battle-filters.store";
import { usePlayerVsPlayer } from "@/hooks/api/battle-log/use-player-vs-player";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
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
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PlayerTile } from "@/components/battle";

import { useParams, useNavigate } from "@tanstack/react-router";
import { playerVsPlayerColumns } from "./components/player-vs-player-columns";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, ArrowRight } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Separator } from "@lootlog/ui/components/separator";
import { PeriodSelector, LevelRangeFilter } from "@/components/filters";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useQueryStates } from "nuqs";
import { battlePanelPlayerVsPlayerSearchParsers } from "@/features/battle-panel/battle-panel-statistics-search";

const PVP_FILTERS_OPEN_KEY = "pvp-filters-open";

export function PlayerVsPlayerFullPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    PVP_FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const params = useParams({ strict: false }) as {
    myId?: string;
    opponentId?: string;
  };

  const opponentId = params.opponentId ?? params.myId;
  const [queryState, setQueryState] = useQueryStates(
    battlePanelPlayerVsPlayerSearchParsers,
  );
  const currentCharacterId = queryState.characterId ?? params.myId;
  const period = queryState.period ?? "30d";
  const minLevel = queryState.minLevel;
  const maxLevel = queryState.maxLevel;
  const cursor = queryState.cursor ?? undefined;

  const handlePeriodChange = (newPeriod: Period) => {
    void setQueryState({
      period: newPeriod,
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

  const { data, isLoading } = usePlayerVsPlayer({
    cursor,
    size: 20,
    characterId: currentCharacterId ?? params.myId,
    period,
    opponentId: opponentId ?? "",
    minLevel,
    maxLevel,
    includeTotal: true,
  });

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

  const handleBattleClick = (battleId: string) => {
    navigate({
      to: "/@me/battle-panel/battles/$battleId",
      params: { battleId },
    });
  };

  const opponentName = data?.battles[0]?.opponentWarrior.name || "Przeciwnik";
  const myCharacter = data?.battles[0]?.userWarrior;

  const table = useReactTable({
    data: data?.battles || [],
    columns: playerVsPlayerColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const filtersContent = (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Okres</Label>
        <PeriodSelector
          value={period}
          onValueChange={handlePeriodChange}
          width="w-full"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Zakres poziomów</Label>
        <div className="flex items-center gap-2">
          <LevelRangeFilter
            minLevel={minLevel}
            maxLevel={maxLevel}
            onMinLevelChange={handleMinLevelChange}
            onMaxLevelChange={handleMaxLevelChange}
            inputClassName="w-full"
            containerClassName="flex-1"
            separator=<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          />
        </div>
      </div>
    </div>
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
              <DrawerTitle>Filtry</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">{filtersContent}</ScrollArea>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="w-full flex flex-col h-full overflow-hidden bg-background/50">
        <div className="px-3 pt-3 pb-0">
          <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {myCharacter && (
                <PlayerTile
                  player={{
                    name: myCharacter.name,
                    lvl: myCharacter.lvl,
                    prof: myCharacter.prof,
                    icon: myCharacter.icon,
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-tight">
                  {myCharacter?.name || "Twoja postać"} vs {opponentName}
                </h2>
                {myCharacter && (
                  <p className="text-xs text-muted-foreground">
                    Poziom {myCharacter.lvl} • Historia walk rankingowych
                  </p>
                )}
              </div>
              {!isMobile && (
                <Button
                  onClick={() => setIsFiltersOpen((prev) => !prev)}
                  variant={isFiltersOpen ? "default" : "outline"}
                  size="icon"
                  className="relative shrink-0"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-3">
            <Card className="flex-1 flex flex-col min-h-0 border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0">
              <ScrollArea className="flex-1 min-h-0">
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
                ) : !data || data.battles.length === 0 ? (
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
                          className="bg-background/30 cursor-pointer hover:bg-muted/50 border-b border-border"
                          onClick={() =>
                            handleBattleClick(row.original.battleId)
                          }
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
            </Card>

            <div className="sticky bottom-0 pt-3">
              <Card className="flex items-center justify-center px-4 py-3 bg-card/60 backdrop-blur-sm border-border relative">
                <div className="absolute left-4 text-sm text-muted-foreground max-w-[30%]">
                  {data?.pagination?.total && (
                    <span>Łącznie: {data.pagination.total}</span>
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
              </Card>
            </div>
          </div>

          {!isMobile && (
            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden h-full"
                >
                  <div className="w-[320px] h-full flex flex-col shrink-0 bg-background/50 py-3 pr-3">
                    <Card className="flex-1 flex flex-col min-h-0 bg-filters-sidebar border-border backdrop-blur-sm p-0">
                      <ScrollArea className="h-full">
                        {filtersContent}
                      </ScrollArea>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {isMobile && (
        <Button
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
