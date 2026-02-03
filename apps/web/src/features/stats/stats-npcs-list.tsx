import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Input } from "@lootlog/ui/components/input";
import { Spinner } from "@lootlog/ui/components/spinner";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { NpcTile } from "@/components/tiles/npc-tile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useDebounce } from "@/hooks/use-debounce";
import { useGuildTopNpcs, type TopNpc } from "./hooks/use-guild-top-npcs";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { LevelFilters } from "./components/level-filters";
import { StatsNpcsListFiltersMobile } from "./components/stats-npcs-list-filters-mobile";
import type { NpcType } from "./hooks/use-guild-kill-stats";

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
  } = useStatsSettings("npcs-list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useGuildTopNpcs({
    limit: 100,
    npcType: settings.npcType === "ALL" ? undefined : settings.npcType,
    world: settings.world ?? undefined,
    search: debouncedSearch || undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
  });

  const topNpcs = data?.topNpcs ?? [];
  const total = topNpcs.length;
  const paginatedData = topNpcs.slice(cursor, cursor + ITEMS_PER_PAGE);
  const hasNext = cursor + ITEMS_PER_PAGE < total;
  const hasPrev = cursor > 0;

  const handleRowClick = (npc: TopNpc) => {
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

  const handleNpcTypeChange = (value: string) => {
    setNpcType(value as NpcType | "ALL");
    setCursor(0);
  };

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCursor(0);
  };

  // Reset cursor when debounced filter values change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCursor(0);
  }, [debouncedMinLvl, debouncedMaxLvl]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-4 bg-background border-b">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold">{t("kills.npcsList.title")}</h1>
            <p className="text-muted-foreground">
              {t("kills.npcsList.description")}
            </p>
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
            <StatsNpcsListFiltersMobile
              world={settings.world}
              npcType={settings.npcType}
              minLvl={settings.minLvl}
              maxLvl={settings.maxLvl}
              onWorldChange={handleWorldChange}
              onNpcTypeChange={handleNpcTypeChange}
              onMinLvlChange={setMinLvl}
              onMaxLvlChange={setMaxLvl}
            />
          </div>

          <div className="hidden md:flex items-center gap-2">
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
              onMinLvlChange={setMinLvl}
              onMaxLvlChange={setMaxLvl}
            />
            <WorldSwitcher
              value={settings.world}
              onValueChange={handleWorldChange}
              showAllOption
              width="w-[160px]"
            />
            <Select
              value={settings.npcType ?? "ALL"}
              onValueChange={handleNpcTypeChange}
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
      </div>

      <ScrollArea className="relative flex-1 min-h-0 w-full">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">
              {t("kills.ranking.loading")}
            </p>
          </div>
        ) : !data || paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
            <p className="text-muted-foreground">{t("kills.topNpcs.noData")}</p>
          </div>
        ) : (
          <Table className="border-b">
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b-1! border-border">
                <TableHead className="whitespace-nowrap w-12">#</TableHead>
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
                  className="bg-background/30 border-b border-border h-14 hover:bg-muted/30 transition-colors cursor-pointer"
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
                          {npc.npcProf}
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
                      <span className="text-xs text-muted-foreground">x</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {npc.uniqueKills.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      <div className="h-14 shrink-0 bg-background border-t py-4 flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {t("kills.ranking.total", { count: total })}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
                className={
                  !hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={handleNextPage}
                className={
                  !hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
