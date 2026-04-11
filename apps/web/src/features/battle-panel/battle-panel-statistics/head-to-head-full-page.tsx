import { useState } from "react";
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
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Separator } from "@lootlog/ui/components/separator";
import { useHeadToHead } from "@/hooks/api/battle-log/use-head-to-head";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Award, ArrowRight, Filter, Swords } from "lucide-react";
import type { Warrior } from "@/hooks/api/battle-log/use-search-warriors";
import {
  CharacterSelector,
  PeriodSelector,
  LevelRangeFilter,
  WarriorSearchFilter,
} from "@/components/filters";
import { headToHeadColumns } from "./components/head-to-head-columns";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { AnimatePresence, motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { useQueryStates } from "nuqs";
import {
  battlePanelHeadToHeadSearchParsers,
  getSelectedWarriorsFromSearch,
} from "@/features/battle-panel/battle-panel-statistics-search";
import { useTranslation } from "react-i18next";

const H2H_FILTERS_OPEN_KEY = "h2h-filters-open";

type SortBy = "wins" | "losses" | "totalBattles" | "winRate" | "lastBattleDate";

export function HeadToHeadFullPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    H2H_FILTERS_OPEN_KEY,
    true,
  );
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [queryState, setQueryState] = useQueryStates(
    battlePanelHeadToHeadSearchParsers,
  );
  const currentCharacterId = queryState.characterId ?? undefined;
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

  const { data, isLoading } = useHeadToHead({
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
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("battlePanel.filters.character")}
        </Label>
        <CharacterSelector
          characterId={currentCharacterId}
          onCharacterChange={handleCharacterChange}
          allowAllCharacters
          className="w-full h-10"
        />
      </div>

      <Separator />

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

      <div className="flex items-center gap-2">
        <Award className="h-4 w-4" />
        <Checkbox
          id="h2h-ph-checkbox"
          checked={ph === true}
          onCheckedChange={handlePhChange}
        />
        <Label htmlFor="h2h-ph-checkbox" className="cursor-pointer text-sm">
          {t("battlePanel.filters.honorPoints")}
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Swords className="h-4 w-4" />
        <Checkbox
          id="h2h-matchmaking-checkbox"
          checked={matchmaking === true}
          onCheckedChange={handleMatchmakingChange}
        />
        <Label
          htmlFor="h2h-matchmaking-checkbox"
          className="cursor-pointer text-sm"
        >
          {t("battlePanel.filters.matchmaking")}
        </Label>
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
              <DrawerTitle>{t("battlePanel.filters.title")}</DrawerTitle>
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
              <WarriorSearchFilter
                selectedWarriors={selectedWarriors}
                onWarriorToggle={handleWarriorToggle}
                className="flex-1"
              />
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
