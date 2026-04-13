import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "@tanstack/react-router";
import { Crown, Medal, Search, Trophy, Users } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Input } from "@lootlog/ui/components/input";
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
import { NpcTile } from "@/components/tiles/npc-tile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { getDiscordAvatarUrl } from "@lootlog/types";
import { cn } from "@lootlog/ui/lib/utils";
import { useKillsControllerGetNpcKillers } from "@/lib/api/generated/main/kills/kills";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { NpcKillersFiltersMobile } from "./components/npc-killers-filters-mobile";
import type { GuildMember } from "@/hooks/api/members/use-guild-member.tsx";
import { buildNpcKillersParams } from "./utils/build-stats-query-params";

const ITEMS_PER_PAGE = 20;

type MemberNameWithColorProps = {
  name: string;
  member?: GuildMember;
};

const MemberNameWithColor: React.FC<MemberNameWithColorProps> = ({
  name,
  member,
}) => {
  const adaptedMember = member
    ? {
        roles: member.roles.map((r) => ({
          position: r.position ?? 0,
          color: r.color,
        })),
      }
    : undefined;
  const color = useMemberColor(adaptedMember);
  return (
    <span className="font-medium" style={{ color }}>
      {name}
    </span>
  );
};

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 1:
      return <Trophy className="h-5 w-5 text-slate-400" />;
    case 2:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
};

export const NpcKillersPage: React.FC = () => {
  const { t } = useTranslation();
  const { npcId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/npcs/$npcId",
  });

  const [cursor, setCursor] = useState(0);
  const [search, setSearch] = useState("");
  const { settings, setWorld } = useStatsSettings("npc-killers");
  const { data, isLoading } = useKillsControllerGetNpcKillers(
    {
      guildId,
      npcId,
    },
    buildNpcKillersParams({
      world: settings.world ?? undefined,
    }),
  );
  const { data: guildMembers } = useGuildMembers(true);

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const membersMap = new Map(guildMembers?.map((m) => [m.userId, m]) ?? []);

  const killers = data?.killers ?? [];
  const filteredKillers = search
    ? killers.filter((k) =>
        k.memberName.toLowerCase().includes(search.toLowerCase()),
      )
    : killers;
  const total = filteredKillers.length;
  const paginatedKillers = filteredKillers.slice(
    cursor,
    cursor + ITEMS_PER_PAGE,
  );
  const hasNext = cursor + ITEMS_PER_PAGE < total;
  const hasPrev = cursor > 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCursor(0);
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-background/50">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
            <div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-14 items-center gap-4 border-b border-border px-4"
                >
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const npc = data?.npc;

  if (!npc) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground">
          {t("kills.npcKillers.notFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {npc.npcIcon && (
                  <NpcTile
                    npc={{
                      id: npc.npcId,
                      name: npc.npcName,
                      lvl: npc.npcLvl,
                      icon: npc.npcIcon,
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold leading-tight">
                    {npc.npcName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {npc.npcLvl}
                    {npc.npcProf} • {t(`npcType.${npc.npcType}`)}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>
                      {t("kills.npcKillers.uniqueGuildKills", {
                        count: npc.uniqueGuildKills,
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {t("kills.npcKillers.totalMembers", {
                        count: killers.length,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 md:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("kills.npcKillers.searchPlaceholder")}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <NpcKillersFiltersMobile
                  world={settings.world}
                  onWorldChange={handleWorldChange}
                />
              </div>

              <div className="hidden md:flex items-center gap-2">
                <WorldSwitcher
                  value={settings.world}
                  onValueChange={handleWorldChange}
                  showAllOption
                  width="w-[160px]"
                />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("kills.npcKillers.searchPlaceholder")}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
            <ScrollArea className="relative flex-1 min-h-0 w-full">
              {killers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                  <p className="text-muted-foreground">
                    {t("kills.npcKillers.noKillers")}
                  </p>
                </div>
              ) : (
                <Table className="border-b">
                  <TableHeader className="bg-background sticky top-0 z-10">
                    <TableRow className="border-b-1! border-border">
                      <TableHead className="w-16 text-center">
                        {t("kills.memberRanking.position")}
                      </TableHead>
                      <TableHead>{t("kills.npcKillers.member")}</TableHead>
                      <TableHead className="text-right">
                        {t("kills.npcKillers.killCount")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedKillers.map((killer, index) => {
                      const globalIndex = cursor + index;
                      return (
                        <TableRow
                          key={killer.memberId}
                          className={cn(
                            "bg-background/30 border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors",
                            globalIndex === 0 && "bg-yellow-500/5",
                          )}
                        >
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              {getRankIcon(globalIndex) ?? (
                                <span className="text-sm font-medium text-muted-foreground">
                                  {globalIndex + 1}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/$guildId/stats/members/$memberId"
                              params={{
                                guildId,
                                memberId: killer.memberId.toString(),
                              }}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={getDiscordAvatarUrl(
                                    killer.memberUserId,
                                    killer.memberAvatar,
                                    32,
                                  )}
                                />
                                <AvatarFallback className="text-xs">
                                  {killer.memberName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <MemberNameWithColor
                                name={killer.memberName}
                                member={membersMap.get(killer.memberUserId)}
                              />
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold tabular-nums">
                              {killer.participationCount.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>

            {killers.length > 0 && (
              <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("kills.ranking.total", { count: total })}
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
                          !hasNext
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};
