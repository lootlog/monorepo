import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Search, Crown, Trophy, Medal } from "lucide-react";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Input } from "@lootlog/ui/components/input";
import { Spinner } from "@lootlog/ui/components/spinner";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useGuildKillStats, type NpcType } from "./hooks/use-guild-kill-stats";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { LevelFilters } from "./components/level-filters";
import { StatsRankingFiltersMobile } from "./components/stats-ranking-filters-mobile";

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

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Trophy className="h-4 w-4 text-slate-400" />;
    case 3:
      return <Medal className="h-4 w-4 text-amber-600" />;
    default:
      return null;
  }
};

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
  } = useStatsSettings("ranking");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: worlds } = useWorlds();

  const { data, isLoading } = useGuildKillStats({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
  });

  const handleWorldChange = (value: string) => {
    setWorld(value === "ALL" ? null : value);
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

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    <div className="h-full flex flex-col">
      <div className="p-4 pb-4 bg-background border-b">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {t("kills.fullRanking.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("kills.fullRanking.description")}
            </p>
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
              onWorldChange={handleWorldChange}
              onMinLvlChange={setMinLvl}
              onMaxLvlChange={setMaxLvl}
            />
          </div>

          <div className="hidden md:flex items-center gap-2">
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
              onMinLvlChange={setMinLvl}
              onMaxLvlChange={setMaxLvl}
            />
            <Select
              value={settings.world ?? "ALL"}
              onValueChange={handleWorldChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("kills.home.filters.world")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("kills.home.filters.allWorlds")}
                </SelectItem>
                {worlds?.map((world) => (
                  <SelectItem key={world} value={world}>
                    {world.charAt(0).toUpperCase() + world.slice(1)}
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
            <p className="text-muted-foreground">
              {t("kills.memberRanking.noData")}
            </p>
          </div>
        ) : (
          <Table className="border-b">
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
                const icon = getRankIcon(rank);
                return (
                  <TableRow
                    key={member.memberId}
                    className="bg-background/30 border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(member.memberId)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center justify-center w-8">
                        {icon ?? (
                          <span className="text-sm font-medium text-muted-foreground">
                            {rank}
                          </span>
                        )}
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
                        <span className="font-medium">{member.memberName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-center font-semibold tabular-nums">
                        {member.totalParticipations.toLocaleString()}
                      </div>
                    </TableCell>
                    {activeNpcTypes.map((type) => (
                      <TableCell key={type} className="whitespace-nowrap">
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
