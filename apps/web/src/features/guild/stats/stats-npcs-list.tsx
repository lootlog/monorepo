import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SearchInput } from "@/components/ui/search-input";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { StatsNpcTypeSelect } from "./components/stats-npc-type-select";
import { StatsRankingRowsSkeleton } from "./components/stats-ranking-rows-skeleton";

import { WorldSwitcher } from "@/components/common/world-switcher";
import { NpcTile } from "@/components/tiles/npc-tile";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";
import { LevelFilters } from "./components/level-filters";
import { NpcStatsFiltersMobile } from "./components/npc-stats-filters-mobile";

import { useStatsNpcsListModel } from "./use-stats-npcs-list-model";

export const StatsNpcsList: React.FC = () => {
  const {
    t,
    search,
    handleSearchChange,
    settings,
    handleWorldChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    data,
    paginatedData,
    hasActiveFilters,
    handleRowClick,
    cursor,
    guildId,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  } = useStatsNpcsListModel();
  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <PageHeader
            title={t("kills.npcsList.title")}
            icon={Swords}
            description={t("kills.npcsList.description")}
            actions={
              <div className="flex flex-col gap-3 min-[2200px]:flex-row min-[2200px]:items-center min-[2200px]:justify-between">
                <div className="flex items-center gap-2 md:hidden">
                  <SearchInput
                    placeholder={t("kills.npcsList.searchPlaceholder")}
                    value={search}
                    onChange={handleSearchChange}
                    wrapperClassName="flex-1"
                  />
                  <NpcStatsFiltersMobile
                    world={settings.world}
                    npcType={settings.npcType}
                    minLvl={settings.minLvl}
                    maxLvl={settings.maxLvl}
                    period={settings.period}
                    onWorldChange={handleWorldChange}
                    onNpcTypeChange={handleNpcTypeChange}
                    onMinLvlChange={handleMinLvlChange}
                    onMaxLvlChange={handleMaxLvlChange}
                    onPeriodChange={handlePeriodChange}
                  />
                </div>
                <div className="hidden md:flex w-full flex-wrap items-center gap-2 min-[2200px]:w-auto min-[2200px]:justify-end">
                  <SearchInput
                    placeholder={t("kills.npcsList.searchPlaceholder")}
                    value={search}
                    onChange={handleSearchChange}
                    wrapperClassName="w-[200px]"
                  />
                  <LevelFilters
                    minLvl={settings.minLvl}
                    maxLvl={settings.maxLvl}
                    onMinLvlChange={handleMinLvlChange}
                    onMaxLvlChange={handleMaxLvlChange}
                  />
                  <WorldSwitcher
                    value={settings.world}
                    onValueChange={handleWorldChange}
                    showAllOption
                    width="w-[160px]"
                  />
                  <KillStatsPeriodSelect
                    value={settings.period}
                    onValueChange={handlePeriodChange}
                  />
                  <StatsNpcTypeSelect
                    value={settings.npcType}
                    onValueChange={handleNpcTypeChange}
                  />
                </div>
              </div>
            }
          />

          <SectionCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="relative min-w-0 w-full overflow-x-auto">
              {isLoading ? (
                <StatsRankingRowsSkeleton />
              ) : !data || paginatedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                  <p className="text-muted-foreground">
                    {t(
                      hasActiveFilters
                        ? "kills.topNpcs.filteredNoData"
                        : "kills.topNpcs.noData",
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 p-3 md:hidden">
                    {paginatedData.map((npc, index) => (
                      <button
                        key={npc.npcId}
                        type="button"
                        className="min-w-0 border-b border-border p-3 last:border-b-0 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => handleRowClick(npc)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
                            {cursor + index + 1}
                          </div>
                          {npc.npcIcon && (
                            <div className="w-8 shrink-0">
                              <NpcTile
                                npc={{
                                  id: npc.npcId,
                                  name: npc.npcName,
                                  lvl: npc.npcLvl,
                                  icon: npc.npcIcon,
                                }}
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {npc.npcName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t(`npcType.${npc.npcType}`)} - {npc.npcLvl}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
                            <span className="text-xs text-muted-foreground">
                              x
                            </span>
                            <span className="text-sm font-semibold tabular-nums">
                              {npc.uniqueKills.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Table className="hidden border-b md:table">
                    <TableHeader className="bg-background sticky top-0 z-10">
                      <TableRow className="border-b-1! border-border">
                        <TableHead className="whitespace-nowrap w-12">
                          #
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          {t("kills.recentKills.npc")}
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          {t("kills.recentKills.type")}
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          {t("kills.npcKillers.killCount")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((npc, index) => (
                        <TableRow
                          key={npc.npcId}
                          className="bg-background border-b border-border h-14 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleRowClick(npc)}
                        >
                          <TableCell className="whitespace-nowrap">
                            <span className="text-muted-foreground font-medium">
                              {cursor + index + 1}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {npc.npcIcon && (
                                <div className="w-8 flex-shrink-0">
                                  <NpcTile
                                    npc={{
                                      id: npc.npcId,
                                      name: npc.npcName,
                                      lvl: npc.npcLvl,
                                      icon: npc.npcIcon,
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <TextLink
                                  className="text-sm leading-tight"
                                  onClick={(event) => event.stopPropagation()}
                                  render=<Link
                                    to="/$guildId/stats/npcs/$npcId"
                                    params={{
                                      guildId,
                                      npcId: String(npc.npcId),
                                    }}
                                  />
                                >
                                  {npc.npcName}
                                </TextLink>
                                <span className="text-xs text-muted-foreground">
                                  {npc.npcLvl}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="text-sm text-muted-foreground">
                              {t(`npcType.${npc.npcType}`)}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 w-fit">
                              <span className="text-xs text-muted-foreground">
                                x
                              </span>
                              <span className="text-sm font-semibold tabular-nums">
                                {npc.uniqueKills.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>

            <TablePaginationFooter
              totalLabel={t("kills.ranking.total", { count: total })}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
};
