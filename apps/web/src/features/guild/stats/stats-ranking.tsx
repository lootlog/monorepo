import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Card } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import {
  getKillsControllerGetGuildKillStatsQueryKey,
  useKillsControllerGetGuildKillStats,
} from "@lootlog/api-client/react-query/main/kills";
import type { NpcType } from "@lootlog/api-client/models/main/npc-type";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { LevelFilters } from "./components/level-filters";
import { StatsRankingFiltersMobile } from "./components/stats-ranking-filters-mobile";
import { buildGuildKillStatsParams } from "./utils/build-stats-query-params";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

const ITEMS_PER_PAGE = 20;

const NPC_TYPE_ORDER: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

export const StatsRanking: React.FC = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({
    from: "/_authenticated/$guildId/stats/ranking",
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
    setPeriod,
  } = useStatsSettings("ranking");
  const [searchQuery, setSearchQuery] = useState("");
  const killStatsParams = buildGuildKillStatsParams({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetGuildKillStats(
    { guildId },
    killStatsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildKillStatsQueryKey(
          { guildId },
          killStatsParams,
        ),
      },
    },
  );

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const value = e.target.value;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCursor(0);
    }, 500);
  };

  const memberRanking = data?.memberRanking ?? [];
  const filteredRanking = searchQuery
    ? memberRanking.filter((member) =>
        member.memberName?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : memberRanking;
  const hasActiveFilters =
    Boolean(settings.world) ||
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all" ||
    Boolean(searchQuery);
  const total = filteredRanking.length;
  const paginatedData = filteredRanking.slice(cursor, cursor + ITEMS_PER_PAGE);
  const hasNext = cursor + ITEMS_PER_PAGE < total;
  const hasPrev = cursor > 0;

  const activeNpcTypes = NPC_TYPE_ORDER.filter((type) =>
    memberRanking.some(
      (member) => (member.participationsByType[type] ?? 0) > 0,
    ),
  );

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

  const handleRowClick = (memberId: number) => {
    navigate({
      to: "/$guildId/stats/members/$memberId",
      params: {
        guildId,
        memberId: memberId.toString(),
      },
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex flex-col gap-3 min-[2200px]:flex-row min-[2200px]:items-center min-[2200px]:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <Users className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">
                    {t("kills.fullRanking.title")}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("kills.fullRanking.description")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("kills.fullRanking.searchPlaceholder")}
                    onChange={handleSearchChange}
                    className="pl-8 w-full"
                  />
                </div>
                <StatsRankingFiltersMobile
                  world={settings.world}
                  minLvl={settings.minLvl}
                  maxLvl={settings.maxLvl}
                  period={settings.period}
                  onWorldChange={handleWorldChange}
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
                    placeholder={t("kills.fullRanking.searchPlaceholder")}
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
                <KillStatsPeriodSelect
                  value={settings.period}
                  onValueChange={handlePeriodChange}
                />
                <WorldSwitcher
                  value={settings.world}
                  onValueChange={handleWorldChange}
                  showAllOption
                  width="w-[160px]"
                />
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
                        ? "kills.memberRanking.filteredNoData"
                        : "kills.memberRanking.noData",
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 p-3 md:hidden">
                    {paginatedData.map((member, index) => {
                      const rank = cursor + index + 1;
                      return (
                        <button
                          key={member.memberId}
                          type="button"
                          onClick={() => handleRowClick(member.memberId)}
                          className="min-w-0 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
                              <PodiumRankIcon rank={rank} fallback={rank} />
                            </div>
                            <Avatar className="size-8 shrink-0">
                              <AvatarImage
                                src={getDiscordAvatarUrl(
                                  member.memberUserId,
                                  member.memberAvatar,
                                  32,
                                )}
                              />
                              <AvatarFallback className="text-xs">
                                {member.memberName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">
                                {member.memberName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("kills.memberRanking.totalKills")}:{" "}
                                <span className="font-medium tabular-nums text-foreground">
                                  {member.totalParticipations.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {activeNpcTypes.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {activeNpcTypes.map((type) => (
                                <span
                                  key={type}
                                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                                >
                                  <span className="truncate">
                                    {t(`npcType.${type}`)}
                                  </span>
                                  <span className="font-medium tabular-nums text-foreground">
                                    {(
                                      member.participationsByType[type] ?? 0
                                    ).toLocaleString()}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <Table className="hidden border-b md:table">
                    <TableHeader className="bg-background sticky top-0 z-10">
                      <TableRow className="border-b-1! border-border">
                        <TableHead className="whitespace-nowrap w-12 text-center">
                          #
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          {t("kills.memberRanking.member")}
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          {t("kills.memberRanking.totalKills")}
                        </TableHead>
                        {activeNpcTypes.map((type) => (
                          <TableHead
                            key={type}
                            className="whitespace-nowrap text-center"
                          >
                            {t(`npcType.${type}`)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((member, index) => {
                        const rank = cursor + index + 1;
                        return (
                          <TableRow
                            key={member.memberId}
                            className="bg-background border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleRowClick(member.memberId)}
                          >
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center justify-center w-8">
                                <PodiumRankIcon
                                  rank={rank}
                                  fallback={
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {rank}
                                    </span>
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={getDiscordAvatarUrl(
                                      member.memberUserId,
                                      member.memberAvatar,
                                      32,
                                    )}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {member.memberName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {member.memberName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="text-center font-semibold tabular-nums">
                                {member.totalParticipations.toLocaleString()}
                              </div>
                            </TableCell>
                            {activeNpcTypes.map((type) => (
                              <TableCell
                                key={type}
                                className="whitespace-nowrap"
                              >
                                <div className="text-center tabular-nums">
                                  {(
                                    member.participationsByType[type] ?? 0
                                  ).toLocaleString()}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
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
