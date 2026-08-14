import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Search, Swords } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Card } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { NpcTile } from "@/components/tiles/npc-tile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useDebounce } from "@/hooks/use-debounce";
import {
  getKillsControllerGetGuildTopNpcsQueryKey,
  useKillsControllerGetGuildTopNpcs,
} from "@lootlog/api-client/react-query/main/kills";
import type { GuildTopNpcsResponseDtoOutputTopNpcsItem } from "@lootlog/api-client/models/main/guild-top-npcs-response-dto-output-top-npcs-item";
import type { NpcType } from "@lootlog/api-client/models/main/npc-type";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { LevelFilters } from "./components/level-filters";
import { NpcStatsFiltersMobile } from "./components/npc-stats-filters-mobile";
import { buildGuildTopNpcsParams } from "./utils/build-stats-query-params";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

const ITEMS_PER_PAGE = 20;

export const StatsNpcsList: React.FC = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({
    from: "/_authenticated/$guildId/stats/npcs/",
  });
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(0);
  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setNpcType,
    setPeriod,
  } = useStatsSettings("npcs-list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const topNpcsParams = buildGuildTopNpcsParams({
    limit: 100,
    npcType: settings.npcType === "ALL" ? undefined : settings.npcType,
    world: settings.world ?? undefined,
    search: debouncedSearch || undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetGuildTopNpcs(
    { guildId },
    topNpcsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildTopNpcsQueryKey(
          { guildId },
          topNpcsParams,
        ),
      },
    },
  );

  const topNpcs = data?.topNpcs ?? [];
  const hasActiveFilters =
    Boolean(settings.world) ||
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all" ||
    settings.npcType !== "ALL" ||
    Boolean(debouncedSearch);
  const total = topNpcs.length;
  const paginatedData = topNpcs.slice(cursor, cursor + ITEMS_PER_PAGE);
  const hasNext = cursor + ITEMS_PER_PAGE < total;
  const hasPrev = cursor > 0;

  const handleRowClick = (npc: GuildTopNpcsResponseDtoOutputTopNpcsItem) => {
    navigate({
      to: "/$guildId/stats/npcs/$npcId",
      params: { guildId, npcId: String(npc.npcId) },
    });
  };

  const handleNextPage = () => {
    if (hasNext) {
      setCursor(cursor + ITEMS_PER_PAGE);
    }
  };

  const handlePreviousPage = () => {
    if (hasPrev) {
      setCursor(Math.max(0, cursor - ITEMS_PER_PAGE));
    }
  };

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    setNpcType(value as NpcType | "ALL");
    setCursor(0);
  };

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const handleMinLvlChange = (value: string) => {
    setMinLvl(value);
    setCursor(0);
  };

  const handleMaxLvlChange = (value: string) => {
    setMaxLvl(value);
    setCursor(0);
  };

  const handlePeriodChange = (value: KillStatsPeriod) => {
    setPeriod(value);
    setCursor(0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCursor(0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex flex-col gap-3 min-[2200px]:flex-row min-[2200px]:items-center min-[2200px]:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <Swords className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {t("kills.npcsList.title")}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("kills.npcsList.description")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("kills.npcsList.searchPlaceholder")}
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-8 w-full"
                  />
                </div>
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
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("kills.npcsList.searchPlaceholder")}
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-8 w-[200px]"
                  />
                </div>
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
                <Select
                  value={settings.npcType ?? "ALL"}
                  onValueChange={handleNpcTypeChange}
                  items={[
                    { value: "ALL", label: <>{t("kills.filters.allTypes")}</> },
                    ...TRACKABLE_NPC_TYPES.map((type) => ({
                      value: type,
                      label: <>{t(`npcType.${type}`)}</>,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {t("kills.filters.allTypes")}
                    </SelectItem>
                    {TRACKABLE_NPC_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`npcType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card p-0  overflow-hidden gap-0">
            <ScrollArea className="relative flex-1 min-h-0 w-full">
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
                        className="min-w-0 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                                <span className="text-sm font-medium leading-tight">
                                  {npc.npcName}
                                </span>
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
            </ScrollArea>

            <TablePaginationFooter
              totalLabel={t("kills.ranking.total", { count: total })}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
