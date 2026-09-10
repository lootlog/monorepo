import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import { SearchInput } from "@/components/ui/search-input";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
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
import { Users } from "lucide-react";
import { MemberNameWithColor } from "./components/member-name-with-color";
import { StatsDetailLoading } from "./components/stats-detail-loading";
import { useNpcKillersPage } from "./use-npc-killers-page";

import { WorldSwitcher } from "@/components/common/world-switcher";
import { NpcTile } from "@/components/tiles/npc-tile";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "cn";
import { NpcKillersFiltersMobile } from "./components/npc-killers-filters-mobile";

import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";

export const NpcKillersPage: React.FC = () => {
  const {
    isLoading,
    data,
    t,
    killers,
    search,
    handleSearchChange,
    settings,
    handleWorldChange,
    handlePeriodChange,
    filteredKillers,
    hasActiveFilters,
    paginatedKillers,
    cursor,
    guildId,
    membersMap,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  } = useNpcKillersPage();
  if (isLoading) {
    return <StatsDetailLoading entity="npc" />;
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
          <PageHeader
            title={npc.npcName}
            icon={Users}
            description={
              <>
                {npc.npcLvl}
                {npc.npcProf} • {t(`npcType.${npc.npcType}`)}
              </>
            }
            actions={
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
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>
                        {t("kills.npcKillers.uniqueGuildKills", {
                          count: npc.uniqueGuildKills,
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        {t("kills.npcKillers.totalMembers", {
                          count: killers.length,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:hidden">
                  <SearchInput
                    placeholder={t("kills.npcKillers.searchPlaceholder")}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    wrapperClassName="flex-1"
                  />
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
                  <SearchInput
                    placeholder={t("kills.npcKillers.searchPlaceholder")}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    wrapperClassName="w-[200px]"
                  />
                </div>
              </div>
            }
          />

          <SectionCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="relative min-w-0 w-full overflow-x-auto">
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
                            "min-w-0 border-b border-border p-3 last:border-b-0 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            globalIndex === 0 &&
                              "border-yellow-500/30 bg-yellow-500/5",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
                              <PodiumRankIcon
                                rank={globalIndex + 1}
                                className="size-5"
                                fallback={<span>{globalIndex + 1}</span>}
                              />
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
                                <PodiumRankIcon
                                  rank={globalIndex + 1}
                                  className="size-5"
                                  fallback={
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {globalIndex + 1}
                                    </span>
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <TextLink
                                className="flex items-center gap-3 text-sm"
                                render=<Link
                                  to="/$guildId/stats/members/$memberId"
                                  params={{
                                    guildId,
                                    memberId: killer.memberId.toString(),
                                  }}
                                />
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
                                {killer.memberName}
                              </TextLink>
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
