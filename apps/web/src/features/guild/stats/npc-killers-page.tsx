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
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { NpcTile } from "@/components/tiles/npc-tile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "@lootlog/ui/lib/utils";
import {
  getKillsControllerGetNpcKillersQueryKey,
  useKillsControllerGetNpcKillers,
} from "@lootlog/api-client/react-query/main/kills";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { NpcKillersFiltersMobile } from "./components/npc-killers-filters-mobile";
import { buildNpcKillersParams } from "./utils/build-stats-query-params";
import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  useMembersControllerGetGuildMemberReferences,
} from "@lootlog/api-client/react-query/main/members";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@lootlog/api-client/models/main/member-reference-response-dto-output";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

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
        roles: [{ position: 0, color: member.color }],
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
  const { settings, setWorld, setPeriod } = useStatsSettings("npc-killers");
  const npcKillersParams = buildNpcKillersParams({
    world: settings.world ?? undefined,
    period: settings.period,
  });
  const { data, isLoading } = useKillsControllerGetNpcKillers(
    {
      guildId,
      npcId,
    },
    npcKillersParams,
    {
      query: {
        enabled: Boolean(guildId && npcId),
        queryKey: getKillsControllerGetNpcKillersQueryKey(
          {
            guildId,
            npcId,
          },
          npcKillersParams,
        ),
      },
    },
  );
  const { data: guildMembers } = useMembersControllerGetGuildMemberReferences(
    { guildId },
    {
      includeInactive: true,
    },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getMembersControllerGetGuildMemberReferencesQueryKey(
          { guildId },
          { includeInactive: true },
        ),
      },
    },
  );

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const handlePeriodChange = (value: KillStatsPeriod) => {
    setPeriod(value);
    setCursor(0);
  };

  const membersMap = new Map(guildMembers?.map((m) => [m.userId, m]) ?? []);

  const killers = data?.killers ?? [];
  const filteredKillers = search
    ? killers.filter((k) =>
        k.memberName.toLowerCase().includes(search.toLowerCase()),
      )
    : killers;
  const hasActiveFilters =
    Boolean(settings.world) || settings.period !== "all" || Boolean(search);
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
      <div className="flex flex-col h-full min-h-0 bg-background">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </Card>
          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card p-0  overflow-hidden gap-0">
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
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card p-4">
            <div className="flex flex-col gap-3 min-[2200px]:flex-row min-[2200px]:items-center min-[2200px]:justify-between">
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
                  period={settings.period}
                  onWorldChange={handleWorldChange}
                  onPeriodChange={handlePeriodChange}
                />
              </div>

              <div className="hidden md:flex w-full flex-wrap items-center gap-2 min-[2200px]:w-auto min-[2200px]:justify-end">
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

          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card p-0  overflow-hidden gap-0">
            <ScrollArea className="relative flex-1 min-h-0 w-full">
              {filteredKillers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                  <p className="text-muted-foreground">
                    {t(
                      hasActiveFilters
                        ? "kills.npcKillers.filteredNoData"
                        : "kills.npcKillers.noKillers",
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 p-3 md:hidden">
                    {paginatedKillers.map((killer, index) => {
                      const globalIndex = cursor + index;
                      return (
                        <Link
                          key={killer.memberId}
                          to="/$guildId/stats/members/$memberId"
                          params={{
                            guildId,
                            memberId: killer.memberId.toString(),
                          }}
                          className={cn(
                            "min-w-0 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            globalIndex === 0 &&
                              "border-yellow-500/30 bg-yellow-500/5",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
                              {getRankIcon(globalIndex) ?? (
                                <span>{globalIndex + 1}</span>
                              )}
                            </div>
                            <Avatar className="size-8 shrink-0">
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
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">
                                <MemberNameWithColor
                                  name={killer.memberName}
                                  member={membersMap.get(killer.memberUserId)}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("kills.npcKillers.killCount")}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-muted/50 px-2 py-1 text-sm font-semibold tabular-nums">
                              {killer.participationCount.toLocaleString()}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <Table className="hidden border-b md:table">
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
                              "bg-background border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors",
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
