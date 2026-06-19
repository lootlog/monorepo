import { useState } from "react";
import type { Period } from "@/store/battle-filters.store";
import { useBattlesControllerGetPlayerVsPlayerBattles } from "@/lib/api/generated/battlelog/battles/battles";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { PlayerTile } from "@/components/battle";

import { useParams, useNavigate } from "@tanstack/react-router";
import { playerVsPlayerColumns } from "./components/player-vs-player-columns";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useLocalStorage } from "usehooks-ts";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Filter, SearchX, Swords } from "lucide-react";
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
import {
  battlePanelPlayerVsPlayerSearchParsers,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { useTranslation } from "react-i18next";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import type { KeyboardEvent } from "react";

const PVP_FILTERS_OPEN_KEY = "pvp-filters-open";

export function PlayerVsPlayerFullPage() {
  const { t } = useTranslation();
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
  const currentCharacterId =
    normalizeBattlePanelCharacterId(queryState.characterId) ?? params.myId;
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

  const { data, isLoading, isError, error } =
    useBattlesControllerGetPlayerVsPlayerBattles({
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
    handleBattleClick(battleId);
  };

  const opponentName =
    data?.battles[0]?.opponentWarrior.name ||
    t("battlePanel.statistics.playerVsPlayer.opponentFallback");
  const myCharacter = data?.battles[0]?.userWarrior;

  const table = useReactTable({
    data: data?.battles || [],
    columns: playerVsPlayerColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const filtersContent = (
    <div className="p-4 space-y-4">
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
                <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                  <Swords className="size-4 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-tight">
                  {myCharacter?.name ||
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
                    title={t(
                      "battlePanel.statistics.playerVsPlayer.emptyTitle",
                    )}
                    description={t(
                      "battlePanel.statistics.playerVsPlayer.emptyDescription",
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
                        onClick: () => handleBattleClick(row.original.battleId),
                        onKeyDown: (event) =>
                          handleBattleRowKeyDown(event, row.original.battleId),
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
